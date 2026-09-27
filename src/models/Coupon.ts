import mongoose, { Document, Schema } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  /** null = unlimited. */
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    discountType: { type: String, enum: ["percent", "fixed"], default: "percent" },
    discountValue: { type: Number, required: true, min: 0 },
    maxUses: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Coupon = mongoose.model<ICoupon>("Coupon", couponSchema);
