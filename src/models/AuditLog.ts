import mongoose, { Document, Schema } from "mongoose";

/** One admin action; written by the admin API, never edited or deleted from it. */
export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId | null;
  adminUsername: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    adminUsername: { type: String, default: "" },
    action: { type: String, required: true },
    target: { type: String, default: "" },
    detail: { type: String, default: "" },
    ip: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Kept 180 days; the same index serves newest-first listing.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
