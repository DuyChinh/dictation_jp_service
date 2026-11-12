import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { AppError } from "../../shared/errors.js";
import type { QueryWriter } from "./imageQueryWriter.js";
import { MAX_QUERY, normalizeQuery, type ImageSearch } from "./imageSearch.js";

const WINDOW_MS = 60_000;
const SEARCH_MAX_PER_WINDOW = 40;
const QUERIES_MAX_PER_WINDOW = 10;

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res).catch(next);
  };

/** A per-address limiter to protect upstream APIs from being hammered through this server. */
export function createRateLimiter(opts: {
  max: number;
  windowMs?: number;
  code?: string;
  message?: string;
  now?: () => number;
}): RequestHandler {
  const windowMs = opts.windowMs ?? WINDOW_MS;
  const max = opts.max;
  const code = opts.code ?? "RATE_LIMITED";
  const message = opts.message ?? "Too many requests, try again in a minute";
  const now = opts.now ?? Date.now;
  const hits = new Map<string, number[]>();

  return (req, _res, next) => {
    const t = now();
    const key = req.ip ?? "unknown";
    const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
    if (recent.length >= max) return next(new AppError(code, message, 429));
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (v.every((at) => t - at >= windowMs)) hits.delete(k);
    next();
  };
}

const queryBodySchema = z
  .object({
    word: z.string().trim().min(1).max(40),
    reading: z.string().trim().max(60).optional(),
    meanings: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
    example: z.string().trim().max(120).optional(),
    description: z.string().trim().max(200).optional(),
  })
  .strict();

export function createImageRouter(
  search: ImageSearch,
  queryWriterOrNow?: QueryWriter | (() => number),
  nowFn: () => number = Date.now,
): Router {
  const queryWriter = typeof queryWriterOrNow === "function" ? undefined : queryWriterOrNow;
  const now = typeof queryWriterOrNow === "function" ? queryWriterOrNow : nowFn;

  const r = Router();
  const searchLimiter = createRateLimiter({
    max: SEARCH_MAX_PER_WINDOW,
    message: "Too many picture searches, try again in a minute",
    now,
  });
  const queriesLimiter = createRateLimiter({
    max: QUERIES_MAX_PER_WINDOW,
    message: "Too many AI query requests, try again in a minute",
    now,
  });

  /** Pictures for a word: `q` is what to look for (the meaning in English works best). */
  r.get("/search", searchLimiter, wrap(async (req, res) => {
    const q = normalizeQuery(String(req.query.q ?? ""));
    if (!q) throw new AppError("BAD_REQUEST", `q must be 1-${MAX_QUERY} characters`);
    const n = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(n) ? Math.min(24, Math.max(1, n)) : 12;
    let result;
    try {
      result = await search.search(q, limit);
    } catch {
      throw new AppError("IMAGES_UNAVAILABLE", "The picture sources are not answering right now. Try again in a moment.", 502);
    }
    // the same words give the same pictures, so a browser may keep them for a while
    res.set("Cache-Control", result.partial ? "no-store" : "private, max-age=3600");
    res.json(result);
  }));

  /** AI-written visual search phrases for a Japanese word. */
  r.post("/queries", queriesLimiter, wrap(async (req, res) => {
    if (!queryWriter || !queryWriter.isAvailable()) {
      throw new AppError("AI_UNAVAILABLE", "AI visual search is not configured", 501);
    }
    const parsed = queryBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid request body", 400);
    }
    const data = parsed.data;
    const result = await queryWriter.writeQueries({
      word: data.word,
      reading: data.reading?.trim() || undefined,
      meanings: data.meanings.map((m) => m.trim()),
      example: data.example?.trim() || undefined,
      description: data.description?.trim() || undefined,
    });
    res.json({
      queries: result.queries,
      picturable: result.picturable,
      source: result.source,
    });
  }));

  return r;
}
