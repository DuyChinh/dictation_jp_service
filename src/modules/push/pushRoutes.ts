import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { config } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import { requireAuth } from "../../shared/middleware/auth.js";
import { createRateLimiter } from "../../shared/middleware/rateLimit.js";
import { PushSubscription } from "../../models/PushSubscription.js";
import { User } from "../../models/User.js";
import { pushEnabled, sendTestPush } from "./pushService.js";
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
  minute: z.number().int().min(0).max(59).default(0),
  /** Minutes east of UTC (Vietnam is 420). */
  utcOffsetMin: z.number().int().min(-14 * 60).max(14 * 60).default(0),
});

const timeBody = z.object({ hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59) });

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
    const { subscription, lang, hour, minute, utcOffsetMin } = parsed.data;
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
      { $set: { userId, keys: subscription.keys, lang, hour, minute, utcOffsetMin }, $setOnInsert: { lastSentDay: "" } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    // the time is the account's: the next device the learner signs in on shows the same one
    await User.updateOne({ _id: userId }, { $set: { reminderTime: { hour, minute } } });
    res.json({ ok: true });
  }));

  // The time the learner chose for their reminder. It belongs to the account, so a new device starts from it.
  // Accounts that set a time before it was kept on the account fall back to their latest browser's time.
  r.get("/preference", wrap(async (req, res) => {
    const userId = req.user!._id;
    const user = await User.findById(userId).select("reminderTime").lean();
    const t = user?.reminderTime;
    if (typeof t?.hour === "number" && typeof t.minute === "number") {
      res.json({ time: { hour: t.hour, minute: t.minute } });
      return;
    }
    const latest = await PushSubscription.findOne({ userId }).sort({ updatedAt: -1 }).select("hour minute").lean();
    res.json({ time: latest ? { hour: latest.hour, minute: latest.minute ?? 0 } : null });
  }));

  // Saves the time on the account and moves every browser of the account to it.
  r.put("/preference", wrap(async (req, res) => {
    const parsed = timeBody.safeParse(req.body);
    if (!parsed.success) throw new AppError("BAD_REQUEST", "invalid time");
    const { hour, minute } = parsed.data;
    const userId = req.user!._id;
    await User.updateOne({ _id: userId }, { $set: { reminderTime: { hour, minute } } });
    await PushSubscription.updateMany({ userId }, { $set: { hour, minute } });
    res.json({ ok: true });
  }));

  // Sends one test notification to this browser, so the learner can tell whether Chrome and the server are both working.
  r.post("/test", wrap(async (req, res) => {
    if (!pushEnabled()) throw new AppError("PUSH_DISABLED", "Reminders are not available right now", 503);
    const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
    const lang = REMINDER_LANGS.includes(req.body?.lang) ? req.body.lang : "vi";
    const sub = endpoint ? await PushSubscription.findOne({ userId: req.user!._id, endpoint }).lean() : null;
    if (!sub) throw new AppError("NOT_FOUND", "this browser has no reminder yet", 404);
    try {
      await sendTestPush({ endpoint: sub.endpoint, keys: sub.keys }, lang);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // the browser dropped it for good: forget it so the learner can turn the reminder on again
      if (status === 404 || status === 410) await PushSubscription.deleteOne({ _id: sub._id });
      console.error("[push] test failed:", status ?? err);
      throw new AppError("PUSH_FAILED", "the push service did not accept the message", 502);
    }
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
