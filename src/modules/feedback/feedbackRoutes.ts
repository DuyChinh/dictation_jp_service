import crypto from "node:crypto";
import { Router } from "express";
import type { FilterQuery, Types } from "mongoose";
import { z } from "zod";
import {
  Feedback,
  FEEDBACK_CATEGORIES,
  MAX_POST_IMAGES,
  MAX_POST_VIDEOS,
  MAX_REPLY_IMAGES,
  REACTIONS,
  type IFeedback,
  type IReaction,
} from "../../models/Feedback.js";
import { FeedbackReply } from "../../models/FeedbackReply.js";
import { AppError } from "../../shared/errors.js";
import {
  cloudinary,
  configureCloudinary,
  destroyImages,
  imageDataUrlProblem,
  isOwnImageUrl,
} from "../../shared/cloudinary.js";
import { optionalAuth, requireAuth } from "../../shared/middleware/auth.js";
import { isValidVideo, VIDEO_PROVIDERS } from "../../shared/videoLinks.js";
import { ah, idParam, parseBody, parsePaging } from "../admin/helpers.js";
import { authorsFor, reactorsOf, toPublicFeedback, toPublicReply } from "./feedbackView.js";

/** Per account, per hour: enough for real use, too few for a flood. */
const HOURLY_POSTS = 5;
const HOURLY_REPLIES = 30;
const HOURLY_UPLOADS = 30;
/** The client shrinks pictures before sending; anything bigger than this wasn't. */
const MAX_UPLOAD_BYTES = 700 * 1024;

const imageList = (max: number) => z.array(z.string().max(500)).max(max).default([]);

export const videoList = z
  .array(z.object({ provider: z.enum(VIDEO_PROVIDERS), id: z.string().max(120) }).refine(isValidVideo, "bad video"))
  .max(MAX_POST_VIDEOS);

const createBody = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  body: z.string().trim().min(5).max(1000),
  images: imageList(MAX_POST_IMAGES),
  videos: videoList.default([]),
});

const updateBody = z.object({
  category: z.enum(FEEDBACK_CATEGORIES).optional(),
  body: z.string().trim().min(5).max(1000).optional(),
  images: z.array(z.string().max(500)).max(MAX_POST_IMAGES).optional(),
  videos: videoList.optional(),
});

const replyBody = z.object({
  body: z.string().trim().max(1000).default(""),
  images: imageList(MAX_REPLY_IMAGES),
});

const reactBody = z.object({ emoji: z.enum(REACTIONS) });

function userFolder(userId: Types.ObjectId | string): string {
  return `feedback/${userId}`;
}

/** Only pictures this user uploaded through /images may be attached. */
function assertOwnImages(images: string[], userId: Types.ObjectId): void {
  if (images.some((url) => !isOwnImageUrl(url, userFolder(userId)))) {
    throw new AppError("VALIDATION_ERROR", "images: unknown picture", 400);
  }
}

/** One reaction per person: the same emoji again takes it back, another one replaces it. */
function toggleReaction(list: IReaction[], userId: Types.ObjectId, emoji: IReaction["emoji"]): IReaction[] {
  const current = list.find((r) => String(r.userId) === String(userId));
  const rest = list.filter((r) => String(r.userId) !== String(userId));
  return current?.emoji === emoji ? rest : [...rest, { userId, emoji }];
}

/** Sliding one-hour window of upload times per user; resets with the process, which is fine for a cap. */
const uploads = new Map<string, number[]>();

function takeUploadSlot(userId: string): boolean {
  const since = Date.now() - 3600_000;
  const recent = (uploads.get(userId) ?? []).filter((t) => t > since);
  if (recent.length >= HOURLY_UPLOADS) {
    uploads.set(userId, recent);
    return false;
  }
  recent.push(Date.now());
  uploads.set(userId, recent);
  return true;
}

async function visiblePost(id: string) {
  const post = await Feedback.findOne({ _id: id, hidden: false });
  if (!post) throw new AppError("NOT_FOUND", "Feedback not found", 404);
  return post;
}

