import { type ImageRef } from "./imageRefs.js";

/**
 * Picture search for flashcards. Openverse (a search over openly licensed pictures, including Wikimedia's) is the main
 * source; its public API is often slow and sometimes times out, so Wikimedia Commons is asked at the same time and fills
 * in whatever Openverse could not. Answers are cached, because the same words are looked up again and again.
 */

export type ImageHit = ImageRef & { title?: string; source: "openverse" | "wikimedia" };
export type ImageSearchResult = { query: string; results: ImageHit[]; /** One of the two sources did not answer in time. */ partial: boolean };

type FetchFn = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal; method?: string; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export type ImageSearchOptions = {
  fetchFn?: FetchFn;
  /** How long to wait for each source, in ms. */
  timeoutMs?: number;
  /** How long the second source is waited for once the first has answered well, in ms. */
  graceMs?: number;
  now?: () => number;
  /** Openverse API credentials (optional; they raise its rate limits). */
  openverseId?: string;
  openverseSecret?: string;
  userAgent?: string;
};

const OPENVERSE = "https://api.openverse.org/v1";
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const FULL_TTL_MS = 7 * 24 * 3600 * 1000;
/** A half answer is kept briefly: long enough to spare the sources, short enough that the missing one is tried again. */
const PARTIAL_TTL_MS = 5 * 60 * 1000;
/** A half answer asked for again after this long makes another try for the missing source, in the background. */
const RETRY_AFTER_MS = 20_000;
const MAX_CACHED = 500;
/**
 * Things that are not a picture of what a word means: scanned book pages, diagrams, maps, charts, logos. Commons is
 * searched with these words ruled out, and a result whose title still has one is left out.
 */
const NOISE_TERMS = ["diagram", "diagrams", "map", "chart", "graph", "logo", "scan", "syntax", "screenshot"];
const NOISE_TITLE = /\b(diagrams?|syntactic|syntax|maps?|charts?|graphs?|logo|screenshot|scans?|book images?|book illustrations?|page \d+|plate \d+)\b/i;
/** Too small to see, or too long and thin to sit in a card's picture box. */
const MIN_WIDTH = 240;
const MIN_HEIGHT = 160;
const ASPECT = { min: 0.55, max: 2.4 };
const OFFENSIVE = /\b(nud|naked|sex|porn|erotic|genital|fetish|bdsm|gore|corpse|topless|lingerie)/i;

export const MAX_QUERY = 60;
/** The query as it is looked up and cached: lower case, single spaces, bounded. */
export const normalizeQuery = (q: string): string => q.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase().slice(0, MAX_QUERY);

const clip = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim().slice(0, max);
  return s || undefined;
};

/** "by-sa" + "4.0" -> "CC BY-SA 4.0". */
export function licenseLabel(license: unknown, version: unknown): string | undefined {
  if (typeof license !== "string" || !license) return undefined;
  const l = license.toLowerCase();
  if (l === "cc0") return "CC0";
  if (l === "pdm") return "Public domain";
  const v = typeof version === "string" && version ? ` ${version}` : "";
  return `CC ${l.toUpperCase()}${v}`;
}

