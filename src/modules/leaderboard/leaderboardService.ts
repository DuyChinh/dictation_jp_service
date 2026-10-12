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
  dailyGain,
  dayKey,
  daysBetween,
  periodStart,
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

/** Rows the board shows: demo learners count only while they are switched on. */
export function boardFilter(): Record<string, unknown> {
  return config.leaderboardSeed ? {} : { isSeed: false };
}

/** Where a row stands: ahead of it are higher scores, and equal scores that joined earlier. */
export async function rankOf(entry: Pick<ILeaderboardEntry, "_id" | "points">): Promise<number> {
  const ahead = await LeaderboardEntry.countDocuments({
    ...boardFilter(),
    $or: [{ points: { $gt: entry.points } }, { points: entry.points, _id: { $lt: entry._id } }],
  });
  return ahead + 1;
}

/** Writes points against a day, which is what the weekly and monthly rankings add up. */
export async function recordDaily(entryId: unknown, day: string, points: number): Promise<void> {
  if (!(points > 0)) return;
  await LeaderboardDaily.updateOne({ entryId, day }, { $inc: { points } }, { upsert: true });
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
export async function awardPoints(userId: string, amount: number): Promise<void> {
  if (!(amount > 0) || !mongoose.isValidObjectId(userId)) return;
  try {
    const today = dayKey(new Date());
    const pipeline = [
      {
        $set: {
          dayPoints: { $cond: [{ $eq: ["$dayKey", today] }, { $ifNull: ["$dayPoints", 0] }, 0] },
          dayKey: today,
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
    if (entry?.lastGain) await recordDaily(entry._id, today, entry.lastGain);
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

export type PeriodRow = { _id: unknown; points: number; name: string; avatar: string | null };

/** The ranking for this week or month, from the points logged against each day since it began. */
export async function periodRanking(
  period: "week" | "month",
  limit: number,
  offset: number,
  now = new Date(),
): Promise<{ rows: PeriodRow[]; total: number }> {
  const seedFilter = config.leaderboardSeed ? [] : [{ $match: { "entry.isSeed": false } }];
  const [out] = await LeaderboardDaily.aggregate([
    { $match: { day: { $gte: periodStart(period, now) } } },
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
          { $project: { points: 1, name: "$entry.name", avatar: { $ifNull: ["$entry.avatar", null] } } },
        ],
        total: [{ $count: "n" }],
      },
    },
  ]);
  return { rows: out?.rows ?? [], total: out?.total?.[0]?.n ?? 0 };
}

/** Points a row has earned this week or month, and how many rows are ahead of it. */
export async function periodStanding(
  period: "week" | "month",
  entryId: unknown,
  now = new Date(),
): Promise<{ points: number; rank: number }> {
  const since = periodStart(period, now);
  const mine = await LeaderboardDaily.aggregate([
    { $match: { entryId, day: { $gte: since } } },
    { $group: { _id: null, points: { $sum: "$points" } } },
  ]);
  const points: number = mine[0]?.points ?? 0;

  const seedFilter = config.leaderboardSeed ? [] : [{ $match: { "entry.isSeed": false } }];
  const [ahead] = await LeaderboardDaily.aggregate([
    { $match: { day: { $gte: since } } },
    { $group: { _id: "$entryId", points: { $sum: "$points" } } },
    { $match: { $or: [{ points: { $gt: points } }, { points, _id: { $lt: entryId } }] } },
    { $lookup: { from: LeaderboardEntry.collection.name, localField: "_id", foreignField: "_id", as: "entry" } },
    { $unwind: "$entry" },
    ...seedFilter,
    { $count: "n" },
  ]);
  return { points, rank: (ahead?.n ?? 0) + 1 };
}

/** Writes each demo learner's last couple of months of study, so weekly and monthly boards are full from day one. */
async function backfillSeedHistory(): Promise<void> {
  const seeds = await LeaderboardEntry.find({ isSeed: true }, { points: 1, activity: 1, intensity: 1 }).lean();
  if (seeds.length === 0) return;
  if (await LeaderboardDaily.exists({ entryId: { $in: seeds.map((s) => s._id) } })) return;

  const today = dayKey(new Date());
  const docs: Array<{ entryId: unknown; day: string; points: number }> = [];
  for (const s of seeds) {
    for (let back = SEED_HISTORY_DAYS - 1; back >= 0; back--) {
      const points = dailyGain({ points: s.points, activity: s.activity ?? 0.6, intensity: s.intensity ?? 1 }, Math.random);
      if (points > 0) docs.push({ entryId: s._id, day: addDays(today, -back), points });
    }
  }
  await LeaderboardDaily.insertMany(docs, { ordered: false });
}

/** Fills the board with demo learners the first time, so it never looks empty. */
export async function ensureSeedLearners(): Promise<number> {
  let created = 0;
  if (!(await LeaderboardEntry.exists({ isSeed: true }))) {
    const docs = buildSeedLearners().map((l) => ({ ...l, isSeed: true }));
    await LeaderboardEntry.insertMany(docs, { ordered: false });
    created = docs.length;
  }
  await backfillSeedHistory();
  return created;
}

/** Gives every demo learner a day's worth of study, once per calendar day however many servers run. */
export async function runDailyTick(now = new Date()): Promise<number> {
  const today = dayKey(now);
  const previous = await LeaderboardMeta.findOneAndUpdate({ _id: "daily", day: { $ne: today } }, { $set: { day: today } });
  if (!previous) {
    // Either already done today, or the very first run, which starts the clock without adding a day.
    try {
      await LeaderboardMeta.create({ _id: "daily", day: today });
    } catch {
      // another instance wrote it first
    }
    return 0;
  }

  const days = Math.min(MAX_CATCH_UP_DAYS, Math.max(1, daysBetween(previous.day, today)));
  const seeds = await LeaderboardEntry.find({ isSeed: true }, { points: 1, activity: 1, intensity: 1 }).lean();
  const daily: Array<{ updateOne: { filter: object; update: object; upsert: true } }> = [];
  const totals: Array<{ updateOne: { filter: object; update: object } }> = [];

  for (const s of seeds) {
    let points = s.points;
    for (let i = days - 1; i >= 0; i--) {
      const gain = dailyGain({ points, activity: s.activity ?? 0.6, intensity: s.intensity ?? 1 }, Math.random);
      if (gain <= 0) continue;
      points += gain;
      daily.push({
        updateOne: { filter: { entryId: s._id, day: addDays(today, -i) }, update: { $inc: { points: gain } }, upsert: true },
      });
    }
    if (points > s.points) {
      totals.push({ updateOne: { filter: { _id: s._id }, update: { $inc: { points: points - s.points } } } });
    }
  }
  if (totals.length) await LeaderboardEntry.bulkWrite(totals, { ordered: false });
  if (daily.length) await LeaderboardDaily.bulkWrite(daily, { ordered: false });
  console.log(`[leaderboard] daily update: ${totals.length} learner(s) over ${days} day(s)`);
  return totals.length;
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
    30 * 60 * 1000,
  ).unref();
}
