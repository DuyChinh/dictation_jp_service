import type { Types } from "mongoose";
import { User } from "../../models/User.js";
import { REACTIONS, type IFeedback, type IReaction } from "../../models/Feedback.js";
import type { IFeedbackReply } from "../../models/FeedbackReply.js";

type FeedbackDoc = Pick<
  IFeedback,
  | "userId"
  | "adminUsername"
  | "category"
  | "body"
  | "images"
  | "status"
  | "pinned"
  | "hidden"
  | "adminReply"
  | "repliedAt"
  | "editedAt"
  | "likedBy"
  | "likeCount"
  | "reactions"
  | "replyCount"
  | "createdAt"
  | "updatedAt"
> & { _id: Types.ObjectId };

type ReplyDoc = Pick<
  IFeedbackReply,
  "feedbackId" | "userId" | "body" | "images" | "reactions" | "editedAt" | "createdAt"
> & { _id: Types.ObjectId };

type Author = { displayName: string; avatar: string | null; email: string };

/** Current name and avatar of each author, so renames show on old posts too. */
export async function authorsFor(docs: Array<{ userId: Types.ObjectId | null }>): Promise<Map<string, Author>> {
  const ids = [...new Set(docs.map((d) => d.userId && String(d.userId)).filter(Boolean))] as string[];
  if (!ids.length) return new Map();
  const users = await User.find({ _id: { $in: ids } }, { displayName: 1, avatar: 1, email: 1 }).lean();
  return new Map(
    users.map((u) => [String(u._id), { displayName: u.displayName, avatar: u.avatar ?? null, email: u.email }]),
  );
}

/** Counts per emoji in the fixed order, plus the viewer's own pick. */
export function reactionSummary(reactions: IReaction[] | undefined, viewerId: string | null) {
  const list = reactions ?? [];
  const counts = REACTIONS.map((emoji) => ({ emoji, count: list.filter((r) => r.emoji === emoji).length })).filter(
    (r) => r.count > 0,
  );
  const mine = viewerId ? (list.find((r) => String(r.userId) === viewerId)?.emoji ?? null) : null;
  return { reactions: counts, myReaction: mine };
}

function publicAuthor(userId: Types.ObjectId | null, authors: Map<string, Author>) {
  if (!userId) return { kind: "team" as const, name: "", avatar: null };
  const author = authors.get(String(userId));
  return { kind: "user" as const, name: author?.displayName ?? "", avatar: author?.avatar ?? null };
}

/** A post as the public board shows it: no emails, and whether the viewer liked or wrote it. */
export function toPublicFeedback(doc: FeedbackDoc, authors: Map<string, Author>, viewerId: string | null) {
  return {
    id: String(doc._id),
    author: publicAuthor(doc.userId, authors),
    category: doc.category,
    body: doc.body,
    images: doc.images ?? [],
    status: doc.status,
    pinned: doc.pinned,
    adminReply: doc.adminReply || null,
    repliedAt: doc.repliedAt ?? null,
    editedAt: doc.editedAt ?? null,
    likes: doc.likeCount,
    liked: viewerId ? doc.likedBy.some((id) => String(id) === viewerId) : false,
    ...reactionSummary(doc.reactions, viewerId),
    replyCount: doc.replyCount ?? 0,
    mine: viewerId !== null && doc.userId !== null && String(doc.userId) === viewerId,
    createdAt: doc.createdAt,
  };
}

export function toPublicReply(doc: ReplyDoc, authors: Map<string, Author>, viewerId: string | null) {
  return {
    id: String(doc._id),
    feedbackId: String(doc.feedbackId),
    author: publicAuthor(doc.userId, authors),
    body: doc.body,
    images: doc.images ?? [],
    editedAt: doc.editedAt ?? null,
    ...reactionSummary(doc.reactions, viewerId),
    mine: viewerId !== null && String(doc.userId) === viewerId,
    createdAt: doc.createdAt,
  };
}

/** Most names a hover list shows; the rest are counted. */
const REACTOR_LIMIT = 30;

/** Who left which emotion, in emoji order, newest name lookups included. */
export async function reactorsOf(reactions: IReaction[] | undefined, viewerId: string | null) {
  const list = [...(reactions ?? [])].sort(
    (a, b) => REACTIONS.indexOf(a.emoji) - REACTIONS.indexOf(b.emoji),
  );
  const shown = list.slice(0, REACTOR_LIMIT);
  const authors = await authorsFor(shown);
  return {
    items: shown.map((r) => ({
      emoji: r.emoji,
      name: authors.get(String(r.userId))?.displayName ?? "",
      you: viewerId !== null && String(r.userId) === viewerId,
    })),
    total: list.length,
  };
}

/** A post as the admin area shows it, with the author's email. */
export function toAdminFeedback(doc: FeedbackDoc, authors: Map<string, Author>) {
  const author = doc.userId ? authors.get(String(doc.userId)) : undefined;
  return {
    id: String(doc._id),
    userId: doc.userId ? String(doc.userId) : null,
    authorName: doc.userId ? (author?.displayName ?? "") : doc.adminUsername,
    authorEmail: author?.email ?? "",
    authorAvatar: author?.avatar ?? null,
    fromTeam: !doc.userId,
    category: doc.category,
    body: doc.body,
    images: doc.images ?? [],
    status: doc.status,
    pinned: doc.pinned,
    hidden: doc.hidden,
    adminReply: doc.adminReply,
    repliedAt: doc.repliedAt ?? null,
    likes: doc.likeCount,
    reactions: reactionSummary(doc.reactions, null).reactions,
    replyCount: doc.replyCount ?? 0,
    editedAt: doc.editedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function toAdminReply(doc: ReplyDoc, authors: Map<string, Author>) {
  const author = authors.get(String(doc.userId));
  return {
    id: String(doc._id),
    authorName: author?.displayName ?? "",
    authorEmail: author?.email ?? "",
    authorAvatar: author?.avatar ?? null,
    body: doc.body,
    images: doc.images ?? [],
    reactions: reactionSummary(doc.reactions, null).reactions,
    editedAt: doc.editedAt ?? null,
    createdAt: doc.createdAt,
  };
}