export function createImageSearch(opts: ImageSearchOptions = {}) {
  const fetchFn: FetchFn = opts.fetchFn ?? ((url, init) => fetch(url, init));
  const timeoutMs = opts.timeoutMs ?? 14000;
  const graceMs = opts.graceMs ?? 2500;
  const now = opts.now ?? Date.now;
  const userAgent = opts.userAgent ?? "MottoFlashcards/1.0 (https://motto.io.vn)";
  const cache = new Map<string, { at: number; ttl: number; value: ImageSearchResult }>();
  const inflight = new Map<string, Promise<ImageSearchResult>>();
  const retrying = new Set<string>();
  let token: { value: string; until: number } | null = null;

  async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
    const res = await fetchFn(url, { headers: { "User-Agent": userAgent, Accept: "application/json", ...headers }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`);
    return res.json();
  }

  /** An Openverse bearer token, when credentials are set; it lasts about a day. */
  async function openverseAuth(): Promise<Record<string, string>> {
    if (!opts.openverseId || !opts.openverseSecret) return {};
    if (!token || token.until < now()) {
      const res = await fetchFn(`${OPENVERSE}/auth_tokens/token/`, {
        method: "POST",
        headers: { "User-Agent": userAgent, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: opts.openverseId, client_secret: opts.openverseSecret }).toString(),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`openverse token ${res.status}`);
      const body = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!body.access_token) throw new Error("openverse token missing");
      token = { value: body.access_token, until: now() + Math.max(60, (body.expires_in ?? 3600) - 120) * 1000 };
    }
    return { Authorization: `Bearer ${token.value}` };
  }

  async function openverse(q: string, limit: number): Promise<ImageHit[]> {
    // not "non-derivative" and not "non-commercial": a thumbnail is a resized copy, and the site may earn money
    // photographs and illustrations, not scans of old artwork; and big enough to be worth looking at
    const url = `${OPENVERSE}/images/?${new URLSearchParams({
      q,
      page_size: String(limit),
      mature: "false",
      license_type: "commercial,modification",
      category: "photograph,illustration",
      size: "medium,large",
    })}`;
    const body = (await getJson(url, await openverseAuth())) as { results?: Array<Record<string, unknown>> };
    const hits: ImageHit[] = [];
    for (const r of body.results ?? []) {
      const id = typeof r.id === "string" && /^[0-9a-f-]{36}$/i.test(r.id) ? r.id : "";
      const thumb = typeof r.thumbnail === "string" ? r.thumbnail : "";
      if (!id || !thumb || r.mature === true) continue;
      if (NOISE_TITLE.test(typeof r.title === "string" ? r.title : "")) continue;
      hits.push({
        url: thumb,
        page: `https://openverse.org/image/${id}`,
        by: clip(r.creator, 80),
        lic: licenseLabel(r.license, r.license_version),
        title: clip(r.title, 100),
        source: "openverse",
      });
    }
    return hits;
  }

  async function wikimedia(q: string, limit: number): Promise<ImageHit[]> {
    const url = `${COMMONS}?${new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `filetype:bitmap ${q} -"book images" ${NOISE_TERMS.map((t) => `-${t}`).join(" ")}`,
      gsrnamespace: "6",
      // some of what comes back is dropped below, so more is asked for than is wanted
      gsrlimit: String(Math.min(50, limit * 3)),
      prop: "imageinfo",
      iiprop: "url|extmetadata|size",
      iiurlwidth: "400",
      format: "json",
      formatversion: "2",
    })}`;
    const body = (await getJson(url, {})) as { query?: { pages?: Array<Record<string, any>> } };
    const pages = [...(body.query?.pages ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const hits: ImageHit[] = [];
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      const thumb = typeof info?.thumburl === "string" ? info.thumburl : "";
      const page = typeof info?.descriptionurl === "string" ? info.descriptionurl : "";
      if (!thumb || !page) continue;
      const width = Number(info?.width);
      const height = Number(info?.height);
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        const ratio = width / height;
        if (width < MIN_WIDTH || height < MIN_HEIGHT || ratio < ASPECT.min || ratio > ASPECT.max) continue;
      }
      if (NOISE_TITLE.test(String(p.title ?? ""))) continue;
      const categories = String(meta.Categories?.value ?? "");
      if (OFFENSIVE.test(categories) || OFFENSIVE.test(String(p.title ?? ""))) continue;
      hits.push({
        url: thumb,
        page,
        by: clip(meta.Artist?.value, 80),
        lic: clip(meta.LicenseShortName?.value, 24),
        title: clip(String(p.title ?? "").replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, ""), 100),
        source: "wikimedia",
      });
      if (hits.length >= limit) break;
    }
    return hits;
  }

  type Settled = { ok: true; value: ImageHit[] } | { ok: false };
  const settle = (p: Promise<ImageHit[]>): Promise<Settled> => p.then((value): Settled => ({ ok: true, value }), (): Settled => ({ ok: false }));

  /** Merges what the two sources gave (undefined: not answered yet), taking turns so neither crowds the other out of a short list. */
  function combine(query: string, limit: number, ov: Settled | undefined, wm: Settled | undefined): ImageSearchResult & { ok: number } {
    const ok = (ov?.ok ? 1 : 0) + (wm?.ok ? 1 : 0);
    const seen = new Set<string>();
    const results: ImageHit[] = [];
    const lists = [ov, wm].map((r) => (r?.ok ? r.value : []));
    for (let i = 0; results.length < limit && lists.some((l) => i < l.length); i++) {
      for (const list of lists) {
        const hit = list[i];
        if (hit && !seen.has(hit.url) && results.length < limit) {
          seen.add(hit.url);
          results.push(hit);
        }
      }
    }
    return { query, results, partial: ok < 2, ok };
  }

  function remember(key: string, value: ImageSearchResult): void {
    // a half answer that found nothing is not worth remembering
    if (value.partial && value.results.length === 0) return;
    if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: now(), ttl: value.partial ? PARTIAL_TTL_MS : FULL_TTL_MS, value });
  }

  const pause = (ms: number) => new Promise<void>((resolve) => void setTimeout(resolve, ms));

  /**
   * Asks both sources. Once one has given a good answer the other gets only a short while (`graceMs`) before the
   * answer is handed over without it: Commons answers in a second or two, Openverse often needs ten. The slow one
   * keeps going in the background, and when it arrives the remembered answer becomes the full one.
   */
  async function lookup(key: string, query: string, limit: number): Promise<ImageSearchResult> {
    const got: { ov?: Settled; wm?: Settled } = {};
    const done = [
      settle(openverse(query, limit)).then((r) => void (got.ov = r)),
      settle(wikimedia(query, limit)).then((r) => void (got.wm = r)),
    ];
    const all = Promise.all(done);
    await Promise.race(done);
    if (!got.ov?.ok && !got.wm?.ok) await all; // nothing usable yet: the other one is the only hope
    else if (!(got.ov && got.wm)) await Promise.race([all, pause(graceMs)]);
    const value = combine(query, limit, got.ov, got.wm);
    if (value.ok === 0) throw new Error("no image source answered");
    remember(key, value);
    if (!(got.ov && got.wm)) {
      void all.then(() => {
        const full = combine(query, limit, got.ov, got.wm);
        if (full.ok > value.ok) remember(key, full);
      });
    }
    return { query: value.query, results: value.results, partial: value.partial };
  }

  /** Pictures for `q`; rejects when neither source answered. */
  async function search(q: string, limit = 12): Promise<ImageSearchResult> {
    const query = normalizeQuery(q);
    if (!query) return { query, results: [], partial: false };
    const key = `${query}|${limit}`;
    const hit = cache.get(key);
    if (hit && now() - hit.at < hit.ttl) {
      // asked again for a half answer: show it at once, and have another go at the missing source for the next time
      if (hit.value.partial && now() - hit.at >= RETRY_AFTER_MS && !retrying.has(key)) {
        retrying.add(key);
        void lookup(key, query, limit)
          .catch(() => undefined)
          .finally(() => retrying.delete(key));
      }
      return hit.value;
    }
    const pending = inflight.get(key);
    if (pending) return pending;
    const run = lookup(key, query, limit).finally(() => inflight.delete(key));
    inflight.set(key, run);
    return run;
  }

  return { search, clear: () => cache.clear() };
}

export type ImageSearch = ReturnType<typeof createImageSearch>;
