import mongoose, { Document, Schema } from "mongoose";

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: string;
  lessonTitle: string;
  level: string;
  score: number;
  maxStreak: number;
  correctCount: number;
  totalCount: number;
  mascot: string;
  createdAt: Date;
}

const historySchema = new Schema<IHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lessonId: {
      type: String,
      required: true,
      index: true,
    },
    lessonTitle: {
      type: String,
      default: "",
    },
    level: {
      type: String,
      default: "ALL",
    },
    score: {
      type: Number,
      default: 0,
    },
    maxStreak: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    totalCount: {
      type: Number,
      default: 0,
    },
    mascot: {
      type: String,
      default: "shiba",
    },
  },
  {
    timestamps: true,
  }
);

export const History = mongoose.model<IHistory>("History", historySchema);
