import mongoose, { Schema } from "mongoose";

/** A written answer or translation mark. Null values retain resets across devices. */
const paperProgressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lessonId: { type: String, required: true },
  kind: { type: String, enum: ["answer", "sentence"], required: true },
  itemId: { type: String, required: true },
  value: { type: Schema.Types.Mixed, default: null },
  at: { type: Number, required: true },
});

paperProgressSchema.index({ userId: 1, lessonId: 1, kind: 1, itemId: 1 }, { unique: true });

export const PaperProgress = mongoose.model("PaperProgress", paperProgressSchema);
