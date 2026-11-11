import { Router, type Request } from "express";
import { PaperProgress } from "../../models/PaperProgress.js";

type Change = { lessonId: string; kind: "answer" | "sentence"; itemId: string; value: unknown; at: number };
const text = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 200;
const parts = ["vocab", "grammar", "reading"];
const statuses = ["good", "partial", "weak", "self"];

function cleanChange(input: unknown): Change | null {
  if (!input || typeof input !== "object") return null;
  const c = input as Record<string, unknown>;
  if (!text(c.lessonId) || !text(c.itemId) || (c.kind !== "answer" && c.kind !== "sentence")) return null;
  if (typeof c.at !== "number" || !Number.isSafeInteger(c.at) || c.at <= 0 || c.at > Date.now() + 300_000) return null;
  let value: unknown = null;
  if (c.value !== null) {
    if (c.kind === "sentence") {
      if (typeof c.value !== "string" || !statuses.includes(c.value)) return null;
      value = c.value;
    } else {
      if (!c.value || typeof c.value !== "object") return null;
      const a = c.value as Record<string, unknown>;
      if (!text(a.choiceId) || typeof a.correct !== "boolean" || !parts.includes(String(a.part)) ||
          typeof a.at !== "number" || !Number.isSafeInteger(a.at) || a.at <= 0) return null;
      value = { choiceId: a.choiceId, correct: a.correct, at: a.at, part: a.part,
        ...(typeof a.mondai === "number" && Number.isInteger(a.mondai) && a.mondai > 0 ? { mondai: a.mondai } : {}) };
    }
  }
  return { lessonId: c.lessonId, kind: c.kind, itemId: c.itemId, at: c.at, value };
}

export function createPaperProgressRouter(userIdFrom: (req: Request) => string | null): Router {
  const r = Router();
  r.get(["/paper", "/paper/:lessonId"], async (req, res) => {
    const userId = userIdFrom(req);
    if (!userId) return res.status(401).json({ error: { message: "Sign in to sync progress" } });
    try {
      const filter = { userId, ...(req.params.lessonId ? { lessonId: req.params.lessonId } : {}) };
      const rows = await PaperProgress.find(filter).lean();
      res.set("Cache-Control", "no-store");
      return res.json({ changes: rows.map(({ lessonId, kind, itemId, value, at }) => ({ lessonId, kind, itemId, value, at })) });
    } catch {
      return res.status(500).json({ error: { message: "Failed to load written progress" } });
    }
  });
  r.post("/paper", async (req, res) => {
    const userId = userIdFrom(req);
    if (!userId) return res.status(401).json({ error: { message: "Sign in to sync progress" } });
    if (!Array.isArray(req.body?.changes) || req.body.changes.length > 1000) {
      return res.status(400).json({ error: { message: "Expected up to 1000 progress changes" } });
    }
    const changes = req.body.changes.map(cleanChange);
    if (changes.some((c: Change | null) => !c)) {
      return res.status(400).json({ error: { message: "Invalid progress change" } });
    }
    try {
      if (changes.length) await PaperProgress.bulkWrite(changes.map((c: Change) => ({
        updateOne: {
          filter: { userId, lessonId: c.lessonId, kind: c.kind, itemId: c.itemId },
          // Delayed requests cannot overwrite a newer answer or revive a reset.
          update: [{ $set: {
            value: { $cond: [{ $gte: [{ $literal: c.at }, { $ifNull: ["$at", 0] }] }, { $literal: c.value }, "$value"] },
            at: { $max: [{ $ifNull: ["$at", 0] }, { $literal: c.at }] },
          } }],
          upsert: true,
        },
      })), { ordered: false });
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: { message: "Failed to save written progress" } });
    }
  });
  return r;
}
