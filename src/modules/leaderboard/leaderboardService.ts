import mongoose from "mongoose";
import { config } from "../../config.js";
import {
  LeaderboardDaily,
  LeaderboardEntry,
  LeaderboardMeta,
  type ILeaderboardEntry,
} from "../../models/LeaderboardEntry.js";
import { User } from "../../models/User.js";
import {
  BASE_POINTS,
  addDays,
  buildSeedLearners,
  dayKey,
  daysBetween,
  gainSoFar,
  levelForName,
  periodStart,
  plannedGain,
  vietnamHour,
  type Level,
} from "./leaderboardSeed.js";

/** What each kind of study is worth. */
export const POINTS = {
  dictationCorrect: 10,
  listeningCorrect: 10,
  listeningWrong: 2,
  examCorrect: 5,
  examSitting: 50,
  dailyCheckin: 20,
} as const;

/** Most points study can earn in one day, so no one can climb by scripting requests. */
export const DAILY_STUDY_CAP = 1500;

/** The most days of demo activity caught up after the server was off. */
const MAX_CATCH_UP_DAYS = 14;

/** Days of demo history written when the crowd is created, enough to fill this week and this month. */
const SEED_HISTORY_DAYS = 62;

export type Period = "week" | "month" | "year" | "all";
/** A ranking is for one JLPT level, or "ALL" for everything. */
export type LevelFilter = Level | "ALL";

/** Rows the board shows: demo learners count only while they are switched on. */
export function boardFilter(): Record<string, unknown> {
  return config.leaderboardSeed ? {} : { isSeed: false };
}

/** Where a row stands on the all-time board: ahead of it are higher scores, and equal scores that joined earlier. */
export async function rankOf(entry: Pick<ILeaderboardEntry, "_id" | "points">): Promise<number> {
  const ahead = await LeaderboardEntry.countDocuments({
    ...boardFilter(),
    $or: [{ points: { $gt: entry.points } }, { points: entry.points, _id: { $lt: entry._id } }],
  });
  return ahead + 1;
}

/** The row just above this one on the all-time board, if any. */
export async function aheadOf(entry: Pick<ILeaderboardEntry, "_id" | "points">) {
  return LeaderboardEntry.findOne({
    ...boardFilter(),
    $or: [{ points: { $gt: entry.points } }, { points: entry.points, _id: { $lt: entry._id } }],
  })
    .sort({ points: 1, _id: -1 })
    .lean();
}

/** Writes points against a day and level, which is what the period and level rankings add up. */
export async function recordDaily(entryId: unknown, day: string, points: number, level = ""): Promise<void> {
  if (!(points > 0)) return;
  await LeaderboardDaily.updateOne({ entryId, day, level }, { $inc: { points } }, { upsert: true });
}

/** The learner's row, created at the base score on first sight and kept in step with their name and picture. */
export async function ensureEntry(userId: string): Promise<ILeaderboardEntry | null> {
  const user = await User.findById(userId, { displayName: 1, avatar: 1 }).lean();
  if (!user) return null;
  const set = { name: user.displayName, avatar: user.avatar ?? null };
  const update = { $set: set, $setOnInsert: { points: BASE_POINTS, isSeed: false } };
  try {
    return await LeaderboardEntry.findOneAndUpdate({ userId }, update, { upsert: true, new: true });
  } catch (err: any) {
    // Two requests created the row at once; the unique index keeps one.
    if (err?.code === 11000) return LeaderboardEntry.findOneAndUpdate({ userId }, { $set: set }, { new: true });
    throw err;
  }
}

/** Adds study points, within the day's cap. Never throws: a failed award must not fail the save that earned it. */
export async function awardPoints(userId: string, amount: number, level?: Level | null): Promise<void> {
  if (!(amount > 0) || !mongoose.isValidObjectId(userId)) return;
  try {
    const today = dayKey(new Date());
    const pipeline = [
      {
        $set: {
          dayPoints: { $cond: [{ $eq: ["$dayKey", today] }, { $ifNull: ["$dayPoints", 0] }, 0] },
          dayKey: today,
          ...(level ? { level } : {}),
        },
      },
      {
        $set: {
          lastGain: { $min: [amount, { $max: [0, { $subtract: [DAILY_STUDY_CAP, "$dayPoints"] }] }] },
        },
      },
      {
        $set: {
          points: { $add: ["$points", "$lastGain"] },
          dayPoints: { $add: ["$dayPoints", "$lastGain"] },
        },
      },
    ];
    let entry = await LeaderboardEntry.findOneAndUpdate({ userId }, pipeline, { new: true });
    if (!entry) {
      if (!(await ensureEntry(userId))) return;
      entry = await LeaderboardEntry.findOneAndUpdate({ userId }, pipeline, { new: true });
    }
    if (entry?.lastGain) await recordDaily(entry._id, today, entry.lastGain, level ?? "");
  } catch (err) {
    console.error("[leaderboard] award failed:", err);
  }
}

