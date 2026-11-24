import { describe, expect, it } from "vitest";
import type { SyncState } from "../flashcards/flashcardSync.js";
import { dueSummary, isPushEndpoint, isReminderDue, localTime, reminderPayload } from "./reminder.js";

const deck = (id: string, extra = {}) => ({ id, name: id, createdAt: 1, updatedAt: 1, ...extra });
const card = (id: string, deckId: string, extra = {}) => ({
  id, deckId, term: "犬", termLang: "ja" as const, definition: "chó", definitionLang: "vi" as const,
  box: 1, due: 0, right: 1, wrong: 0, createdAt: 1, updatedAt: 1, ...extra,
});

describe("dueSummary", () => {
  const state: SyncState = {
    decks: [deck("d1"), deck("d2"), deck("gone", { deleted: true })],
    cards: [
      card("new", "d1", { right: 0, wrong: 0 }), // never answered: something to learn, not to review
      card("a", "d1", { due: 50 }),
      card("b", "d1", { right: 0, wrong: 2, due: 100 }),
      card("c", "d2", { due: 100 }),
      card("later", "d2", { due: 9e15 }),
      card("del", "d2", { due: 1, deleted: true }),
      card("orphan", "gone", { due: 1 }),
    ],
  };

  it("counts answered cards that are due, in decks that still exist", () => {
    expect(dueSummary(state, 100)).toEqual({ total: 3, topDeckId: "d1" });
  });

  it("is empty when nothing is due", () => {
    expect(dueSummary(state, 10)).toEqual({ total: 0, topDeckId: null });
  });
});

describe("reminder window", () => {
  const at = (iso: string) => Date.parse(iso);

  it("reads the learner's local clock", () => {
    // 12:30 UTC is 19:30 in Vietnam (UTC+7)
    expect(localTime(at("2026-05-01T12:30:00Z"), 420)).toEqual({ day: "2026-05-01", minutes: 19 * 60 + 30 });
    // 20:00 UTC is already the next day there
    expect(localTime(at("2026-05-01T20:00:00Z"), 420)).toEqual({ day: "2026-05-02", minutes: 3 * 60 });
  });

  it("is open from the chosen hour for three hours, once a day", () => {
    const sub = { hour: 19, utcOffsetMin: 420, lastSentDay: "" };
    expect(isReminderDue(sub, at("2026-05-01T11:59:00Z"))).toBe(false); // 18:59 local
    expect(isReminderDue(sub, at("2026-05-01T12:00:00Z"))).toBe(true); // 19:00
    expect(isReminderDue(sub, at("2026-05-01T14:59:00Z"))).toBe(true); // 21:59
    expect(isReminderDue(sub, at("2026-05-01T15:00:00Z"))).toBe(false); // 22:00
    expect(isReminderDue({ ...sub, lastSentDay: "2026-05-01" }, at("2026-05-01T12:10:00Z"))).toBe(false);
    expect(isReminderDue({ ...sub, lastSentDay: "2026-04-30" }, at("2026-05-01T12:10:00Z"))).toBe(true);
  });
});

describe("reminderPayload", () => {
  it("is written in the learner's language and opens the busiest deck in review mode", () => {
    const p = reminderPayload("vi", { total: 5, topDeckId: "d 1" });
    expect(p.title).toBe("Hôm nay có 5 thẻ cần ôn lại");
    expect(p.url).toBe("/flashcards/d%201/learn?review=1");
    expect(reminderPayload("en", { total: 1, topDeckId: null })).toMatchObject({ title: "1 card is waiting for a review", url: "/flashcards" });
    expect(reminderPayload("ja", { total: 2, topDeckId: "x" }).title).toContain("2枚");
  });
});

describe("isPushEndpoint", () => {
  it("accepts the big browsers' push services over https only", () => {
    expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(isPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=x")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isPushEndpoint("https://evil.example.com/fcm.googleapis.com")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com.evil.com/x")).toBe(false);
    expect(isPushEndpoint("http://169.254.169.254/")).toBe(false);
    expect(isPushEndpoint("nonsense")).toBe(false);
  });
});
