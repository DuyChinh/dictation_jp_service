import mongoose, { Document, Schema } from "mongoose";

export const ADMIN_ROLES = ["super_admin", "content", "support", "accountant"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Back-office account; kept apart from learner accounts in `users`. */
export interface IAdmin extends Document {
  username: string;
  displayName: string;
  passwordHash: string;
  role: AdminRole;
  status: "active" | "disabled";
  /** Bumped when the password changes or the account is disabled, so older tokens stop working. */
  tokenVersion: number;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ADMIN_ROLES, default: "support" },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
