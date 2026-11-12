import mongoose, { Document, Schema } from "mongoose";

/** Cached AI-generated visual search queries for a word. */
export interface IImageQueryCache extends Document {
  key: string;
  queries: string[];
  picturable: boolean;
  createdAt: Date;
}

const imageQueryCacheSchema = new Schema<IImageQueryCache>(
  {
    key: { type: String, required: true, unique: true, index: true },
    queries: { type: [String], required: true },
    picturable: { type: Boolean, required: true },
    createdAt: { type: Date, default: Date.now, expires: 90 * 24 * 3600 },
  },
  { timestamps: false, minimize: false },
);

export const ImageQueryCache =
  (mongoose.models.ImageQueryCache as mongoose.Model<IImageQueryCache>) ||
  mongoose.model<IImageQueryCache>("ImageQueryCache", imageQueryCacheSchema);