export function createFeedbackRouter(): Router {
  const r = Router();

  r.get(
    "/",
    optionalAuth,
    ah(async (req, res) => {
      const { page, limit, skip } = parsePaging(req);
      const sort = req.query.sort === "top" ? "top" : "new";
      const category = typeof req.query.category === "string" ? req.query.category : "";
      const filter: FilterQuery<IFeedback> = { hidden: false };
      if ((FEEDBACK_CATEGORIES as readonly string[]).includes(category)) filter.category = category;

      const order: Record<string, 1 | -1> =
        sort === "top" ? { pinned: -1, likeCount: -1, createdAt: -1 } : { pinned: -1, createdAt: -1 };
      const [docs, total, stats] = await Promise.all([
        Feedback.find(filter).sort(order).skip(skip).limit(limit).lean(),
        Feedback.countDocuments(filter),
        Feedback.aggregate<{ _id: string; n: number }>([
          { $match: { hidden: false } },
          { $group: { _id: "$status", n: { $sum: 1 } } },
        ]),
      ]);
      const authors = await authorsFor(docs);
      const viewerId = req.user ? String(req.user._id) : null;
      const byStatus = Object.fromEntries(stats.map((s) => [s._id, s.n]));

      res.json({
        items: docs.map((d) => toPublicFeedback(d, authors, viewerId)),
        total,
        page,
        limit,
        stats: {
          total: stats.reduce((sum, s) => sum + s.n, 0),
          planned: byStatus.planned ?? 0,
          done: byStatus.done ?? 0,
        },
      });
    }),
  );

  r.post(
    "/images",
    requireAuth,
    ah(async (req, res) => {
      const user = req.user!;
      const image = typeof req.body?.image === "string" ? req.body.image : "";
      const problem = imageDataUrlProblem(image, MAX_UPLOAD_BYTES);
      if (problem) throw new AppError("VALIDATION_ERROR", `image: ${problem}`, 400);
      if (!configureCloudinary()) throw new AppError("UPLOAD_UNAVAILABLE", "Image upload is not available", 503);
      if (!takeUploadSlot(String(user._id))) throw new AppError("RATE_LIMITED", "Too many uploads, try again later", 429);

      const result = await cloudinary.uploader.upload(image, {
        folder: userFolder(user._id),
        public_id: crypto.randomBytes(9).toString("hex"),
        resource_type: "image",
      });
      res.status(201).json({ url: result.secure_url, width: result.width, height: result.height });
    }),
  );

  r.post(
    "/",
    requireAuth,
    ah(async (req, res) => {
      const body = parseBody(createBody, req.body);
      const user = req.user!;
      assertOwnImages(body.images, user._id);
      const recent = await Feedback.countDocuments({
        userId: user._id,
        createdAt: { $gt: new Date(Date.now() - 3600_000) },
      });
      if (recent >= HOURLY_POSTS) {
        throw new AppError("RATE_LIMITED", "Too many posts, try again later", 429);
      }
      const doc = await Feedback.create({
        userId: user._id,
        category: body.category,
        body: body.body,
        images: body.images,
        videos: body.videos,
      });
      const authors = await authorsFor([doc]);
      res.status(201).json({ item: toPublicFeedback(doc, authors, String(user._id)) });
    }),
  );

  r.post(
    "/:id/like",
    requireAuth,
    ah(async (req, res) => {
      const id = idParam(req);
      const userId = req.user!._id;
      // Two updates guarded on membership, so double clicks can't count twice.
      let doc = await Feedback.findOneAndUpdate(
        { _id: id, hidden: false, likedBy: { $ne: userId } },
        { $push: { likedBy: userId }, $inc: { likeCount: 1 } },
        { new: true },
      );
      if (!doc) {
        doc = await Feedback.findOneAndUpdate(
          { _id: id, hidden: false, likedBy: userId },
          { $pull: { likedBy: userId }, $inc: { likeCount: -1 } },
          { new: true },
        );
      }
      if (!doc) throw new AppError("NOT_FOUND", "Feedback not found", 404);
      res.json({ likes: doc.likeCount, liked: doc.likedBy.some((u) => String(u) === String(userId)) });
    }),
  );

  r.post(
    "/:id/react",
    requireAuth,
    ah(async (req, res) => {
      const { emoji } = parseBody(reactBody, req.body);
      const user = req.user!;
      const post = await visiblePost(idParam(req));
      post.reactions = toggleReaction(post.reactions, user._id, emoji);
      await post.save();
      const view = toPublicFeedback(post, new Map(), String(user._id));
      res.json({ reactions: view.reactions, myReaction: view.myReaction });
    }),
  );

  r.get(
    "/:id/reactions",
    optionalAuth,
    ah(async (req, res) => {
      const post = await visiblePost(idParam(req));
      res.json(await reactorsOf(post.reactions, req.user ? String(req.user._id) : null));
    }),
  );

  r.patch(
    "/:id",
    requireAuth,
    ah(async (req, res) => {
      const id = idParam(req);
      const body = parseBody(updateBody, req.body);
      const user = req.user!;
      const doc = await Feedback.findOne({ _id: id, userId: user._id });
      if (!doc) throw new AppError("NOT_FOUND", "Feedback not found", 404);
      if (body.images) assertOwnImages(body.images, user._id);

      const removedImages = body.images ? doc.images.filter((url) => !body.images!.includes(url)) : [];
      const imagesChanged =
        body.images !== undefined &&
        (body.images.length !== doc.images.length || body.images.some((url, i) => url !== doc.images[i]));
      const videoKey = (list: Array<{ provider: string; id: string }>) => list.map((v) => `${v.provider}:${v.id}`).join(",");
      const videosChanged = body.videos !== undefined && videoKey(body.videos) !== videoKey(doc.videos);
      const changed =
        imagesChanged ||
        videosChanged ||
        (body.body !== undefined && body.body !== doc.body) ||
        (body.category !== undefined && body.category !== doc.category);
      if (changed) {
        if (body.body !== undefined) doc.body = body.body;
        if (body.category !== undefined) doc.category = body.category;
        if (body.images !== undefined) doc.images = body.images;
        if (body.videos !== undefined) doc.videos = body.videos;
        doc.editedAt = new Date();
        await doc.save();
        void destroyImages(removedImages);
      }
      const authors = await authorsFor([doc]);
      res.json({ item: toPublicFeedback(doc, authors, String(user._id)) });
    }),
  );

  r.delete(
    "/:id",
    requireAuth,
    ah(async (req, res) => {
      const id = idParam(req);
      const doc = await Feedback.findOneAndDelete({ _id: id, userId: req.user!._id });
      if (!doc) throw new AppError("NOT_FOUND", "Feedback not found", 404);
      const replies = await FeedbackReply.find({ feedbackId: doc._id }, { images: 1 }).lean();
      await FeedbackReply.deleteMany({ feedbackId: doc._id });
      void destroyImages([...doc.images, ...replies.flatMap((rep) => rep.images)]);
      res.json({ deleted: 1 });
    }),
  );

  // ---- Replies ----

  r.get(
    "/:id/replies",
    optionalAuth,
    ah(async (req, res) => {
      const post = await visiblePost(idParam(req));
      const docs = await FeedbackReply.find({ feedbackId: post._id }).sort({ createdAt: 1 }).limit(300).lean();
      const authors = await authorsFor(docs);
      const viewerId = req.user ? String(req.user._id) : null;
      res.json({ items: docs.map((d) => toPublicReply(d, authors, viewerId)) });
    }),
  );

  r.post(
    "/:id/replies",
    requireAuth,
    ah(async (req, res) => {
      const body = parseBody(replyBody, req.body);
      const user = req.user!;
      if (!body.body && body.images.length === 0) {
        throw new AppError("VALIDATION_ERROR", "body: write something or attach a picture", 400);
      }
      assertOwnImages(body.images, user._id);
      const post = await visiblePost(idParam(req));
      const recent = await FeedbackReply.countDocuments({
        userId: user._id,
        createdAt: { $gt: new Date(Date.now() - 3600_000) },
      });
      if (recent >= HOURLY_REPLIES) throw new AppError("RATE_LIMITED", "Too many replies, try again later", 429);

      const reply = await FeedbackReply.create({
        feedbackId: post._id,
        userId: user._id,
        body: body.body,
        images: body.images,
      });
      await Feedback.updateOne({ _id: post._id }, { $inc: { replyCount: 1 } });
      const authors = await authorsFor([reply]);
      res.status(201).json({ item: toPublicReply(reply, authors, String(user._id)) });
    }),
  );

  r.post(
    "/replies/:id/react",
    requireAuth,
    ah(async (req, res) => {
      const { emoji } = parseBody(reactBody, req.body);
      const user = req.user!;
      const reply = await FeedbackReply.findById(idParam(req));
      if (!reply) throw new AppError("NOT_FOUND", "Reply not found", 404);
      await visiblePost(String(reply.feedbackId));
      reply.reactions = toggleReaction(reply.reactions, user._id, emoji);
      await reply.save();
      const view = toPublicReply(reply, new Map(), String(user._id));
      res.json({ reactions: view.reactions, myReaction: view.myReaction });
    }),
  );

  r.get(
    "/replies/:id/reactions",
    optionalAuth,
    ah(async (req, res) => {
      const reply = await FeedbackReply.findById(idParam(req), { feedbackId: 1, reactions: 1 });
      if (!reply) throw new AppError("NOT_FOUND", "Reply not found", 404);
      await visiblePost(String(reply.feedbackId));
      res.json(await reactorsOf(reply.reactions, req.user ? String(req.user._id) : null));
    }),
  );

  r.patch(
    "/replies/:id",
    requireAuth,
    ah(async (req, res) => {
      const body = parseBody(replyBody, req.body);
      const user = req.user!;
      if (!body.body && body.images.length === 0) {
        throw new AppError("VALIDATION_ERROR", "body: write something or attach a picture", 400);
      }
      assertOwnImages(body.images, user._id);
      const reply = await FeedbackReply.findOne({ _id: idParam(req), userId: user._id });
      if (!reply) throw new AppError("NOT_FOUND", "Reply not found", 404);

      const removedImages = reply.images.filter((url) => !body.images.includes(url));
      const changed =
        body.body !== reply.body ||
        body.images.length !== reply.images.length ||
        body.images.some((url, i) => url !== reply.images[i]);
      if (changed) {
        reply.body = body.body;
        reply.images = body.images;
        reply.editedAt = new Date();
        await reply.save();
        void destroyImages(removedImages);
      }
      const authors = await authorsFor([reply]);
      res.json({ item: toPublicReply(reply, authors, String(user._id)) });
    }),
  );

  r.delete(
    "/replies/:id",
    requireAuth,
    ah(async (req, res) => {
      const reply = await FeedbackReply.findOneAndDelete({ _id: idParam(req), userId: req.user!._id });
      if (!reply) throw new AppError("NOT_FOUND", "Reply not found", 404);
      await Feedback.updateOne({ _id: reply.feedbackId, replyCount: { $gt: 0 } }, { $inc: { replyCount: -1 } });
      void destroyImages(reply.images);
      res.json({ deleted: 1 });
    }),
  );

  return r;
}
