import mongoose, { Document, Schema } from "mongoose";

export const FEEDBACK_CATEGORIES = ["idea", "bug", "content", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

/** Where the team is with it; shown on the public board so people see their ideas land. */
export const FEEDBACK_STATUSES = ["open", "planned", "done"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/** Emotions people can leave on a post or reply; one per person, like on a social feed. */
export const REACTIONS = ["❤️", "😂", "😮", "😢", "🎉", "🔥"] as const;
export type Reaction = (typeof REACTIONS)[number];

export const MAX_POST_IMAGES = 4;
export const MAX_REPLY_IMAGES = 2;

export interface IReaction {
  userId: mongoose.Types.ObjectId;
  emoji: Reaction;
}

export const reactionSchema = new Schema<IReaction>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    emoji: { type: String, enum: REACTIONS, required: true },
  },
  { _id: false },
);

/** A comment on the public feedback board, from a learner or (userId null) from the team. */
export interface IFeedback extends Document {
  userId: mongoose.Types.ObjectId | null;
  /** Set on posts the team writes from the admin area. */
  adminUsername: string;
  category: FeedbackCategory;
  body: string;
  /** Cloudinary URLs of attached pictures. */
  images: string[];
  status: FeedbackStatus;
  pinned: boolean;
  /** Hidden posts stay in the admin area but leave the public board. */
  hidden: boolean;
  adminReply: string;
  repliedAt: Date | null;
  /** When the author last changed their own post. */
  editedAt: Date | null;
  likedBy: mongoose.Types.ObjectId[];
  likeCount: number;
  reactions: IReaction[];
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    adminUsername: { type: String, default: "" },
    category: { type: String, enum: FEEDBACK_CATEGORIES, default: "idea" },
    body: { type: String, required: true, maxlength: 1000 },
    images: { type: [String], default: [] },
    status: { type: String, enum: FEEDBACK_STATUSES, default: "open" },
    pinned: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    adminReply: { type: String, default: "", maxlength: 1000 },
    repliedAt: { type: Date, default: null },
    editedAt: { type: Date, default: null },
    likedBy: { type: [Schema.Types.ObjectId], default: [] },
    // Kept beside likedBy so the board can sort by it.
    likeCount: { type: Number, default: 0 },
    reactions: { type: [reactionSchema], default: [] },
    replyCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

feedbackSchema.index({ hidden: 1, pinned: -1, createdAt: -1 });
feedbackSchema.index({ hidden: 1, pinned: -1, likeCount: -1, createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>("Feedback", feedbackSchema);
