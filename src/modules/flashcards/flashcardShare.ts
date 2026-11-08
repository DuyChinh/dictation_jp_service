import { randomBytes } from "node:crypto";
import type { CardLang, SyncState } from "./flashcardSync.js";

/** A share id is 12 URL-safe characters, enough that a link cannot be guessed. */
export const newShareId = (): string => randomBytes(9).toString("base64url");
export const SHARE_ID = /^[A-Za-z0-9_-]{8,32}$/;
export const MAX_SHARES_PER_USER = 50;

export type SharedCard = {
  id: string;
  term: string;
  termLang: CardLang;
  definition: string;
  definitionLang: CardLang;
  reading?: string;
  hanViet?: string;
};

export type SharedDeckView = { name: string; updatedAt: number; cards: SharedCard[] };

/** What anyone with the link sees: the deck's name and cards, and nothing of the owner's study progress. */
export function sharedView(state: SyncState, deckId: string): SharedDeckView | null {
  const deck = state.decks.find((d) => d.id === deckId && !d.deleted);
  if (!deck) return null;
  const cards = state.cards
    .filter((c) => c.deckId === deckId && !c.deleted)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((c): SharedCard => {
      const out: SharedCard = { id: c.id, term: c.term, termLang: c.termLang, definition: c.definition, definitionLang: c.definitionLang };
      if (c.reading) out.reading = c.reading;
      if (c.hanViet) out.hanViet = c.hanViet;
      return out;
    });
  const updatedAt = Math.max(deck.updatedAt, ...cards.length ? state.cards.filter((c) => c.deckId === deckId).map((c) => c.updatedAt) : [0]);
  return { name: deck.name, updatedAt, cards };
}
