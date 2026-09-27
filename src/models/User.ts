import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  googleId?: string;
  email: string;
  displayName: string;
  avatar?: string;
  authProvider: "local" | "google";
  password?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  /** A locked account can't sign in; set from the admin area. */
  status: "active" | "locked";
  /** Plan code ("free" or a Plan's code); set from the admin area. */
  plan: string;
  premiumUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    password: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "locked"],
      default: "active",
    },
    plan: {
      type: String,
      default: "free",
    },
    premiumUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", userSchema);
