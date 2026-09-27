import { Router } from "express";
import { z } from "zod";
import { Coupon, type ICoupon } from "../../../models/Coupon.js";
import { Plan, type IPlan } from "../../../models/Plan.js";
import { User } from "../../../models/User.js";
import { AppError } from "../../../shared/errors.js";
import type { NextFunction, Request, Response } from "express";
import { requirePerm } from "../adminAuth.js";
import { ah, idParam, audit, currentAdmin, idsBody, parseBody, rethrowDuplicate } from "../helpers.js";
import { canAccess } from "../permissions.js";

type PlanDoc = IPlan & { _id: unknown };
type CouponDoc = ICoupon & { _id: unknown };

function toPlanRow(p: PlanDoc, users = 0) {
  return {
    id: String(p._id),
    code: p.code,
    name: p.name,
    price: p.price,
    durationDays: p.durationDays,
    features: p.features,
    active: p.active,
    sortOrder: p.sortOrder,
    users,
    createdAt: p.createdAt,
  };
}

function toCouponRow(c: CouponDoc) {
  return {
    id: String(c._id),
    code: c.code,
    description: c.description,
    discountType: c.discountType,
    discountValue: c.discountValue,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    expiresAt: c.expiresAt,
    active: c.active,
    createdAt: c.createdAt,
  };
}

const planFields = z.object({
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,40}$/, "use a-z, 0-9, _ or -"),
  name: z.string().trim().min(1).max(100),
  price: z.number().int().min(0).max(1_000_000_000),
  durationDays: z.number().int().min(0).max(3650),
  features: z.array(z.string().trim().min(1).max(200)).max(20),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
});

const couponFields = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,40}$/, "use A-Z, 0-9, _ or -"),
  description: z.string().trim().max(300),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().min(0).max(1_000_000_000),
  maxUses: z.number().int().min(1).max(1_000_000).nullable(),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  active: z.boolean(),
});

function checkPercent(body: { discountType?: string; discountValue?: number }) {
  if (body.discountType === "percent" && (body.discountValue ?? 0) > 100) {
    throw new AppError("VALIDATION_ERROR", "discountValue: a percentage can't exceed 100", 400);
  }
}

async function usersPerPlan(): Promise<Map<string, number>> {
  const rows = await User.aggregate<{ _id: string | null; n: number }>([{ $group: { _id: "$plan", n: { $sum: 1 } } }]);
  const map = new Map<string, number>();
  for (const r of rows) {
    const code = r._id || "free";
    map.set(code, (map.get(code) ?? 0) + r.n);
  }
  return map;
}

/** Refuses to delete plans someone is still on, naming them. */
async function assertPlansUnused(ids: string[]) {
  const plans = await Plan.find({ _id: { $in: ids } }, { code: 1 }).lean();
  const counts = await usersPerPlan();
  const used = plans.filter((p) => (counts.get(p.code) ?? 0) > 0).map((p) => `${p.code} (${counts.get(p.code)})`);
  if (used.length) {
    throw new AppError("PLAN_IN_USE", `Move users off these plans first: ${used.join(", ")}`, 409);
  }
  return plans.map((p) => p.code);
}