/** Pays the once-a-day bonus; returns what was paid (0 when already collected today). */
export async function claimDailyCheckin(entry: Pick<ILeaderboardEntry, "_id">): Promise<number> {
  const today = dayKey(new Date());
  const res = await LeaderboardEntry.updateOne(
    { _id: entry._id, lastCheckinDay: { $ne: today } },
    { $set: { lastCheckinDay: today }, $inc: { points: POINTS.dailyCheckin } },
  );
  if (res.modifiedCount === 0) return 0;
  await recordDaily(entry._id, today, POINTS.dailyCheckin);
  return POINTS.dailyCheckin;
}

export type PeriodRow = {
  _id: unknown;
  points: number;
  totalPoints: number;
  name: string;
  avatar: string | null;
  level: string | null;
};

/** First day a ranking counts from; "all" with a level still adds up every logged day. */
function sinceFor(period: Period, now: Date): string {
  return period === "all" ? "0000-00-00" : periodStart(period, now);
}

function dailyMatch(period: Period, level: LevelFilter, now: Date): Record<string, unknown> {
  return { day: { $gte: sinceFor(period, now) }, ...(level === "ALL" ? {} : { level }) };
}

/** The ranking for a period and level, from the points logged against each day. */
export async function periodRanking(
  period: Period,
  level: LevelFilter,
  limit: number,
  offset: number,
  now = new Date(),
): Promise<{ rows: PeriodRow[]; total: number }> {
  const seedFilter = config.leaderboardSeed ? [] : [{ $match: { "entry.isSeed": false } }];
  const [out] = await LeaderboardDaily.aggregate([
    { $match: dailyMatch(period, level, now) },
    { $group: { _id: "$entryId", points: { $sum: "$points" } } },
    { $lookup: { from: LeaderboardEntry.collection.name, localField: "_id", foreignField: "_id", as: "entry" } },
    { $unwind: "$entry" },
    ...seedFilter,
    { $sort: { points: -1, _id: 1 } },
    {
      $facet: {
        rows: [
          { $skip: offset },
          { $limit: limit },
          {
            $project: {
              points: 1,
              totalPoints: "$entry.points",
              name: "$entry.name",
              avatar: { $ifNull: ["$entry.avatar", null] },
              level: { $ifNull: ["$entry.level", null] },
            },
          },
        ],
        total: [{ $count: "n" }],
      },
    },
  ]);
  return { rows: out?.rows ?? [], total: out?.total?.[0]?.n ?? 0 };
}

/** Points a row has earned in a ranking, its place, and the learner just above it. */
export async function periodStanding(
  period: Period,
  level: LevelFilter,
  entryId: unknown,
  now = new Date(),
): Promise<{ points: number; rank: number; ahead: { name: string; points: number } | null }> {
  const match = dailyMatch(period, level, now);
  const mine = await LeaderboardDaily.aggregate([
    { $match: { ...match, entryId } },
    { $group: { _id: null, points: { $sum: "$points" } } },
  ]);
  const points: number = mine[0]?.points ?? 0;

  const seedFilter = config.leaderboardSeed ? [] : [{ $match: { "entry.isSeed": false } }];
  const [out] = await LeaderboardDaily.aggregate([
    { $match: match },
    { $group: { _id: "$entryId", points: { $sum: "$points" } } },
    { $match: { $or: [{ points: { $gt: points } }, { points, _id: { $lt: entryId } }] } },
    { $lookup: { from: LeaderboardEntry.collection.name, localField: "_id", foreignField: "_id", as: "entry" } },
    { $unwind: "$entry" },
    ...seedFilter,
    {
      $facet: {
        n: [{ $count: "n" }],
        next: [{ $sort: { points: 1, _id: -1 } }, { $limit: 1 }, { $project: { points: 1, name: "$entry.name" } }],
      },
    },
  ]);
  const next = out?.next?.[0];
  return {
    points,
    rank: (out?.n?.[0]?.n ?? 0) + 1,
    ahead: next ? { name: next.name, points: next.points } : null,
  };
}

