import mongoose, { Document, Schema } from "mongoose";

export interface IExamHistory extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: string;
  scope: string;
  minutes: number;
  startedAt: number;
  submittedAt: number;
  total: number;
  answered: number;
  correct: number;
  result?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const examHistorySchema = new Schema<IExamHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lessonId: { type: String, required: true, index: true },
    scope: { type: String, required: true, default: "all" },
    minutes: { type: Number, required: true, default: 0 },
    startedAt: { type: Number, required: true },
    submittedAt: { type: Number, required: true, index: true },
    total: { type: Number, required: true, default: 0 },
    answered: { type: Number, required: true, default: 0 },
    correct: { type: Number, required: true, default: 0 },
    result: { type: Schema.Types.Mixed },
  },
  { timestamps: true, minimize: false }
);

// One sitting per user + lesson + startedAt
examHistorySchema.index({ userId: 1, lessonId: 1, startedAt: 1 }, { unique: true });
// Fast lookup of sittings from newest to oldest (no limit in DB)
examHistorySchema.index({ userId: 1, submittedAt: -1 });

export const ExamHistory = mongoose.model<IExamHistory>("ExamHistory", examHistorySchema);
