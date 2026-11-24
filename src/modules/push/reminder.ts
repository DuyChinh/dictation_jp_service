/**
 * Pure helpers for the "cards to review" reminder: which cards are due, when a learner's reminder window is open,
 * and what the message says. No database or network here, so it is all easy to test.
 */

import type { SyncState } from "../flashcards/flashcardSync.js";

export type ReminderLang = "vi" | "en" | "ja";
export const REMINDER_LANGS: ReminderLang[] = ["vi", "en", "ja"];

/** A reminder is sent in the first WINDOW_HOURS hours from the learner's chosen hour, so a late server tick still sends it. */
export const WINDOW_HOURS = 3;

export type DueSummary = { total: number; topDeckId: string | null };

/** Cards answered before whose review date has come, in decks that still exist (same rule as the app's banner). */
export function dueSummary(state: SyncState, now: number): DueSummary {
  const live = new Set(state.decks.filter((d) => !d.deleted).map((d) => d.id));
  const byDeck = new Map<string, number>();
  let total = 0;
  for (const c of state.cards) {
    if (c.deleted || !live.has(c.deckId)) continue;
    if (c.right + c.wrong <= 0 || c.due > now) continue;
    total++;
    byDeck.set(c.deckId, (byDeck.get(c.deckId) ?? 0) + 1);
  }
  const top = [...byDeck.entries()].sort((a, b) => b[1] - a[1])[0];
  return { total, topDeckId: top ? top[0] : null };
}

/** The learner's local clock for a UTC instant and their offset in minutes east of UTC. */
export function localTime(now: number, utcOffsetMin: number): { day: string; minutes: number } {
  const d = new Date(now + utcOffsetMin * 60_000);
  return { day: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

/** True when this subscription should be reminded now: inside its window and not reminded yet today. */
export function isReminderDue(sub: { hour: number; utcOffsetMin: number; lastSentDay: string }, now: number): boolean {
  const { day, minutes } = localTime(now, sub.utcOffsetMin);
  if (sub.lastSentDay === day) return false;
  const start = sub.hour * 60;
  return minutes >= start && minutes < start + WINDOW_HOURS * 60;
}

const TEXT: Record<ReminderLang, { title: (n: number) => string; body: string }> = {
  vi: { title: (n) => `Hôm nay có ${n} thẻ cần ôn lại`, body: "Ôn ngay vài phút để nhớ lâu hơn." },
  en: { title: (n) => `${n} ${n === 1 ? "card is" : "cards are"} waiting for a review`, body: "A few minutes now helps you remember for longer." },
  ja: { title: (n) => `今日は${n}枚のカードを復習する時期です`, body: "数分の復習で、記憶が長く続きます。" },
};

export type ReminderPayload = { title: string; body: string; url: string; tag: string };

/** What the browser shows, and where tapping it goes: the deck with the most due cards, in review mode. */
export function reminderPayload(lang: ReminderLang, due: DueSummary): ReminderPayload {
  const t = TEXT[lang] ?? TEXT.vi;
  return {
    title: t.title(due.total),
    body: t.body,
    url: due.topDeckId ? `/flashcards/${encodeURIComponent(due.topDeckId)}/learn?review=1` : "/flashcards",
    tag: "review-due",
  };
}

/** Only the push services of the major browsers are accepted, so the server never posts to an arbitrary address. */
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
];

export function isPushEndpoint(endpoint: string): boolean {
  if (endpoint.length > 1000) return false;
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:") return false;
    return PUSH_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
