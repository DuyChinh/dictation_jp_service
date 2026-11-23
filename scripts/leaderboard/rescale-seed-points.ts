/**
 * Brings the demo learners' scores down to a believable size: drops their study history from before
 * SEED_HISTORY_START and resets each score to the base, a small head start, and the history that is left.
 * Real learners are never touched.
 *
 *   npx tsx scripts/leaderboard/rescale-seed-points.ts            # preview only, nothing is written
 *   npx tsx scripts/leaderboard/rescale-seed-points.ts --apply    # write the changes
 *
 * Safe to run twice: the second run finds nothing to change.
 */
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { LeaderboardDaily, LeaderboardEntry } from "../../src/models/LeaderboardEntry.js";
import { BASE_POINTS, dayKey, headStart, seedHistoryStart } from "../../src/modules/leaderboard/leaderboardSeed.js";

const APPLY = process.argv.includes("--apply");

const quantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(p * (sorted.length - 1))]! : 0;
};
const summary = (values: number[]) =>
  [0.1, 0.5, 0.9, 0.99, 1].map((p) => Math.round(quantile(values, p)).toLocaleString("en-US")).join(" / ");

async function main() {
  await connectMongo();
  const start = seedHistoryStart(new Date());
  console.log(`History kept from ${start} (today is ${dayKey(new Date())}). ${APPLY ? "APPLYING" : "Preview only, pass --apply to write"}.`);

  const seeds = await LeaderboardEntry.find({ isSeed: true }, { points: 1 }).lean();
  const ids = seeds.map((s) => s._id);
  console.log(`${seeds.length} demo learners`);

  const kept = await LeaderboardDaily.aggregate([
    { $match: { entryId: { $in: ids }, day: { $gte: start } } },
    { $group: { _id: "$entryId", sum: { $sum: "$points" } } },
  ]);
  const keptSum = new Map<string, number>(kept.map((r) => [String(r._id), r.sum as number]));
  const old = await LeaderboardDaily.countDocuments({ entryId: { $in: ids }, day: { $lt: start } });

  const next = seeds.map((s) => ({ id: s._id, points: BASE_POINTS + headStart(String(s._id)) + (keptSum.get(String(s._id)) ?? 0) }));
  console.log("Scores now    p10 / p50 / p90 / p99 / max:", summary(seeds.map((s) => s.points)));
  console.log("Scores after  p10 / p50 / p90 / p99 / max:", summary(next.map((n) => n.points)));
  console.log(`History rows to delete: ${old}`);

  if (APPLY) {
    if (old) await LeaderboardDaily.deleteMany({ entryId: { $in: ids }, day: { $lt: start } });
    if (next.length) {
      await LeaderboardEntry.bulkWrite(
        next.map((n) => ({ updateOne: { filter: { _id: n.id }, update: { $set: { points: n.points } } } })),
        { ordered: false },
      );
    }
    console.log("Done.");
  }
  await disconnectMongo();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectMongo().catch(() => {});
  process.exit(1);
});
