import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { config } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import { requireAuth } from "../../shared/middleware/auth.js";
import { createRateLimiter } from "../../shared/middleware/rateLimit.js";
import { PushSubscription } from "../../models/PushSubscription.js";
import { pushEnabled } from "./pushService.js";
import { REMINDER_LANGS, isPushEndpoint } from "./reminder.js";

const MAX_PER_USER = 10;

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res).catch(next);
  };

const subscribeBody = z.object({
  subscription: z.object({
    endpoint: z.string().refine(isPushEndpoint, "unsupported push service"),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
  lang: z.enum(REMINDER_LANGS as ["vi", "en", "ja"]).default("vi"),
  hour: z.number().int().min(0).max(23).default(19),
  /** Minutes east of UTC (Vietnam is 420). */
  utcOffsetMin: z.number().int().min(-14 * 60).max(14 * 60).default(0),
});

export function createPushRouter(): Router {
  const r = Router();
  r.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // The public key the browser needs to subscribe; `enabled` false means the server has no VAPID keys.
  r.get("/config", (_req, res) => {
    res.json({ enabled: pushEnabled(), publicKey: pushEnabled() ? config.vapid.publicKey : "" });
  });

  r.use(requireAuth);
  r.use(createRateLimiter({ max: 30 }));

  // Subscribe this browser, or change its hour/language: one row per browser.
  r.put("/subscription", wrap(async (req, res) => {
    if (!pushEnabled()) throw new AppError("PUSH_DISABLED", "Reminders are not available right now", 503);
    const parsed = subscribeBody.safeParse(req.body);
    if (!parsed.success) throw new AppError("BAD_REQUEST", "invalid subscription");
    const { subscription, lang, hour, utcOffsetMin } = parsed.data;
    const userId = req.user!._id;

    const existing = await PushSubscription.findOne({ endpoint: subscription.endpoint }).select("userId").lean();
    if (!existing || String(existing.userId) !== String(userId)) {
      // a new browser for this account (or one that was last used by another account): keep the newest MAX_PER_USER
      const mine = await PushSubscription.find({ userId }).sort({ updatedAt: 1 }).select("_id").lean();
      const extra = mine.length - (MAX_PER_USER - 1);
      if (extra > 0) await PushSubscription.deleteMany({ _id: { $in: mine.slice(0, extra).map((m) => m._id) } });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { $set: { userId, keys: subscription.keys, lang, hour, utcOffsetMin }, $setOnInsert: { lastSentDay: "" } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    res.json({ ok: true });
  }));

  r.delete("/subscription", wrap(async (req, res) => {
    const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
    if (!endpoint) throw new AppError("BAD_REQUEST", "endpoint is required");
    await PushSubscription.deleteOne({ userId: req.user!._id, endpoint });
    res.json({ ok: true });
  }));

  return r;
}
