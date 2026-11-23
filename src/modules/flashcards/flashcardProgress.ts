/**
 * Where a learner got to in a game or a study round, kept on the account so another device can offer "Continue".
 * One entry per game of a deck (`g:<deckId>:<game>`) and per study round of a deck (`l:<deckId>`). Each entry
 * carries the time it was saved (`at`); merging two copies keeps, for every key, the newer one. A game that was
 * finished or abandoned is kept as `data: null` so a device that was offline does not bring it back.
 */

export type ProgressEntry = { at: number; data: Record<string, unknown> | null };
export type ProgressMap = Record<string, ProgressEntry>;

/** Same cut-offs the devices use: a game left alone for a week, a study round for a month, is not worth carrying on. */
export const PROGRESS_MAX_AGE_MS = 30 * 24 * 3600 * 1000;
export const MAX_PROGRESS_ENTRIES = 100;
/** One saved game as JSON; a bigger one is left on its own device. */
export const MAX_ENTRY_BYTES = 256 * 1024;
const KEY = /^(?:g:[\w-]{1,64}:[a-z]{1,20}|l:[\w-]{1,64})$/;
/** A device clock a little ahead of ours is tolerated; further ahead is pulled back to now. */
const SKEW_MS = 60 * 60 * 1000;

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Only well-formed, fresh, reasonably small entries from whatever a device sent. */
export function sanitizeProgress(raw: unknown, now = Date.now()): ProgressMap {
  const out: ProgressMap = {};
  const src = isPlain(raw) && isPlain(raw.progress) ? raw.progress : isPlain(raw) ? raw : {};
  for (const [key, v] of Object.entries(src)) {
    if (!KEY.test(key) || !isPlain(v)) continue;
    const at = typeof v.at === "number" && Number.isFinite(v.at) ? Math.min(Math.trunc(v.at), now + SKEW_MS) : Number.NaN;
    if (!(at > 0) || now - at > PROGRESS_MAX_AGE_MS) continue;
    if (v.data !== null && !isPlain(v.data)) continue;
    if (v.data !== null && JSON.stringify(v.data).length > MAX_ENTRY_BYTES) continue;
    out[key] = { at, data: v.data as ProgressEntry["data"] };
  }
  return out;
}

/** The newer entry for every key; on a tie the stored copy stays. The newest MAX_PROGRESS_ENTRIES are kept. */
export function mergeProgress(stored: ProgressMap, incoming: ProgressMap): ProgressMap {
  const merged: ProgressMap = { ...stored };
  for (const [key, e] of Object.entries(incoming)) {
    const have = merged[key];
    if (!have || e.at > have.at) merged[key] = e;
  }
  const newest = Object.entries(merged).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_PROGRESS_ENTRIES);
  return Object.fromEntries(newest);
}
