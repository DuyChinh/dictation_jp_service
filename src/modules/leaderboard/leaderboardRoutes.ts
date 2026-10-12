import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { config } from "../../config.js";
import { LeaderboardEntry } from "../../models/LeaderboardEntry.js";
import { requireAuth } from "../../shared/middleware/auth.js";
import {
  boardFilter,
  claimDailyCheckin,
  ensureEntry,
  periodRanking,
  periodStanding,
  rankOf,
} from "./leaderboardService.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 500;

function optionalUserId(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(header.substring(7), config.jwtSecret) as { userId?: string };
    return decoded.userId && mongoose.isValidObjectId(decoded.userId) ? decoded.userId : null;
  } catch {
    return null;
  }
}

function intParam(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function createLeaderboardRouter(): Router {
  const r = Router();

  // The ranking, highest first: this week, this month or all time. A signed-in caller also gets their own standing.
  r.get("/", async (req: Request, res: Response) => {
    try {
      const limit = intParam(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
      const offset = intParam(req.query.offset, 0, 0, 100_000);
      const period = req.query.period === "week" || req.query.period === "month" ? req.query.period : "all";
      const userId = optionalUserId(req);
      const filter = boardFilter();

      const mine = userId ? await LeaderboardEntry.findOne({ userId }).lean() : null;
      const participants = await LeaderboardEntry.countDocuments(filter);

      let rows: Array<{ _id: unknown; name: string; avatar?: string | null; points: number }>;
      let total = participants;
      let me: { rank: number; name: string; avatar: string | null; points: number } | null = null;

      if (period === "all") {
        rows = await LeaderboardEntry.find(filter).sort({ points: -1, _id: 1 }).skip(offset).limit(limit).lean();
        if (mine) me = { rank: await rankOf(mine), name: mine.name, avatar: mine.avatar || null, points: mine.points };
      } else {
        const ranked = await periodRanking(period, limit, offset);
        rows = ranked.rows;
        total = ranked.total;
        if (mine) {
          const standing = await periodStanding(period, mine._id);
          me = { rank: standing.rank, name: mine.name, avatar: mine.avatar || null, points: standing.points };
        }
      }

      const entries = rows.map((row, i) => ({
        rank: offset + i + 1,
        name: row.name,
        avatar: row.avatar || null,
        points: row.points,
        isMe: !!mine && String(row._id) === String(mine._id),
      }));

      return res.json({ entries, total, participants, me });
    } catch (err: any) {
      console.error("Get leaderboard error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to load leaderboard" } });
    }
  });

  // The caller's own score and rank; also collects today's check-in bonus on the first call of the day.
  r.get("/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const entry = await ensureEntry(String(req.user!._id));
      if (!entry) return res.status(404).json({ error: { message: "User not found" } });
      const awarded = await claimDailyCheckin(entry);
      const points = entry.points + awarded;
      const rank = await rankOf({ _id: entry._id, points });
      const total = await LeaderboardEntry.countDocuments(boardFilter());
      return res.json({ points, rank, total, awarded });
    } catch (err: any) {
      console.error("Get my score error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to load score" } });
    }
  });

  return r;
}
