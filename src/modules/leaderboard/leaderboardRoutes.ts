import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { config } from "../../config.js";
import { LeaderboardEntry } from "../../models/LeaderboardEntry.js";
import { requireAuth } from "../../shared/middleware/auth.js";
import { createTtlCache } from "../../shared/ttlCache.js";
import {
  aheadOf,
  awardPoints,
  boardFilter,
  claimDailyCheckin,
  ensureEntry,
  millionairePoints,
  periodRanking,
  periodStanding,
  rankOf,
  type LevelFilter,
} from "./leaderboardService.js";
import { isLevel } from "./leaderboardSeed.js";

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

type Row = { _id: unknown; name: string; avatar?: string | null; points: number; totalPoints?: number; level?: string | null };
type Board = { rows: Row[]; total: number; participants: number };

/** How long a ranking listing is reused; new points show up on the board within this many seconds. */
const BOARD_TTL_MS = 20_000;

export function createLeaderboardRouter(): Router {
  const r = Router();
  const boardCache = createTtlCache<Board>({ ttlMs: BOARD_TTL_MS, maxEntries: 200 });

  // The ranking, highest first: this week, month, year or all time, for one JLPT level or all of them.
  // A signed-in caller also gets their own standing.
  r.get("/", async (req: Request, res: Response) => {
    try {
      const limit = intParam(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
      const offset = intParam(req.query.offset, 0, 0, 100_000);
      const period =
        req.query.period === "week" || req.query.period === "month" || req.query.period === "year" ? req.query.period : "all";
      const levelParam = String(req.query.level ?? "ALL").toUpperCase();
      const level: LevelFilter = isLevel(levelParam) ? levelParam : "ALL";
      const userId = optionalUserId(req);
      const filter = boardFilter();

      const mine = userId ? await LeaderboardEntry.findOne({ userId }).lean() : null;

      // The listing is the same for everyone, so it is shared for a few seconds (and a burst of identical
      // requests runs one aggregation). "me" below stays live.
      const { rows, total, participants: boardParticipants } = await boardCache.load(
        `${period}|${level}|${limit}|${offset}`,
        async (): Promise<Board> => {
          if (period === "all" && level === "ALL") {
            const all = await LeaderboardEntry.find(filter).sort({ points: -1, _id: 1 }).skip(offset).limit(limit).lean();
            const n = await LeaderboardEntry.countDocuments(filter);
            return { rows: all, total: n, participants: n };
          }
          const ranked = await periodRanking(period, level, limit, offset);
          return {
            rows: ranked.rows,
            total: ranked.total,
            participants: level === "ALL" ? await LeaderboardEntry.countDocuments(filter) : ranked.total,
          };
        },
      );
      let participants = boardParticipants;
      let me: Record<string, unknown> | null = null;

      if (period === "all" && level === "ALL") {
        if (mine) {
          const ahead = await aheadOf(mine);
          me = {
            rank: await rankOf(mine),
            name: mine.name,
            avatar: mine.avatar || null,
            points: mine.points,
            totalPoints: mine.points,
            level: mine.level ?? null,
            ahead: ahead ? { name: ahead.name, gap: ahead.points - mine.points + 1 } : null,
          };
        }
      } else {
        if (mine) {
          const standing = await periodStanding(period, level, mine._id);
          // A level board only lists learners who earned points there; someone with none is ranked last,
          // so count them in, or the page reads "47 / 46".
          if (level !== "ALL" && standing.points === 0) participants += 1;
          me = {
            rank: standing.rank,
            name: mine.name,
            avatar: mine.avatar || null,
            points: standing.points,
            totalPoints: mine.points,
            level: mine.level ?? null,
            ahead: standing.ahead ? { name: standing.ahead.name, gap: standing.ahead.points - standing.points + 1 } : null,
          };
        }
      }

      const entries = rows.map((row, i) => ({
        rank: offset + i + 1,
        name: row.name,
        avatar: row.avatar || null,
        points: row.points,
        totalPoints: row.totalPoints ?? row.points,
        level: row.level ?? null,
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

  // Points for a finished game of "Who wants to be a millionaire": each million of the prize is a point.
  r.post("/game", requireAuth, async (req: Request, res: Response) => {
    try {
      const { game, prize } = (req.body ?? {}) as { game?: unknown; prize?: unknown };
      const worth = game === "millionaire" && typeof prize === "number" ? millionairePoints(prize) : 0;
      if (worth <= 0) return res.json({ gained: 0 });
      const userId = String(req.user!._id);
      const gained = await awardPoints(userId, worth);
      return res.json({ gained, worth });
    } catch (err: any) {
      console.error("Game points error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to add points" } });
    }
  });

  return r;
}
