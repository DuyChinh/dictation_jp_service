import { Router } from "express";
import type { FilterQuery, Types } from "mongoose";
import { z } from "zod";
import { History } from "../../../models/History.js";
import { LessonActivity } from "../../../models/LessonActivity.js";
import { ListeningAnswer } from "../../../models/ListeningAnswer.js";
import { Payment } from "../../../models/Payment.js";
import { Progress } from "../../../models/Progress.js";
import { User, type IUser } from "../../../models/User.js";
import { AppError } from "../../../shared/errors.js";
import type { StaticContentRepository } from "../../content/StaticContentRepository.js";
import { computeCounts } from "../../content/contentMappers.js";
import { requirePerm } from "../adminAuth.js";
import {
  ah,
  idParam,
  audit,
  currentAdmin,
  idsBody,
  parseBody,
  parsePaging,
  queryString,
  rethrowDuplicate,
  searchRegex,
} from "../helpers.js";
import { canAccess } from "../permissions.js";

type UserDoc = Pick<
  IUser,
  "email" | "displayName" | "avatar" | "authProvider" | "plan" | "premiumUntil" | "status" | "createdAt"
> & { _id: Types.ObjectId };

type Activity = { lessons: number; last: Date | null };

function toUserRow(u: UserDoc, act?: Activity) {
  return {
    id: String(u._id),
    email: u.email,
    displayName: u.displayName,
    avatar: u.avatar ?? null,
    authProvider: u.authProvider ?? "local",
    // Accounts made before the admin area have neither field.
    plan: u.plan || "free",
    premiumUntil: u.premiumUntil ?? null,
    status: u.status ?? "active",
    createdAt: u.createdAt,
    lessonsPracticed: act?.lessons ?? 0,
    lastActiveAt: act?.last ?? null,
  };
}

async function activityFor(ids: Types.ObjectId[]): Promise<Map<string, Activity>> {
  const rows = await LessonActivity.aggregate<{ _id: Types.ObjectId; lessons: number; last: Date }>([
    { $match: { userId: { $in: ids } } },
    { $group: { _id: "$userId", lessons: { $sum: 1 }, last: { $max: "$lastActiveAt" } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), { lessons: r.lessons, last: r.last }]));
}

/** Deletes the accounts and everything they practised. Payments stay for the books. */
async function deleteUsers(ids: string[]): Promise<number> {
  const { deletedCount } = await User.deleteMany({ _id: { $in: ids } });
  const byUser = { userId: { $in: ids } };
  await Promise.all([
    Progress.deleteMany(byUser),
    History.deleteMany(byUser),
    ListeningAnswer.deleteMany(byUser),
    LessonActivity.deleteMany(byUser),
  ]);
  return deletedCount;
}

const updateBody = z
  .object({
    displayName: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(200),
    plan: z.string().trim().toLowerCase().min(1).max(50),
    premiumUntil: z.string().datetime({ offset: true }).nullable(),
    status: z.enum(["active", "locked"]),
  })
  .partial();

