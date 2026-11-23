import mongoose, { Document, Schema, Types } from "mongoose";

/** Where a voucher came from. One voucher per user per source. */
export type VoucherSource = "support_video";

/** A personal discount voucher kept on a user's account until they spend it on a future purchase. */
export interface IUserVoucher extends Document {
  userId: Types.ObjectId;
  source: VoucherSource;
  /** Shown to the user and typed at checkout; unique across all vouchers. */
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  /** null = never expires. */
  expiresAt: Date | null;
  /** Set when the voucher is spent. */
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userVoucherSchema = new Schema<IUserVoucher>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    source: { type: String, enum: ["support_video"], required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["percent", "fixed"], default: "percent" },
    discountValue: { type: Number, required: true, min: 0 },
    expiresAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// the guarantee behind "one per user": a second claim finds this row instead of making another
userVoucherSchema.index({ userId: 1, source: 1 }, { unique: true });

export const UserVoucher = mongoose.model<IUserVoucher>("UserVoucher", userVoucherSchema);
