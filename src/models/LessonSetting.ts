import mongoose, { Document, Schema } from "mongoose";

/** Per-lesson switches set from the admin area; the lesson itself stays in its content package. */
export interface ILessonSetting extends Document {
  lessonId: string;
  hidden: boolean;
  updatedAt: Date;
}

const lessonSettingSchema = new Schema<ILessonSetting>(
  {
    lessonId: { type: String, required: true, unique: true },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const LessonSetting = mongoose.model<ILessonSetting>("LessonSetting", lessonSettingSchema);
