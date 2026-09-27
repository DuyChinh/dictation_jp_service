import mongoose, { Document, Schema } from "mongoose";
import { reactionSchema, type IReaction } from "./Feedback.js";

/**
 * A learner's reply under a feedback post. Two levels, like Facebook: a reply to the post, or
 * (with parentId) a reply under one of those; answering a nested reply stays under the same parent.
 */
export interface IFeedbackReply extends Document {
  feedbackId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
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
    parentId: { type: Schema.Types.ObjectId, ref: "FeedbackReply", default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, default: "", maxlength: 1000 },
    images: { type: [String], default: [] },
    reactions: { type: [reactionSchema], default: [] },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

feedbackReplySchema.index({ feedbackId: 1, createdAt: 1 });

/**
 * Deletes a reply and, for a top-level one, the replies under it.
 * Returns the removed documents so callers can fix counts and clean up pictures.
 */
export async function deleteReplyTree(reply: IFeedbackReply): Promise<Array<Pick<IFeedbackReply, "images">>> {
  const children = reply.parentId
    ? []
    : await FeedbackReply.find({ parentId: reply._id }, { images: 1 }).lean();
  await FeedbackReply.deleteMany({ _id: { $in: [reply._id, ...children.map((c) => c._id)] } });
  return [reply, ...children];
}

export const FeedbackReply = mongoose.model<IFeedbackReply>("FeedbackReply", feedbackReplySchema);