/** Gives demo learners who predate levels one, and tags their logged days with it. */
async function ensureSeedLevels(): Promise<void> {
  const missing = await LeaderboardEntry.find({ isSeed: true, level: { $exists: false } }, { name: 1 }).lean();
  if (missing.length) {
    await LeaderboardEntry.bulkWrite(
      missing.map((s) => ({ updateOne: { filter: { _id: s._id }, update: { $set: { level: levelForName(s.name) } } } })),
    );
  }
  const seeds = await LeaderboardEntry.find({ isSeed: true }, { level: 1 }).lean();
  const byLevel = new Map<string, unknown[]>();
  for (const s of seeds) byLevel.set(s.level ?? "", [...(byLevel.get(s.level ?? "") ?? []), s._id]);
  for (const [level, ids] of byLevel) {
    if (!level) continue;
    await LeaderboardDaily.updateMany({ entryId: { $in: ids }, level: { $exists: false } }, { $set: { level } });
  }
}

/** Days used to be unique per learner; they are now unique per learner and level. */
async function migrateDailyIndex(): Promise<void> {
  try {
    await LeaderboardDaily.collection.dropIndex("entryId_1_day_1");
  } catch {
    // already gone, or never there
  }
  await LeaderboardDaily.createIndexes();
}

/** Writes each demo learner's last couple of months of study, so weekly and monthly boards are full from day one. */
async function backfillSeedHistory(now = new Date()): Promise<void> {
  const seeds = await LeaderboardEntry.find({ isSeed: true }, { points: 1, activity: 1, intensity: 1, level: 1 }).lean();
  if (seeds.length === 0) return;
  if (await LeaderboardDaily.exists({ entryId: { $in: seeds.map((s) => s._id) } })) return;

  const today = dayKey(now);
  const hour = vietnamHour(now);
  const docs: Array<{ entryId: unknown; day: string; level: string; points: number }> = [];
  for (const s of seeds) {
    const learner = { points: s.points, activity: s.activity ?? 0.6, intensity: s.intensity ?? 1 };
    for (let back = SEED_HISTORY_DAYS - 1; back >= 0; back--) {
      const day = addDays(today, -back);
      const points = gainSoFar(plannedGain(learner, String(s._id), day), String(s._id), day, back === 0 ? hour : 24);
      if (points > 0) docs.push({ entryId: s._id, day, level: s.level ?? "", points });
    }
  }
  await LeaderboardDaily.insertMany(docs, { ordered: false });
}

/** A demo learner's score can never be below the base plus everything logged for them, or a month's gain would top the total. */
async function reconcileSeedPoints(): Promise<void> {
  const seeds = await LeaderboardEntry.find({ isSeed: true }, { _id: 1 }).lean();
  if (seeds.length === 0) return;
  const sums = await LeaderboardDaily.aggregate([
    { $match: { entryId: { $in: seeds.map((s) => s._id) } } },
    { $group: { _id: "$entryId", sum: { $sum: "$points" } } },
  ]);
  const ops = sums.map((r) => ({
    updateOne: { filter: { _id: r._id, points: { $lt: BASE_POINTS + r.sum } }, update: { $set: { points: BASE_POINTS + r.sum } } },
  }));
  if (ops.length) await LeaderboardEntry.bulkWrite(ops, { ordered: false });
}

