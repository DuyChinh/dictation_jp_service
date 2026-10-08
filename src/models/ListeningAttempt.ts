import mongoose, { Document, Schema } from "mongoose";

/** Score of one part at the moment the attempt was submitted. */
export interface IAttemptSection {
  sectionId: string;
  total: number;
  right: number;
  wrong: number;
}

/**
 * One submitted run through a listening test: the answers as they were and the score.
 * Submitting clears the live answers, so these are what the result and history pages show.
 */
export interface IListeningAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: string;
  /** Id the browser gave it, so a resent attempt isn't stored twice. */
  clientId: string;
  /** "full" covers the whole test; "retry" only the questions picked to redo. */
  mode: "full" | "retry";
  startedAt: Date | null;
  submittedAt: Date;
  total: number;
  right: number;
  wrong: number;
  sections: IAttemptSection[];
  answers: Record<string, { choiceId: string; correct: boolean; correctChoiceId: string | null; answeredAt: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<IAttemptSection>(
  {
    sectionId: { type: String, required: true },
    total: { type: Number, default: 0 },
    right: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
  },
  { _id: false },
);

const listeningAttemptSchema = new Schema<IListeningAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lessonId: { type: String, required: true },
    clientId: { type: String, required: true },
    mode: { type: String, enum: ["full", "retry"], default: "full" },
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, required: true },
    total: { type: Number, default: 0 },
    right: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    sections: { type: [sectionSchema], default: [] },
    answers: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);

listeningAttemptSchema.index({ userId: 1, clientId: 1 }, { unique: true });
listeningAttemptSchema.index({ userId: 1, lessonId: 1, submittedAt: -1 });

export const ListeningAttempt = mongoose.model<IListeningAttempt>("ListeningAttempt", listeningAttemptSchema);
