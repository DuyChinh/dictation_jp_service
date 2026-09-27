import mongoose, { Document, Schema } from "mongoose";

/** A plan learners can be put on; `code` is what User.plan stores. */
export interface IPlan extends Document {
  code: string;
  name: string;
  price: number;
  /** 0 = no expiry. */
  durationDays: number;
  features: string[];
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
  {
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    price: { type: Number, default: 0, min: 0 },
    durationDays: { type: Number, default: 30, min: 0 },
    features: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Plan = mongoose.model<IPlan>("Plan", planSchema);