/** Fills demo history back to the start of the year, so the yearly ranking has the whole year behind it. */
async function extendSeedHistory(now = new Date()): Promise<void> {
  const seeds = await LeaderboardEntry.find({ isSeed: true }, { points: 1, activity: 1, intensity: 1, level: 1 }).lean();
  if (seeds.length === 0) return;
  const [earliest] = await LeaderboardDaily.aggregate([
    { $match: { entryId: { $in: seeds.map((s) => s._id) } } },
    { $group: { _id: null, day: { $min: "$day" } } },
  ]);
  const yearStart = periodStart("year", now);
  if (!earliest || earliest.day <= yearStart) return;

  const last = addDays(earliest.day, -1);
  const docs: Array<{ entryId: unknown; day: string; level: string; points: number }> = [];
  for (const s of seeds) {
    const learner = { points: s.points, activity: s.activity ?? 0.6, intensity: s.intensity ?? 1 };
    for (let day = yearStart; day <= last; day = addDays(day, 1)) {
      const points = plannedGain(learner, String(s._id), day);
      if (points > 0) docs.push({ entryId: s._id, day, level: s.level ?? "", points });
    }
  }
  if (docs.length) await LeaderboardDaily.insertMany(docs, { ordered: false });
}

/** Fills the board with demo learners the first time, so it never looks empty. */
export async function ensureSeedLearners(): Promise<number> {
  let created = 0;
  if (!(await LeaderboardEntry.exists({ isSeed: true }))) {
    const docs = buildSeedLearners().map((l) => ({ ...l, isSeed: true }));
    await LeaderboardEntry.insertMany(docs, { ordered: false });
    created = docs.length;
  }
  await ensureSeedLevels();
  await migrateDailyIndex();
  await backfillSeedHistory();
  await extendSeedHistory();
  await reconcileSeedPoints();
  return created;
}

/**
 * Moves the demo learners along as the day goes: each has a planned gain for today (and any day the server
 * missed), and by now they have earned the share of it that the time of day allows. Safe to run often and from
 * several servers: a day's points are claimed atomically, so nothing is added twice.
 */
export async function runDailyTick(now = new Date()): Promise<number> {
  const today = dayKey(now);
  const hour = vietnamHour(now);
  const meta = await LeaderboardMeta.findOne({ _id: "daily" }).lean();
  const first = meta ? addDays(today, -Math.min(MAX_CATCH_UP_DAYS, Math.max(0, daysBetween(meta.day, today)))) : today;
  const days: string[] = [];
  for (let d = first; d <= today; d = addDays(d, 1)) days.push(d);

  const seeds = await LeaderboardEntry.find({ isSeed: true }, { points: 1, activity: 1, intensity: 1, level: 1 }).lean();
  const done = await LeaderboardDaily.find({ day: { $in: days }, entryId: { $in: seeds.map((s) => s._id) } }).lean();
  const applied = new Map<string, number>();
  for (const r of done) {
    const key = `${r.entryId}|${r.day}`;
    applied.set(key, (applied.get(key) ?? 0) + r.points);
  }

  const totals = new Map<string, number>();
  for (const s of seeds) {
    const id = String(s._id);
    const level = s.level ?? "";
    const learner = { points: s.points, activity: s.activity ?? 0.6, intensity: s.intensity ?? 1 };
    for (const day of days) {
      const target = gainSoFar(plannedGain(learner, id, day), id, day, day === today ? hour : 24);
      if (target <= (applied.get(`${id}|${day}`) ?? 0)) continue;
      const before = await LeaderboardDaily.findOneAndUpdate(
        { entryId: s._id, day, level },
        [{ $set: { points: { $max: [{ $ifNull: ["$points", 0] }, target] } } }],
        { upsert: true, new: false },
      );
      const gain = target - (before?.points ?? 0);
      if (gain > 0) totals.set(id, (totals.get(id) ?? 0) + gain);
    }
  }

  const ops = [...totals].map(([id, gain]) => ({
    updateOne: { filter: { _id: new mongoose.Types.ObjectId(id) }, update: { $inc: { points: gain } } },
  }));
  if (ops.length) await LeaderboardEntry.bulkWrite(ops, { ordered: false });
  await LeaderboardMeta.updateOne({ _id: "daily" }, { $set: { day: today } }, { upsert: true });
  return ops.length;
}

/** Seeds the board, runs the daily update now and keeps checking for the next day. */
export async function startLeaderboardJobs(): Promise<void> {
  try {
    const seeded = await ensureSeedLearners();
    if (seeded) console.log(`[leaderboard] seeded ${seeded} demo learners`);
    await runDailyTick();
  } catch (err) {
    console.error("[leaderboard] startup failed:", err);
  }
  setInterval(
    () => {
      runDailyTick().catch((err) => console.error("[leaderboard] daily update failed:", err));
    },
    10 * 60 * 1000,
  ).unref();
}
