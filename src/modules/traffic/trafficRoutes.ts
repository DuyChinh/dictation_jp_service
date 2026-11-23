import { Router } from "express";
import { getMongoStatus } from "../../database/mongo.js";
import { TrafficHour } from "../../models/TrafficHour.js";
import { AppError } from "../../shared/errors.js";
import { createRateLimiter } from "../../shared/middleware/rateLimit.js";
import { ah } from "../admin/helpers.js";

export const TRAFFIC_TZ = "Asia/Ho_Chi_Minh";
const HOUR_MS = 3600000;

function requireStorage() {
  if (!getMongoStatus().connected) throw new AppError("UNAVAILABLE", "Traffic storage unavailable", 503);
}

const FLUSH_EVERY_MS = 30_000;
const VIEWS_MAX_PER_MINUTE = 120;

/** Views counted here but not yet written, by the start (ms) of their hour. */
const pending = new Map<number, number>();
let flushTimer: NodeJS.Timeout | undefined;
let flushing: Promise<void> | undefined;

async function addToHour(hourMs: number, views: number): Promise<void> {
  const _id = new Date(hourMs);
  try {
    await TrafficHour.updateOne({ _id }, { $inc: { views } }, { upsert: true });
  } catch (err) {
    // Two servers may create the first counter for this hour simultaneously.
    if ((err as { code?: number })?.code !== 11000) throw err;
    await TrafficHour.updateOne({ _id }, { $inc: { views } });
  }
}

/** Write the buffered counts to MongoDB. Counts that fail to save are kept for the next round. */
export function flushTraffic(): Promise<void> {
  if (flushing) return flushing;
  if (!pending.size || !getMongoStatus().connected) return Promise.resolve();
  const batch = [...pending];
  pending.clear();
  flushing = (async () => {
    for (const [hourMs, views] of batch) {
      try {
        await addToHour(hourMs, views);
      } catch (err) {
        pending.set(hourMs, (pending.get(hourMs) ?? 0) + views);
        console.error("[traffic] flush failed:", err);
      }
    }
  })().finally(() => {
    flushing = undefined;
  });
  return flushing;
}

function ensureFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => void flushTraffic(), FLUSH_EVERY_MS);
  flushTimer.unref();
}

/**
 * A page opening or route change is one view; individual API requests aren't counted.
 * Views are added up in memory and saved every few seconds, so a busy hour costs a handful of writes
 * instead of one per page view. A crash can lose the last few seconds of counts.
 */
export function createTrafficRouter(): Router {
  const r = Router();
  const limiter = createRateLimiter({ max: VIEWS_MAX_PER_MINUTE, message: "Too many page views, slow down" });
  r.post("/view", limiter, ah(async (_req, res) => {
    requireStorage();
    const hourMs = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
    pending.set(hourMs, (pending.get(hourMs) ?? 0) + 1);
    ensureFlushTimer();
    res.status(204).end();
  }));
  return r;
}

/** Mounted behind requireAdmin, with the same access as the overview. */
export function createTrafficAdminRouter(): Router {
  const r = Router();
  r.get("/", ah(async (req, res) => {
    const today = new Date(Date.now() + 7 * HOUR_MS).toISOString().slice(0, 10);
    const date = req.query.date ?? today;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError("VALIDATION_ERROR", "date: expected YYYY-MM-DD", 400);
    }
    const start = new Date(`${date}T00:00:00+07:00`);
    if (!Number.isFinite(start.getTime()) || new Date(start.getTime() + 7 * HOUR_MS).toISOString().slice(0, 10) !== date) {
      throw new AppError("VALIDATION_ERROR", "date: invalid calendar date", 400);
    }
    requireStorage();
    const end = new Date(start.getTime() + 24 * HOUR_MS);
    const rows = await TrafficHour.find({ _id: { $gte: start, $lt: end } }).lean();
    const counts = new Map(rows.map((row) => [row._id.getTime(), row.views]));
    const series = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      views: counts.get(start.getTime() + hour * HOUR_MS) ?? 0,
    }));
    res.set("Cache-Control", "no-store").json({
      date,
      timeZone: TRAFFIC_TZ,
      total: series.reduce((sum, row) => sum + row.views, 0),
      series,
    });
  }));
  return r;
}
