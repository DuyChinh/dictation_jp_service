import mongoose, { Document, Schema } from "mongoose";

export interface IProgress extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: string;
  questionId: string;
  segmentId: string;
  status: "correct" | "incorrect";
  score: number;
  lastAnswer?: string;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const progressSchema = new Schema<IProgress>(
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
    questionId: {
      type: String,
      required: true,
    },
    segmentId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["correct", "incorrect"],
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    lastAnswer: {
      type: String,
    },
    attempts: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index for user + lesson + segment
progressSchema.index({ userId: 1, lessonId: 1, segmentId: 1 }, { unique: true });

export const Progress = mongoose.model<IProgress>("Progress", progressSchema);
