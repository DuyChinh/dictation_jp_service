import crypto from "node:crypto";
import { Router } from "express";
import type { FilterQuery } from "mongoose";
import { z } from "zod";
import { Payment, PAYMENT_GATEWAYS, PAYMENT_STATUSES, type IPayment } from "../../../models/Payment.js";
import { User } from "../../../models/User.js";
import { AppError } from "../../../shared/errors.js";
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
  searchRegex,
} from "../helpers.js";

type PaymentDoc = IPayment & { _id: unknown };

type PaymentFields = Pick<
  IPayment,
  "code" | "userEmail" | "userName" | "plan" | "amount" | "gateway" | "status" | "note" | "createdAt"
> & { _id: unknown; userId?: unknown; paidAt?: Date | null };

export function toPaymentRow(p: PaymentFields) {
  return {
    id: String(p._id),
    code: p.code,
    userId: p.userId ? String(p.userId) : null,
    userEmail: p.userEmail,
    userName: p.userName,
    plan: p.plan,
    amount: p.amount,
    gateway: p.gateway,
    status: p.status,
    note: p.note,
    paidAt: p.paidAt ?? null,
    createdAt: p.createdAt,
  };
}

function newCode(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `TX-${ymd}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const fields = {
  userEmail: z.string().trim().toLowerCase().max(200),
  userName: z.string().trim().max(200),
  plan: z.string().trim().toLowerCase().max(50),
  amount: z.number().int().min(0).max(1_000_000_000),
  gateway: z.enum(PAYMENT_GATEWAYS),
  status: z.enum(PAYMENT_STATUSES),
  note: z.string().trim().max(1000),
  paidAt: z.string().datetime({ offset: true }).nullable(),
};

const createBody = z.object({
  ...fields,
  userEmail: fields.userEmail.default(""),
  userName: fields.userName.default(""),
  plan: fields.plan.default(""),
  gateway: fields.gateway.default("manual"),
  status: fields.status.default("pending"),
  note: fields.note.default(""),
  paidAt: fields.paidAt.optional(),
});

const updateBody = z.object(fields).partial();

/** Links a payment to the account with this email, when there is one. */
async function linkUser(email: string, name: string) {
  if (!email) return { userId: null, userEmail: "", userName: name };
  const user = await User.findOne({ email }, { displayName: 1 }).lean();
  return { userId: user?._id ?? null, userEmail: email, userName: name || user?.displayName || "" };
}

export function createPaymentsAdminRouter(): Router {
  const r = Router();

  r.get(
    "/",
    requirePerm("payments", "read"),
    ah(async (req, res) => {
      const { page, limit, skip } = parsePaging(req);
      const q = queryString(req, "q");
      const status = queryString(req, "status");
      const gateway = queryString(req, "gateway");
      const from = queryString(req, "from");
      const to = queryString(req, "to");

      const filter: FilterQuery<IPayment> = {};
      if (q) {
        const rx = searchRegex(q);
        filter.$or = [{ code: rx }, { userEmail: rx }, { userName: rx }, { note: rx }];
      }
      if ((PAYMENT_STATUSES as readonly string[]).includes(status)) filter.status = status;
      if ((PAYMENT_GATEWAYS as readonly string[]).includes(gateway)) filter.gateway = gateway;
      const range: Record<string, Date> = {};
      if (from && !Number.isNaN(Date.parse(from))) range.$gte = new Date(from);
      if (to && !Number.isNaN(Date.parse(to))) range.$lt = new Date(new Date(to).getTime() + 86400000);
      if (Object.keys(range).length) filter.createdAt = range;

      const month = startOfMonth();
      const [items, total, revenue, pending, refunded] = await Promise.all([
        Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<PaymentDoc[]>(),
        Payment.countDocuments(filter),
        Payment.aggregate<{ sum: number; count: number }>([
          { $match: { status: "succeeded", paidAt: { $gte: month } } },
          { $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        Payment.countDocuments({ status: "pending" }),
        Payment.countDocuments({ status: "refunded", updatedAt: { $gte: month } }),
      ]);

      res.json({
        items: items.map(toPaymentRow),
        total,
        page,
        limit,
        summary: {
          monthRevenue: revenue[0]?.sum ?? 0,
          monthSucceeded: revenue[0]?.count ?? 0,
          pending,
          monthRefunded: refunded,
        },
      });
    }),
  );

  r.post(
    "/",
    requirePerm("payments", "write"),
    ah(async (req, res) => {
      const body = parseBody(createBody, req.body);
      const link = await linkUser(body.userEmail, body.userName);
      const paidAt =
        body.paidAt !== undefined ? (body.paidAt ? new Date(body.paidAt) : null) : body.status === "succeeded" ? new Date() : null;
      const payment = await Payment.create({ ...body, ...link, paidAt, code: newCode() });
      await audit(req, currentAdmin(res), "payment_create", payment.code, `${payment.amount} ${payment.status}`);
      res.status(201).json({ payment: toPaymentRow(payment.toObject()) });
    }),
  );

  r.patch(
    "/:id",
    requirePerm("payments", "write"),
    ah(async (req, res) => {
      const id = idParam(req);
      const body = parseBody(updateBody, req.body);
      const payment = await Payment.findById(id);
      if (!payment) throw new AppError("NOT_FOUND", "Payment not found", 404);

      if (body.userEmail !== undefined || body.userName !== undefined) {
        Object.assign(payment, await linkUser(body.userEmail ?? payment.userEmail, body.userName ?? payment.userName));
      }
      for (const key of ["plan", "amount", "gateway", "status", "note"] as const) {
        if (body[key] !== undefined) payment.set(key, body[key]);
      }
      if (body.paidAt !== undefined) payment.paidAt = body.paidAt ? new Date(body.paidAt) : null;
      // Confirming a payment dates it, unless a date was given.
      else if (body.status === "succeeded" && !payment.paidAt) payment.paidAt = new Date();
      await payment.save();

      await audit(req, currentAdmin(res), "payment_update", payment.code, Object.keys(body).join(", "));
      res.json({ payment: toPaymentRow(payment.toObject()) });
    }),
  );

  r.delete(
    "/:id",
    requirePerm("payments", "write"),
    ah(async (req, res) => {
      const id = idParam(req);
      const payment = await Payment.findByIdAndDelete(id).lean();
      if (!payment) throw new AppError("NOT_FOUND", "Payment not found", 404);
      await audit(req, currentAdmin(res), "payment_delete", payment.code);
      res.json({ deleted: 1 });
    }),
  );

  r.post(
    "/bulk-delete",
    requirePerm("payments", "write"),
    ah(async (req, res) => {
      const { ids } = parseBody(idsBody, req.body);
      const codes = (await Payment.find({ _id: { $in: ids } }, { code: 1 }).lean()).map((p) => p.code);
      const { deletedCount } = await Payment.deleteMany({ _id: { $in: ids } });
      await audit(req, currentAdmin(res), "payment_bulk_delete", `${deletedCount} payments`, codes.join(", "));
      res.json({ deleted: deletedCount });
    }),
  );

  return r;
}
