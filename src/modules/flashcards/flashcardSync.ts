/**
 * Flashcards are edited on several devices, so each deck and card carries `updatedAt` and a delete
 * leaves a short-lived tombstone (`deleted`). Merging two copies keeps, for every id, the newer one.
 */

export type CardLang = "ja" | "vi" | "en";
const LANGS: CardLang[] = ["ja", "vi", "en"];

export type SyncDeck = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  deleted?: true;
};

export type SyncCard = {
  id: string;
  deckId: string;
  term: string;
  termLang: CardLang;
  definition: string;
  definitionLang: CardLang;
  reading?: string;
  /** Sino-Vietnamese reading of the Japanese word, e.g. "CẤU NHẬP". */
  hanViet?: string;
  entryId?: number;
  /** Leitner box 0-5 and when the card is next due. */
  box: number;
  due: number;
  right: number;
  wrong: number;
  createdAt: number;
  updatedAt: number;
  deleted?: true;
};

export type SyncState = { decks: SyncDeck[]; cards: SyncCard[] };

export const MAX_LIVE_CARDS = 2000;
export const MAX_LIVE_DECKS = 100;
/** A deleted deck or card is remembered this long so a device that was offline does not bring it back. */
export const TOMBSTONE_MS = 60 * 24 * 3600 * 1000;

const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const text = (v: unknown, max: number): string => (typeof v === "string" ? v.normalize("NFC").trim().slice(0, max) : "");
const int = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === "number" ? v : Number.NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback;
};
const lang = (v: unknown, fallback: CardLang): CardLang => (LANGS.includes(v as CardLang) ? (v as CardLang) : fallback);
const idOf = (v: unknown): string => (typeof v === "string" && /^[\w-]{1,64}$/.test(v) ? v : "");
const FAR = 8.64e15;

export function sanitizeDeck(raw: unknown): SyncDeck | null {
  const o = obj(raw);
  if (!o) return null;
  const id = idOf(o.id);
  if (!id) return null;
  const updatedAt = int(o.updatedAt, 0, FAR, 0);
  const deck: SyncDeck = {
    id,
    name: text(o.name, 80),
    createdAt: int(o.createdAt, 0, FAR, updatedAt),
    updatedAt,
  };
  if (o.deleted === true) deck.deleted = true;
  else if (!deck.name) return null;
  return deck;
}

export function sanitizeCard(raw: unknown): SyncCard | null {
  const o = obj(raw);
  if (!o) return null;
  const id = idOf(o.id);
  const deckId = idOf(o.deckId);
  if (!id || !deckId) return null;
  const updatedAt = int(o.updatedAt, 0, FAR, 0);
  const card: SyncCard = {
    id,
    deckId,
    term: text(o.term, 200),
    termLang: lang(o.termLang, "ja"),
    definition: text(o.definition, 400),
    definitionLang: lang(o.definitionLang, "vi"),
    box: int(o.box, 0, 5, 0),
    due: int(o.due, 0, FAR, 0),
    right: int(o.right, 0, 1e6, 0),
    wrong: int(o.wrong, 0, 1e6, 0),
    createdAt: int(o.createdAt, 0, FAR, updatedAt),
    updatedAt,
  };
  const reading = text(o.reading, 200);
  if (reading) card.reading = reading;
  const hanViet = text(o.hanViet, 100);
  if (hanViet) card.hanViet = hanViet;
  if (typeof o.entryId === "number" && Number.isInteger(o.entryId) && o.entryId > 0) card.entryId = o.entryId;
  if (o.deleted === true) card.deleted = true;
  else if (!card.term || !card.definition) return null;
  return card;
}

/** For each id the newer copy wins; on a tie a deletion wins, so a delete is never undone by a stale copy. */
export function mergeById<T extends { id: string; updatedAt: number; deleted?: true }>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const have = byId.get(item.id);
    if (!have || item.updatedAt > have.updatedAt || (item.updatedAt === have.updatedAt && item.deleted && !have.deleted)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

function prune<T extends { updatedAt: number; deleted?: true }>(items: T[], now: number): T[] {
  return items.filter((i) => !i.deleted || now - i.updatedAt < TOMBSTONE_MS);
}

/** Newest live items are kept when a limit is exceeded; tombstones are always kept (they are tiny). */
function limitLive<T extends { createdAt: number; deleted?: true }>(items: T[], max: number): T[] {
  const live = items.filter((i) => !i.deleted);
  if (live.length <= max) return items;
  const keep = new Set(live.sort((x, y) => y.createdAt - x.createdAt).slice(0, max));
  return items.filter((i) => i.deleted || keep.has(i));
}

export function sanitizeState(raw: unknown): SyncState {
  const o = obj(raw) ?? {};
  const decks = (Array.isArray(o.decks) ? o.decks : []).slice(0, 2000).map(sanitizeDeck).filter((d): d is SyncDeck => !!d);
  const cards = (Array.isArray(o.cards) ? o.cards : []).slice(0, 20000).map(sanitizeCard).filter((c): c is SyncCard => !!c);
  return { decks, cards };
}

export function mergeState(stored: SyncState, incoming: SyncState, now = Date.now()): SyncState {
  const decks = limitLive(prune(mergeById(stored.decks, incoming.decks), now), MAX_LIVE_DECKS);
  const cards = limitLive(prune(mergeById(stored.cards, incoming.cards), now), MAX_LIVE_CARDS);
  return { decks, cards };
}
