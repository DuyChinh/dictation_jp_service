import mongoose, { Document, Schema } from "mongoose";

/** One browser (or installed app) that agreed to get "cards to review" reminders for a signed-in user. */
export interface IPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  /** The push service URL for this browser; unique, so a browser is never subscribed twice. */
  endpoint: string;
  keys: { p256dh: string; auth: string };
  /** Language the reminder is written in. */
  lang: "vi" | "en" | "ja";
  /** Local hour (0-23) the learner wants the reminder, and their UTC offset in minutes at the time they set it. */
  hour: number;
  /** Minute (0-59) within that hour; 0 for reminders set before minutes could be chosen. */
  minute: number;
  utcOffsetMin: number;
  /** Local calendar day ("YYYY-MM-DD") of the last reminder sent, so there is at most one a day. */
  lastSentDay: string;
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    lang: { type: String, enum: ["vi", "en", "ja"], default: "vi" },
    hour: { type: Number, min: 0, max: 23, default: 19 },
    minute: { type: Number, min: 0, max: 59, default: 0 },
    utcOffsetMin: { type: Number, default: 0 },
    lastSentDay: { type: String, default: "" },
  },
  { timestamps: true },
);

export const PushSubscription = mongoose.model<IPushSubscription>("PushSubscription", pushSubscriptionSchema);