export function createUsersAdminRouter(repo: StaticContentRepository): Router {
  const r = Router();

  r.get(
    "/",
    requirePerm("users", "read"),
    ah(async (req, res) => {
      const { page, limit, skip } = parsePaging(req);
      const q = queryString(req, "q");
      const provider = queryString(req, "provider");
      const plan = queryString(req, "plan");
      const status = queryString(req, "status");

      const filter: FilterQuery<IUser> = {};
      if (q) filter.$or = [{ email: searchRegex(q) }, { displayName: searchRegex(q) }];
      if (provider === "local" || provider === "google") filter.authProvider = provider;
      if (plan === "free") filter.plan = { $in: ["free", null, ""] };
      else if (plan === "paid") filter.plan = { $nin: ["free", null, ""] };
      else if (plan) filter.plan = plan;
      if (status === "active") filter.status = { $in: ["active", null] };
      else if (status === "locked") filter.status = "locked";

      const [items, total, all, paid, locked] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<UserDoc[]>(),
        User.countDocuments(filter),
        User.estimatedDocumentCount(),
        User.countDocuments({ plan: { $nin: ["free", null, ""] } }),
        User.countDocuments({ status: "locked" }),
      ]);
      const act = await activityFor(items.map((u) => u._id));
      res.json({
        items: items.map((u) => toUserRow(u, act.get(String(u._id)))),
        total,
        page,
        limit,
        summary: { total: all, paid, locked },
      });
    }),
  );

  r.get(
    "/:id",
    requirePerm("users", "read"),
    ah(async (req, res) => {
      const id = idParam(req);
      const user = await User.findById(id).lean<UserDoc>();
      if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
      const userId = user._id;

      const [act, sessions, attempted, correct, listeningTotal, listeningCorrect, perLesson] = await Promise.all([
        activityFor([userId]),
        History.countDocuments({ userId }),
        Progress.countDocuments({ userId }),
        Progress.countDocuments({ userId, status: "correct" }),
        ListeningAnswer.countDocuments({ userId }),
        ListeningAnswer.countDocuments({ userId, correct: true }),
        Progress.aggregate<{ _id: string; correct: number; attempted: number; last: Date }>([
          { $match: { userId } },
          {
            $group: {
              _id: "$lessonId",
              correct: { $sum: { $cond: [{ $eq: ["$status", "correct"] }, 1, 0] } },
              attempted: { $sum: 1 },
              last: { $max: "$updatedAt" },
            },
          },
          { $sort: { last: -1 } },
          { $limit: 10 },
        ]),
      ]);

      const payments = canAccess(currentAdmin(res).role, "payments", "read")
        ? await Payment.find({ userId }).sort({ createdAt: -1 }).limit(5).lean()
        : [];

      res.json({
        user: toUserRow(user, act.get(String(userId))),
        stats: { sessions, attempted, correct, listeningTotal, listeningCorrect },
        lessons: perLesson.map((l) => {
          const meta = repo.get(l._id);
          const total = meta ? computeCounts(meta.package).dictation_segments : 0;
          return {
            lessonId: l._id,
            title: meta?.package.title ?? null,
            correct: l.correct,
            attempted: l.attempted,
            total,
            lastAt: l.last,
          };
        }),
        payments: payments.map((p) => ({
          id: String(p._id),
          code: p.code,
          plan: p.plan,
          amount: p.amount,
          status: p.status,
          createdAt: p.createdAt,
        })),
      });
    }),
  );

  r.patch(
    "/:id",
    requirePerm("users", "write"),
    ah(async (req, res) => {
      const id = idParam(req);
      const body = parseBody(updateBody, req.body);
      const update: Record<string, unknown> = { ...body };
      if (body.premiumUntil !== undefined) {
        update.premiumUntil = body.premiumUntil ? new Date(body.premiumUntil) : null;
      }
      let user: UserDoc | null;
      try {
        user = await User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean<UserDoc>();
      } catch (err) {
        rethrowDuplicate(err, "Another account already uses this email");
      }
      if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
      await audit(req, currentAdmin(res), "user_update", user.email, Object.keys(body).join(", "));
      const act = await activityFor([user._id]);
      res.json({ user: toUserRow(user, act.get(String(user._id))) });
    }),
  );

  r.delete(
    "/:id",
    requirePerm("users", "write"),
    ah(async (req, res) => {
      const id = idParam(req);
      const user = await User.findById(id, { email: 1 }).lean();
      if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
      await deleteUsers([id]);
      await audit(req, currentAdmin(res), "user_delete", user.email);
      res.json({ deleted: 1 });
    }),
  );

  r.post(
    "/bulk-delete",
    requirePerm("users", "write"),
    ah(async (req, res) => {
      const { ids } = parseBody(idsBody, req.body);
      const emails = (await User.find({ _id: { $in: ids } }, { email: 1 }).lean()).map((u) => u.email);
      const deleted = await deleteUsers(ids);
      await audit(req, currentAdmin(res), "user_bulk_delete", `${deleted} users`, emails.join(", "));
      res.json({ deleted });
    }),
  );

  return r;
}
