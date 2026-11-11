/**
 * A picture on a flashcard is only ever a reference to a picture hosted by Openverse or Wikimedia Commons: where its
 * thumbnail is, the page that credits it, who made it and under which licence. Cards are synced and shared in public
 * decks, so a reference may point only at those two places; otherwise a shared deck could make every viewer's browser
 * load an address of the sharer's choosing.
 */
export type ImageRef = {
  /** The thumbnail shown on the card. */
  url: string;
  /** The page that credits the picture (Openverse's or Commons' own page for it). */
  page?: string;
  /** Who made it. */
  by?: string;
  /** Its licence, e.g. "CC BY 4.0". */
  lic?: string;
};

/** Hosts a thumbnail may come from. */
/** Wikimedia serves its resized pictures from `thumb.wikimedia.org`; `upload.wikimedia.org` holds the originals. */
export const IMAGE_HOSTS: readonly string[] = ["api.openverse.org", "thumb.wikimedia.org", "upload.wikimedia.org"];
/** Hosts of the credit page. */
export const PAGE_HOSTS: readonly string[] = ["openverse.org", "commons.wikimedia.org"];

const MAX_URL = 400;

function httpsUrl(v: unknown, hosts: readonly string[]): string {
  if (typeof v !== "string" || v.length > MAX_URL) return "";
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password && hosts.includes(u.hostname) ? u.toString() : "";
  } catch {
    return "";
  }
}

const text = (v: unknown, max: number): string => (typeof v === "string" ? v.normalize("NFC").replace(/\s+/g, " ").trim().slice(0, max) : "");

/** A reference from a client, cleaned: null when its thumbnail is not from an allowed host. */
export function sanitizeImage(raw: unknown): ImageRef | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const url = httpsUrl(o.url, IMAGE_HOSTS);
  if (!url) return null;
  const ref: ImageRef = { url };
  const page = httpsUrl(o.page, PAGE_HOSTS);
  if (page) ref.page = page;
  const by = text(o.by, 80);
  if (by) ref.by = by;
  const lic = text(o.lic, 24);
  if (lic) ref.lic = lic;
  return ref;
}
