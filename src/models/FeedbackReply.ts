import mongoose, { Document, Schema } from "mongoose";
import { reactionSchema, type IReaction } from "./Feedback.js";

/** A learner's reply under a feedback post. Replies are one level deep; "@name" answers a reply. */
export interface IFeedbackReply extends Document {
  feedbackId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  body: string;
  images: string[];
  reactions: IReaction[];
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackReplySchema = new Schema<IFeedbackReply>(
  {
    feedbackId: { type: Schema.Types.ObjectId, ref: "Feedback", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, default: "", maxlength: 1000 },
    images: { type: [String], default: [] },
    reactions: { type: [reactionSchema], default: [] },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

feedbackReplySchema.index({ feedbackId: 1, createdAt: 1 });

export const FeedbackReply = mongoose.model<IFeedbackReply>("FeedbackReply", feedbackReplySchema);
