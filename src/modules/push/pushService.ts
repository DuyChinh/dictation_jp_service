import { sendNotification, setVapidDetails } from "web-push";
import { config } from "../../config.js";
import { FlashcardSet } from "../../models/FlashcardSet.js";
import { PushSubscription } from "../../models/PushSubscription.js";
import { sanitizeState, type SyncState } from "../flashcards/flashcardSync.js";
import { dueSummary, isReminderDue, localTime, reminderPayload } from "./reminder.js";

export const pushEnabled = (): boolean => Boolean(config.vapid.publicKey && config.vapid.privateKey);

let configured = false;
function setup(): boolean {
  if (!pushEnabled()) return false;
  if (!configured) {
    setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
    configured = true;
  }
  return true;
}

type Sender = (sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) => Promise<unknown>;
const defaultSender: Sender = (sub, payload) => sendNotification(sub, payload, { TTL: 6 * 3600, urgency: "normal" });

/**
 * Sends today's reminder to every subscription whose window is open. A learner with no cards to review gets nothing
 * (and is looked at again on the next tick, since cards can fall due during the window). Returns how many were sent.
 */
export async function runReminderTick(now = Date.now(), send: Sender = defaultSender): Promise<number> {
  if (send === defaultSender && !setup()) return 0;
  const states = new Map<string, SyncState>();
  let sent = 0;
  for await (const sub of PushSubscription.find({}).cursor()) {
    if (!isReminderDue(sub, now)) continue;
    const key = String(sub.userId);
    let state = states.get(key);
    if (!state) {
      state = sanitizeState((await FlashcardSet.findOne({ userId: sub.userId }).lean()) ?? {});
      states.set(key, state);
    }
    const due = dueSummary(state, now);
    if (due.total === 0) continue;
    try {
      await send({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(reminderPayload(sub.lang, due)));
      await PushSubscription.updateOne({ _id: sub._id }, { $set: { lastSentDay: localTime(now, sub.utcOffsetMin).day } });
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410: the browser dropped this subscription for good
      if (status === 404 || status === 410) await PushSubscription.deleteOne({ _id: sub._id });
      else console.error("[push] send failed:", status ?? err);
    }
  }
  return sent;
}

/** Checks every 10 minutes whether a reminder is due. Does nothing when the VAPID keys are not configured. */
export function startPushJobs(): void {
  if (!setup()) {
    console.log("[push] VAPID keys not set: review reminders are off");
    return;
  }
  setInterval(
    () => {
      runReminderTick().catch((err) => console.error("[push] reminder tick failed:", err));
    },
    10 * 60 * 1000,
  ).unref();
}
