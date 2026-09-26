import mongoose, { Document, Schema } from "mongoose";

/** When a user last practised a lesson; the lesson list shows recent ones first. */
export interface ILessonActivity extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: string;
  lastActiveAt: Date;
}

const lessonActivitySchema = new Schema<ILessonActivity>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  lessonId: {
    type: String,
    required: true,
  },
  lastActiveAt: {
    type: Date,
    required: true,
  },
});

lessonActivitySchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const LessonActivity = mongoose.model<ILessonActivity>("LessonActivity", lessonActivitySchema);
