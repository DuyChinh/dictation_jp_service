import mongoose, { Document, Schema } from "mongoose";

/** One row of the leaderboard: a signed-in learner (userId set) or a seeded demo learner (isSeed). */
export interface ILeaderboardEntry extends Document {
  userId?: mongoose.Types.ObjectId;
  name: string;
  avatar?: string;
  points: number;
  isSeed: boolean;
  /** The JLPT level (N5-N1) a learner mostly studies; for demo learners it is fixed, for real ones it follows their latest study. */
  level?: string;
  /** Seeded learners only: chance of studying on a given day, and how much they earn when they do. */
  activity?: number;
  intensity?: number;
  /** Real learners only: last day the daily check-in bonus was paid, and points earned from study today. */
  lastCheckinDay?: string;
  dayKey?: string;
  dayPoints?: number;
  /** What the latest award added after the daily cap, so it can be logged against the day. */
  lastGain?: number;
  createdAt: Date;
  updatedAt: Date;
}

const leaderboardEntrySchema = new Schema<ILeaderboardEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
    name: { type: String, required: true },
    avatar: { type: String },
    points: { type: Number, default: 1000, index: -1 },
    isSeed: { type: Boolean, default: false, index: true },
    level: { type: String },
    activity: { type: Number },
    intensity: { type: Number },
    lastCheckinDay: { type: String },
    dayKey: { type: String },
    dayPoints: { type: Number, default: 0 },
    lastGain: { type: Number },
  },
  { timestamps: true },
);

export const LeaderboardEntry = mongoose.model<ILeaderboardEntry>("LeaderboardEntry", leaderboardEntrySchema);

/** Bookkeeping for the daily job, so several server instances never add the same day twice. */
interface ILeaderboardMeta extends Document<string> {
  day: string;
}

const leaderboardMetaSchema = new Schema<ILeaderboardMeta>({
  _id: { type: String },
  day: { type: String, required: true },
});

export const LeaderboardMeta = mongoose.model<ILeaderboardMeta>("LeaderboardMeta", leaderboardMetaSchema);

/** Points earned by one row on one day (a Vietnam-time date key); weekly and monthly rankings add these up. */
interface ILeaderboardDaily extends Document {
  entryId: mongoose.Types.ObjectId;
  day: string;
  /** JLPT level of the study that earned it ("" for points with no level, such as the daily check-in). */
  level?: string;
  points: number;
}

const leaderboardDailySchema = new Schema<ILeaderboardDaily>({
  entryId: { type: Schema.Types.ObjectId, ref: "LeaderboardEntry", required: true },
  day: { type: String, required: true, index: true },
  level: { type: String, default: "" },
  points: { type: Number, default: 0 },
});
leaderboardDailySchema.index({ entryId: 1, day: 1, level: 1 }, { unique: true });

export const LeaderboardDaily = mongoose.model<ILeaderboardDaily>("LeaderboardDaily", leaderboardDailySchema);