export function createCatalogAdminRouter(): Router {
  const r = Router();
  const read = requirePerm("catalog", "read");
  const write = requirePerm("catalog", "write");

  // ---- Plans ----
  // Anyone who edits users picks a plan for them, so they may list plans too.
  const readPlans = (_req: Request, res: Response, next: NextFunction) => {
    const role = currentAdmin(res).role;
    if (canAccess(role, "catalog", "read") || canAccess(role, "users", "read")) return next();
    return requirePerm("catalog", "read")(_req, res, next);
  };

  r.get(
    "/plans",
    readPlans,
    ah(async (_req, res) => {
      const [plans, counts] = await Promise.all([
        Plan.find().sort({ sortOrder: 1, createdAt: 1 }).lean<PlanDoc[]>(),
        usersPerPlan(),
      ]);
      res.json({ items: plans.map((p) => toPlanRow(p, counts.get(p.code) ?? 0)), freeUsers: counts.get("free") ?? 0 });
    }),
  );

  r.post(
    "/plans",
    write,
    ah(async (req, res) => {
      const body = parseBody(planFields.partial({ features: true, active: true, sortOrder: true }), req.body);
      try {
        const plan = await Plan.create(body);
        await audit(req, currentAdmin(res), "plan_create", plan.code);
        res.status(201).json({ plan: toPlanRow(plan.toObject()) });
      } catch (err) {
        rethrowDuplicate(err, "A plan with this code already exists");
      }
    }),
  );

  r.patch(
    "/plans/:id",
    write,
    ah(async (req, res) => {
      const id = idParam(req);
      // The code is what users point at, so it stays fixed once created.
      const body = parseBody(planFields.omit({ code: true }).partial(), req.body);
      const plan = await Plan.findByIdAndUpdate(id, { $set: body }, { new: true }).lean<PlanDoc>();
      if (!plan) throw new AppError("NOT_FOUND", "Plan not found", 404);
      await audit(req, currentAdmin(res), "plan_update", plan.code, Object.keys(body).join(", "));
      res.json({ plan: toPlanRow(plan) });
    }),
  );

  r.delete(
    "/plans/:id",
    write,
    ah(async (req, res) => {
      const id = idParam(req);
      const [code] = await assertPlansUnused([id]);
      if (!code) throw new AppError("NOT_FOUND", "Plan not found", 404);
      await Plan.deleteOne({ _id: id });
      await audit(req, currentAdmin(res), "plan_delete", code);
      res.json({ deleted: 1 });
    }),
  );

  r.post(
    "/plans/bulk-delete",
    write,
    ah(async (req, res) => {
      const { ids } = parseBody(idsBody, req.body);
      const codes = await assertPlansUnused(ids);
      const { deletedCount } = await Plan.deleteMany({ _id: { $in: ids } });
      await audit(req, currentAdmin(res), "plan_bulk_delete", `${deletedCount} plans`, codes.join(", "));
      res.json({ deleted: deletedCount });
    }),
  );

  // ---- Coupons ----
  r.get(
    "/coupons",
    read,
    ah(async (_req, res) => {
      const coupons = await Coupon.find().sort({ createdAt: -1 }).lean<CouponDoc[]>();
      res.json({ items: coupons.map(toCouponRow) });
    }),
  );

  r.post(
    "/coupons",
    write,
    ah(async (req, res) => {
      const body = parseBody(
        couponFields.partial({ description: true, maxUses: true, expiresAt: true, active: true }),
        req.body,
      );
      checkPercent(body);
      try {
        const coupon = await Coupon.create({ ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null });
        await audit(req, currentAdmin(res), "coupon_create", coupon.code);
        res.status(201).json({ coupon: toCouponRow(coupon.toObject()) });
      } catch (err) {
        rethrowDuplicate(err, "A coupon with this code already exists");
      }
    }),
  );

  r.patch(
    "/coupons/:id",
    write,
    ah(async (req, res) => {
      const id = idParam(req);
      const body = parseBody(couponFields.partial(), req.body);
      const coupon = await Coupon.findById(id);
      if (!coupon) throw new AppError("NOT_FOUND", "Coupon not found", 404);
      checkPercent({ discountType: body.discountType ?? coupon.discountType, discountValue: body.discountValue ?? coupon.discountValue });
      const { expiresAt, ...rest } = body;
      coupon.set(rest);
      if (expiresAt !== undefined) coupon.expiresAt = expiresAt ? new Date(expiresAt) : null;
      try {
        await coupon.save();
      } catch (err) {
        rethrowDuplicate(err, "A coupon with this code already exists");
      }
      await audit(req, currentAdmin(res), "coupon_update", coupon.code, Object.keys(body).join(", "));
      res.json({ coupon: toCouponRow(coupon.toObject()) });
    }),
  );

  r.delete(
    "/coupons/:id",
    write,
    ah(async (req, res) => {
      const id = idParam(req);
      const coupon = await Coupon.findByIdAndDelete(id).lean();
      if (!coupon) throw new AppError("NOT_FOUND", "Coupon not found", 404);
      await audit(req, currentAdmin(res), "coupon_delete", coupon.code);
      res.json({ deleted: 1 });
    }),
  );

  r.post(
    "/coupons/bulk-delete",
    write,
    ah(async (req, res) => {
      const { ids } = parseBody(idsBody, req.body);
      const codes = (await Coupon.find({ _id: { $in: ids } }, { code: 1 }).lean()).map((c) => c.code);
      const { deletedCount } = await Coupon.deleteMany({ _id: { $in: ids } });
      await audit(req, currentAdmin(res), "coupon_bulk_delete", `${deletedCount} coupons`, codes.join(", "));
      res.json({ deleted: deletedCount });
    }),
  );

  return r;
}
