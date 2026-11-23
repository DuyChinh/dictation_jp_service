import { randomBytes } from "node:crypto";
import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { requireAuth } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/errors.js";
import { UserVoucher, type IUserVoucher, type VoucherSource } from "../../models/UserVoucher.js";

/** What each source gives. */
export const VOUCHER_SOURCES: Record<VoucherSource, { discountType: "percent" | "fixed"; discountValue: number; prefix: string }> = {
  support_video: { discountType: "percent", discountValue: 10, prefix: "KAITIQ10" },
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, so a code is easy to read out and type
export function newVoucherCode(prefix: string): string {
  const bytes = randomBytes(6);
  let tail = "";
  for (const b of bytes) tail += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `${prefix}-${tail}`;
}

export type VoucherView = {
  source: VoucherSource;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  expiresAt: string | null;
  used: boolean;
  createdAt: string;
};

export function voucherView(v: Pick<IUserVoucher, "source" | "code" | "discountType" | "discountValue" | "expiresAt" | "usedAt" | "createdAt">): VoucherView {
  return {
    source: v.source,
    code: v.code,
    discountType: v.discountType,
    discountValue: v.discountValue,
    expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null,
    used: !!v.usedAt,
    createdAt: new Date(v.createdAt).toISOString(),
  };
}

/** Express 4 does not catch rejected promises; hand them to the error middleware. */
const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export function createVoucherRouter(): Router {
  const r = Router();
  r.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  r.use(requireAuth);

  // The signed-in user's vouchers, newest first.
  r.get("/me", wrap(async (req, res) => {
    const rows = await UserVoucher.find({ userId: req.user!._id }).sort({ createdAt: -1 }).lean();
    res.json({ vouchers: rows.map(voucherView) });
  }));

  // Claim the voucher for supporting the video. Safe to repeat: the user keeps the one voucher they already have.
  r.post("/claim", wrap(async (req, res) => {
    const source = (req.body as { source?: unknown } | undefined)?.source ?? "support_video";
    if (typeof source !== "string" || !Object.hasOwn(VOUCHER_SOURCES, source)) throw new AppError("BAD_REQUEST", "Unknown voucher source", 400);
    const spec = VOUCHER_SOURCES[source as VoucherSource];
    const userId = req.user!._id;
    const existing = await UserVoucher.findOne({ userId, source }).lean();
    if (existing) {
      res.json({ voucher: voucherView(existing), created: false });
      return;
    }
    try {
      const doc = await UserVoucher.create({
        userId,
        source,
        code: newVoucherCode(spec.prefix),
        discountType: spec.discountType,
        discountValue: spec.discountValue,
      });
      res.status(201).json({ voucher: voucherView(doc), created: true });
    } catch (e) {
      // two clicks at once: the other request won the (userId, source) index, so hand back its voucher
      if ((e as { code?: number }).code !== 11000) throw e;
      const won = await UserVoucher.findOne({ userId, source }).lean();
      if (!won) throw e;
      res.json({ voucher: voucherView(won), created: false });
    }
  }));

  return r;
}
