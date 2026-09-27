import crypto from "node:crypto";
import { Router } from "express";
import type { FilterQuery } from "mongoose";
import { z } from "zod";
import {
  Feedback,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  MAX_POST_IMAGES,
  type IFeedback,
} from "../../../models/Feedback.js";
import { FeedbackReply } from "../../../models/FeedbackReply.js";
import {
  cloudinary,
  configureCloudinary,
  destroyImages,
  imageDataUrlProblem,
  isOwnImageUrl,
} from "../../../shared/cloudinary.js";
import { AppError } from "../../../shared/errors.js";
import { authorsFor, toAdminFeedback, toAdminReply } from "../../feedback/feedbackView.js";
import { videoList } from "../../feedback/feedbackRoutes.js";
import { requirePerm } from "../adminAuth.js";
import { ah, audit, currentAdmin, idParam, idsBody, parseBody, parsePaging, queryString, searchRegex } from "../helpers.js";

const fields = {
  category: z.enum(FEEDBACK_CATEGORIES),
  body: z.string().trim().min(1).max(1000),
  status: z.enum(FEEDBACK_STATUSES),
  pinned: z.boolean(),
  hidden: z.boolean(),
  adminReply: z.string().trim().max(1000),
  images: z.array(z.string().max(500)).max(MAX_POST_IMAGES),
  videos: videoList,
};

/** Pictures the team uploads from the admin area live here, apart from learners' folders. */
const TEAM_FOLDER = "feedback/team";
/** Same cap as learner uploads; the admin UI shrinks pictures the same way. */
const MAX_UPLOAD_BYTES = 700 * 1024;

/** A post may keep the pictures it has and gain team uploads, nothing else. */
function assertAllowedImages(images: string[], existing: string[] = []): void {
  if (images.some((url) => !existing.includes(url) && !isOwnImageUrl(url, TEAM_FOLDER))) {
    throw new AppError("VALIDATION_ERROR", "images: unknown picture", 400);
  }
}

const createBody = z.object(fields).partial().required({ body: true });
const updateBody = z.object(fields).partial();

function snippet(body: string): string {
  return body.length > 60 ? `${body.slice(0, 60)}…` : body;
}

/** Deletes posts with their replies, then their pictures; returns how many posts went. */
async function removePosts(ids: string[]): Promise<number> {
  const [posts, replies] = await Promise.all([
    Feedback.find({ _id: { $in: ids } }, { images: 1 }).lean(),
    FeedbackReply.find({ feedbackId: { $in: ids } }, { images: 1 }).lean(),
  ]);
  const result = await Feedback.deleteMany({ _id: { $in: ids } });
  await FeedbackReply.deleteMany({ feedbackId: { $in: ids } });
  void destroyImages([...posts.flatMap((p) => p.images ?? []), ...replies.flatMap((r) => r.images ?? [])]);
  return result.deletedCount;
}

