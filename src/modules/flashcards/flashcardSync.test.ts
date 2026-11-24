import { describe, expect, it } from "vitest";
import {
  MAX_LIVE_CARDS,
  MAX_LIVE_FOLDERS,
  TOMBSTONE_MS,
  mergeById,
  mergeState,
  sanitizeCard,
  sanitizeDeck,
  sanitizeState,
  type SyncCard,
  type SyncDeck,
  type SyncFolder,
} from "./flashcardSync.js";

const deck = (id: string, updatedAt: number, extra: Partial<SyncDeck> = {}): SyncDeck => ({
  id,
  name: `deck ${id}`,
  createdAt: 1,
  updatedAt,
  ...extra,
});
const card = (id: string, updatedAt: number, extra: Partial<SyncCard> = {}): SyncCard => ({
  id,
  deckId: "d1",
  term: "食べる",
  termLang: "ja",
  definition: "ăn",
  definitionLang: "vi",
  box: 0,
  due: 0,
  right: 0,
  wrong: 0,
  createdAt: updatedAt,
  updatedAt,
  ...extra,
});

describe("sanitizeCard", () => {
  it("keeps a valid card and trims text", () => {
    const c = sanitizeCard({ ...card("a", 5), term: "  食べる ", reading: "たべる", entryId: 12 });
    expect(c).toMatchObject({ id: "a", term: "食べる", reading: "たべる", entryId: 12 });
  });
  it("keeps the Sino-Vietnamese reading and trims it", () => {
    expect(sanitizeCard({ ...card("a", 5), hanViet: " CẤU NHẬP " })).toMatchObject({ hanViet: "CẤU NHẬP" });
    expect(sanitizeCard({ ...card("a", 5), hanViet: "  " })).not.toHaveProperty("hanViet");
  });
  it("drops a card with no text, a bad id, or no deck", () => {
    expect(sanitizeCard({ ...card("a", 5), term: " " })).toBeNull();
    expect(sanitizeCard({ ...card("a", 5), definition: "" })).toBeNull();
    expect(sanitizeCard({ ...card("a b", 5) })).toBeNull();
    expect(sanitizeCard({ ...card("a", 5), deckId: "" })).toBeNull();
    expect(sanitizeCard("nope")).toBeNull();
  });
  it("keeps a deletion even though its text is gone", () => {
    expect(sanitizeCard({ id: "a", deckId: "d1", term: "", definition: "", updatedAt: 9, deleted: true })).toMatchObject({
      id: "a",
      deleted: true,
    });
  });
  it("clamps numbers and falls back for unknown languages", () => {
    const c = sanitizeCard({ ...card("a", 5), box: 99, right: -3, termLang: "fr" });
    expect(c).toMatchObject({ box: 5, right: 0, termLang: "ja" });
  });
});

describe("mergeById", () => {
  it("keeps the newer copy of each id and the items only one side has", () => {
    const merged = mergeById([card("a", 1, { definition: "old" }), card("b", 1)], [card("a", 2, { definition: "new" }), card("c", 1)]);
    expect(merged.find((c) => c.id === "a")?.definition).toBe("new");
    expect(merged.map((c) => c.id).sort()).toEqual(["a", "b", "c"]);
  });
  it("lets a deletion win a tie, and a newer edit win over an older deletion", () => {
    const tie = mergeById([card("a", 5)], [card("a", 5, { deleted: true })]);
    expect(tie[0]?.deleted).toBe(true);
    const revived = mergeById([card("a", 5, { deleted: true })], [card("a", 6)]);
    expect(revived[0]?.deleted).toBeUndefined();
  });
});

describe("mergeState", () => {
  it("drops tombstones older than the retention window but keeps recent ones", () => {
    const now = 10 * TOMBSTONE_MS;
    const merged = mergeState(
      { decks: [], cards: [card("old", now - TOMBSTONE_MS - 1, { deleted: true }), card("recent", now - 1000, { deleted: true })] },
      { decks: [], cards: [] },
      now,
    );
    expect(merged.cards.map((c) => c.id)).toEqual(["recent"]);
  });
  it("keeps only the newest cards past the limit", () => {
    const many = Array.from({ length: MAX_LIVE_CARDS + 5 }, (_, i) => card(`c${i}`, 1000 + i, { createdAt: 1000 + i }));
    const merged = mergeState({ decks: [], cards: [] }, { decks: [], cards: many }, 2000);
    expect(merged.cards).toHaveLength(MAX_LIVE_CARDS);
    expect(merged.cards.some((c) => c.id === "c0")).toBe(false);
    expect(merged.cards.some((c) => c.id === `c${MAX_LIVE_CARDS + 4}`)).toBe(true);
  });
  it("merges decks as well as cards", () => {
    const merged = mergeState({ decks: [deck("x", 1)], cards: [] }, { decks: [deck("x", 2, { name: "renamed" }), deck("y", 1)], cards: [] }, 5);
    expect(merged.decks.find((d) => d.id === "x")?.name).toBe("renamed");
    expect(merged.decks).toHaveLength(2);
  });
});

describe("sanitizeState", () => {
  it("survives garbage", () => {
    expect(sanitizeState(null)).toEqual({ decks: [], cards: [], folders: [] });
    expect(sanitizeState({ decks: "x", cards: [1, null, card("a", 1)] }).cards).toHaveLength(1);
  });
});

describe("folders", () => {
  const folder = (id: string, updatedAt: number, extra: Partial<SyncFolder> = {}): SyncFolder => ({ id, name: `folder ${id}`, createdAt: 1, updatedAt, ...extra });

  it("keeps a deck's folder and drops broken folders", () => {
    expect(sanitizeDeck({ ...deck("d", 5), folderId: "f1" })?.folderId).toBe("f1");
    expect(sanitizeDeck({ ...deck("d", 5), folderId: "not an id!" })?.folderId).toBeUndefined();
    const s = sanitizeState({ folders: [folder("f1", 1), { id: "f2", name: "  " }, 7, folder("f3", 2, { deleted: true, name: "" })] });
    expect(s.folders?.map((f) => f.id)).toEqual(["f1", "f3"]);
  });

  it("merges by id like decks: the newer copy wins and a delete survives a stale copy", () => {
    const merged = mergeState(
      { decks: [], cards: [], folders: [folder("a", 5, { name: "new" }), folder("b", 5, { deleted: true })] },
      { decks: [], cards: [], folders: [folder("a", 3, { name: "old" }), folder("b", 4)] },
      10,
    );
    expect(merged.folders?.find((f) => f.id === "a")?.name).toBe("new");
    expect(merged.folders?.find((f) => f.id === "b")?.deleted).toBe(true);
  });

  it("a client that knows nothing about folders does not erase them", () => {
    const merged = mergeState({ decks: [], cards: [], folders: [folder("a", 5)] }, { decks: [], cards: [] });
    expect(merged.folders).toHaveLength(1);
  });

  it("keeps the newest folders when there are too many", () => {
    const many = Array.from({ length: MAX_LIVE_FOLDERS + 5 }, (_, i) => folder(`f${i}`, 1, { createdAt: i }));
    const merged = mergeState({ decks: [], cards: [], folders: many }, { decks: [], cards: [] });
    expect(merged.folders).toHaveLength(MAX_LIVE_FOLDERS);
    expect(merged.folders?.some((f) => f.id === "f0")).toBe(false);
  });
});
