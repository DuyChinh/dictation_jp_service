import { Router } from "express";
import { getMongoStatus } from "../../database/mongo.js";
import { TrafficHour } from "../../models/TrafficHour.js";
import { AppError } from "../../shared/errors.js";
import { ah } from "../admin/helpers.js";

export const TRAFFIC_TZ = "Asia/Ho_Chi_Minh";
const HOUR_MS = 3600000;

function requireStorage() {
  if (!getMongoStatus().connected) throw new AppError("UNAVAILABLE", "Traffic storage unavailable", 503);
}

/** A page opening or route change is one view; individual API requests aren't counted. */
export function createTrafficRouter(): Router {
  const r = Router();
  r.post("/view", ah(async (_req, res) => {
    requireStorage();
    const _id = new Date(Math.floor(Date.now() / HOUR_MS) * HOUR_MS);
    try {
      await TrafficHour.updateOne({ _id }, { $inc: { views: 1 } }, { upsert: true });
    } catch (err) {
      // Two servers may create the first counter for this hour simultaneously.
      if ((err as { code?: number })?.code !== 11000) throw err;
      await TrafficHour.updateOne({ _id }, { $inc: { views: 1 } });
    }
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