export function createFeedbackAdminRouter(): Router {
  const r = Router();
  const read = requirePerm("feedback", "read");
  const write = requirePerm("feedback", "write");

  r.get(
    "/",
    read,
    ah(async (req, res) => {
      const { page, limit, skip } = parsePaging(req);
      const q = queryString(req, "q");
      const status = queryString(req, "status");
      const category = queryString(req, "category");
      const visibility = queryString(req, "visibility");

      const filter: FilterQuery<IFeedback> = {};
      if ((FEEDBACK_STATUSES as readonly string[]).includes(status)) filter.status = status;
      if ((FEEDBACK_CATEGORIES as readonly string[]).includes(category)) filter.category = category;
      if (visibility === "hidden") filter.hidden = true;
      if (visibility === "visible") filter.hidden = false;
      if (visibility === "pinned") filter.pinned = true;
      if (q) {
        const rx = searchRegex(q);
        filter.$or = [{ body: rx }, { adminReply: rx }];
      }

      const [docs, total, summary] = await Promise.all([
        Feedback.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Feedback.countDocuments(filter),
        Feedback.aggregate<{ total: number; open: number; unanswered: number; hidden: number }>([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
              unanswered: { $sum: { $cond: [{ $and: [{ $eq: ["$adminReply", ""] }, { $ne: ["$userId", null] }] }, 1, 0] } },
              hidden: { $sum: { $cond: ["$hidden", 1, 0] } },
            },
          },
        ]),
      ]);
      const authors = await authorsFor(docs);
      res.json({
        items: docs.map((d) => toAdminFeedback(d, authors)),
        total,
        page,
        limit,
        summary: summary[0] ?? { total: 0, open: 0, unanswered: 0, hidden: 0 },
      });
    }),
  );

  r.post(
    "/images",
    write,
    ah(async (req, res) => {
      const image = typeof req.body?.image === "string" ? req.body.image : "";
      const problem = imageDataUrlProblem(image, MAX_UPLOAD_BYTES);
      if (problem) throw new AppError("VALIDATION_ERROR", `image: ${problem}`, 400);
      if (!configureCloudinary()) throw new AppError("UPLOAD_UNAVAILABLE", "Image upload is not available", 503);
      const result = await cloudinary.uploader.upload(image, {
        folder: TEAM_FOLDER,
        public_id: crypto.randomBytes(9).toString("hex"),
        resource_type: "image",
      });
      res.status(201).json({ url: result.secure_url });
    }),
  );

  r.post(
    "/",
    write,
    ah(async (req, res) => {
      const body = parseBody(createBody, req.body);
      if (body.images) assertAllowedImages(body.images);
      const me = currentAdmin(res);
      const doc = await Feedback.create({
        ...body,
        userId: null,
        adminUsername: me.username,
        repliedAt: body.adminReply ? new Date() : null,
      });
      await audit(req, me, "feedback_create", snippet(doc.body));
      res.status(201).json({ item: toAdminFeedback(doc, new Map()) });
    }),
  );

  r.patch(
    "/:id",
    write,
    ah(async (req, res) => {
      const id = idParam(req);
      const body = parseBody(updateBody, req.body);
      const doc = await Feedback.findById(id);
      if (!doc) throw new AppError("NOT_FOUND", "Feedback not found", 404);
      if (body.images) assertAllowedImages(body.images, doc.images);
      const removedImages = body.images ? doc.images.filter((url) => !body.images!.includes(url)) : [];

      if (body.adminReply !== undefined && body.adminReply !== doc.adminReply) {
        doc.repliedAt = body.adminReply ? new Date() : null;
      }
      Object.assign(doc, body);
      await doc.save();
      void destroyImages(removedImages);

      await audit(req, currentAdmin(res), "feedback_update", snippet(doc.body), Object.keys(body).join(", "));
      res.json({ item: toAdminFeedback(doc, await authorsFor([doc])) });
    }),
  );

  r.get(
    "/:id/replies",
    read,
    ah(async (req, res) => {
      const docs = await FeedbackReply.find({ feedbackId: idParam(req) }).sort({ createdAt: 1 }).limit(500).lean();
      const authors = await authorsFor(docs);
      res.json({ items: docs.map((d) => toAdminReply(d, authors)) });
    }),
  );

  r.delete(
    "/replies/:id",
    write,
    ah(async (req, res) => {
      const reply = await FeedbackReply.findByIdAndDelete(idParam(req));
      if (!reply) throw new AppError("NOT_FOUND", "Reply not found", 404);
      await Feedback.updateOne({ _id: reply.feedbackId, replyCount: { $gt: 0 } }, { $inc: { replyCount: -1 } });
      void destroyImages(reply.images);
      await audit(req, currentAdmin(res), "feedback_reply_delete", snippet(reply.body || "(ảnh)"));
      res.json({ deleted: 1 });
    }),
  );

  r.delete(
    "/:id",
    write,
    ah(async (req, res) => {
      const id = idParam(req);
      const doc = await Feedback.findById(id, { body: 1 }).lean();
      if (!doc) throw new AppError("NOT_FOUND", "Feedback not found", 404);
      await removePosts([id]);
      await audit(req, currentAdmin(res), "feedback_delete", snippet(doc.body));
      res.json({ deleted: 1 });
    }),
  );

  r.post(
    "/bulk-delete",
    write,
    ah(async (req, res) => {
      const { ids } = parseBody(idsBody, req.body);
      const deleted = await removePosts(ids);
      await audit(req, currentAdmin(res), "feedback_bulk_delete", `${deleted} feedback`);
      res.json({ deleted });
    }),
  );

  return r;
}
