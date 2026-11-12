import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getMongoStatus } from "../../database/mongo.js";
import { ImageQueryCache } from "../../models/ImageQueryCache.js";
import { AppError } from "../../shared/errors.js";

export const SYSTEM_PROMPT =
  "You help build flashcards for Japanese learners. You get a Japanese word, its English meanings, optionally an example sentence, and optionally the learner's own description of the picture they want. Write 3 short English image-search phrases (max 6 words each) for a stock-photo library (Openverse / Wikimedia Commons). Each phrase must describe ONE concrete, visible scene or object that would help a learner remember the word's meaning: show people doing things or real objects, never abstract notions. Prefer everyday photographable scenes. Never use brand names, text inside the picture, famous people, nudity or violence. If the word is a particle, a grammar pattern, or cannot be pictured at all, set picturable=false and still give your 3 best-effort phrases. If a description is given, follow it (translate it into English search phrases). Answer only through the tool.";

export const TOOL_NAME = "suggest_queries";

export type SuggestQueryInput = {
  word: string;
  reading?: string;
  meanings: string[];
  example?: string;
  description?: string;
};

export type QueryWriterResult = {
  queries: string[];
  picturable: boolean;
  source: "ai" | "cache";
};

export type QueryWriterClient = {
  messages: {
    create(
      params: any,
      options?: { signal?: AbortSignal },
    ): Promise<{
      content: Array<{ type: string; name?: string; input?: unknown }>;
    }>;
  };
};

export type QueryWriterOptions = {
  apiKey?: string;
  client?: QueryWriterClient;
  now?: () => number;
  model?: string;
};

export interface QueryWriter {
  isAvailable(): boolean;
  writeQueries(input: SuggestQueryInput, signal?: AbortSignal): Promise<QueryWriterResult>;
}

export function normalizeQueryKey(word: string, meanings: string[], description?: string): string {
  const normWord = word.normalize("NFC").trim().toLowerCase();
  const normMeanings = meanings
    .map((m) => m.normalize("NFC").trim().toLowerCase())
    .join(",");
  const normDesc = (description ?? "").normalize("NFC").trim().toLowerCase();
  return crypto.createHash("sha1").update(`${normWord}|${normMeanings}|${normDesc}`).digest("hex");
}

export function sanitizeQueryPhrase(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.normalize("NFC").replace(/["'“”‘’`\r\n]/g, " ");
  s = s.replace(/\s+/g, " ").trim().toLowerCase();
  if (!s) return null;
  if (/\d/.test(s)) return null;
  if (/https?:\/\/|\bwww\./i.test(s)) return null;
  s = s.slice(0, 60).trim();
  return s || null;
}

function buildUserMessage(input: SuggestQueryInput): string {
  const parts: string[] = [`Word: ${input.word}`];
  if (input.reading) parts.push(`Reading: ${input.reading}`);
  parts.push(`Meanings: ${input.meanings.join(", ")}`);
  if (input.example) parts.push(`Example: ${input.example}`);
  if (input.description) parts.push(`Learner description: ${input.description}`);
  return parts.join("\n");
}

const toolOutputSchema = z.object({
  queries: z.array(z.string()),
  picturable: z.boolean(),
});

export function createQueryWriter(opts: QueryWriterOptions = {}): QueryWriter {
  let client = opts.client;
  if (!client && opts.apiKey) {
    client = new Anthropic({ apiKey: opts.apiKey });
  }

  const cache = new Map<string, { queries: string[]; picturable: boolean }>();
  const inflight = new Map<string, Promise<{ queries: string[]; picturable: boolean }>>();

  return {
    isAvailable: () => Boolean(client),

    async writeQueries(input: SuggestQueryInput, signal?: AbortSignal): Promise<QueryWriterResult> {
      if (!client) {
        throw new AppError("AI_UNAVAILABLE", "AI visual search is not configured", 501);
      }

      const key = normalizeQueryKey(input.word, input.meanings, input.description);

      // 1. Check in-memory cache
      const mem = cache.get(key);
      if (mem) {
        return { queries: mem.queries, picturable: mem.picturable, source: "cache" };
      }

      // 2. Check Mongo cache if connected
      if (getMongoStatus().connected) {
        try {
          const doc = await ImageQueryCache.findOne({ key }).lean();
          if (doc) {
            cache.set(key, { queries: doc.queries, picturable: doc.picturable });
            return { queries: doc.queries, picturable: doc.picturable, source: "cache" };
          }
        } catch {
          // ignore Mongo read failure
        }
      }

      // 3. Dedupe concurrent identical requests (single-flight)
      const existing = inflight.get(key);
      if (existing) {
        const r = await existing;
        return { queries: r.queries, picturable: r.picturable, source: "ai" };
      }

      const runCall = async (): Promise<{ queries: string[]; picturable: boolean }> => {
        let response;
        try {
          const timeoutSignal = AbortSignal.timeout(15_000);
          const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
          response = await client!.messages.create(
            {
              model: opts.model ?? "claude-haiku-5-5",
              max_tokens: 300,
              temperature: 0.2,
              system: SYSTEM_PROMPT,
              messages: [{ role: "user", content: buildUserMessage(input) }],
              tools: [
                {
                  name: TOOL_NAME,
                  description: "Suggest concrete image search phrases for a Japanese word",
                  input_schema: {
                    type: "object",
                    properties: {
                      queries: {
                        type: "array",
                        items: { type: "string" },
                        description: "3 short English image-search phrases (max 6 words each)",
                      },
                      picturable: {
                        type: "boolean",
                        description: "Whether the word can be pictured with a concrete scene or object",
                      },
                    },
                    required: ["queries", "picturable"],
                  },
                },
              ],
              tool_choice: { type: "tool", name: TOOL_NAME },
            },
            { signal: combinedSignal },
          );
        } catch {
          throw new AppError("AI_FAILED", "Failed to generate visual search phrases. Please try again later.", 502);
        }

        const toolBlock = response.content?.find(
          (b) => b.type === "tool_use" && b.name === TOOL_NAME,
        );
        if (!toolBlock || typeof toolBlock.input !== "object" || !toolBlock.input) {
          throw new AppError("AI_FAILED", "Failed to generate visual search phrases", 502);
        }

        const parsed = toolOutputSchema.safeParse(toolBlock.input);
        if (!parsed.success) {
          throw new AppError("AI_FAILED", "Failed to generate visual search phrases", 502);
        }

        const seen = new Set<string>();
        const sanitized: string[] = [];
        for (const item of parsed.data.queries) {
          const clean = sanitizeQueryPhrase(item);
          if (!clean || seen.has(clean)) continue;
          seen.add(clean);
          sanitized.push(clean);
        }

        if (sanitized.length < 2) {
          throw new AppError("AI_FAILED", "Failed to generate visual search phrases", 502);
        }

        return {
          queries: sanitized.slice(0, 4),
          picturable: parsed.data.picturable,
        };
      };

      const promise = runCall();
      inflight.set(key, promise);
      let result;
      try {
        result = await promise;
      } finally {
        inflight.delete(key);
      }

      cache.set(key, result);
      if (cache.size > 1000) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }

      if (getMongoStatus().connected) {
        ImageQueryCache.create({
          key,
          queries: result.queries,
          picturable: result.picturable,
        }).catch(() => {
          // ignore duplicate key or mongo error
        });
      }

      return { queries: result.queries, picturable: result.picturable, source: "ai" };
    },
  };
}
