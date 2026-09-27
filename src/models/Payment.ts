import mongoose, { Document, Schema } from "mongoose";

export const PAYMENT_STATUSES = ["pending", "succeeded", "failed", "refunded"] as const;
export const PAYMENT_GATEWAYS = ["vnpay", "momo", "bank_transfer", "manual"] as const;

export interface IPayment extends Document {
  code: string;
  userId?: mongoose.Types.ObjectId | null;
  /** Copied at creation so the record still reads right after the user is deleted. */
  userEmail: string;
  userName: string;
  plan: string;
  amount: number;
  gateway: (typeof PAYMENT_GATEWAYS)[number];
  status: (typeof PAYMENT_STATUSES)[number];
  note: string;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    code: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userEmail: { type: String, default: "" },
    userName: { type: String, default: "" },
    plan: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    gateway: { type: String, enum: PAYMENT_GATEWAYS, default: "manual" },
    status: { type: String, enum: PAYMENT_STATUSES, default: "pending", index: true },
    note: { type: String, default: "" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
