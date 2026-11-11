import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { AppError } from "../../shared/errors.js";
import { MAX_QUERY, normalizeQuery, type ImageSearch } from "./imageSearch.js";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res).catch(next);
  };

/** A small per-address limit, so the search cannot be used to hammer the picture sources through this server. */
function limiter(now: () => number): RequestHandler {
  const hits = new Map<string, number[]>();
  return (req, _res, next) => {
    const t = now();
    const key = req.ip ?? "unknown";
    const recent = (hits.get(key) ?? []).filter((at) => t - at < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) return next(new AppError("RATE_LIMITED", "Too many picture searches, try again in a minute", 429));
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (v.every((at) => t - at >= WINDOW_MS)) hits.delete(k);
    next();
  };
}

export function createImageRouter(search: ImageSearch, now: () => number = Date.now): Router {
  const r = Router();
  r.use(limiter(now));

  /** Pictures for a word: `q` is what to look for (the meaning in English works best). */
  r.get("/search", wrap(async (req, res) => {
    const q = normalizeQuery(String(req.query.q ?? ""));
    if (!q) throw new AppError("BAD_REQUEST", `q must be 1-${MAX_QUERY} characters`);
    const n = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(n) ? Math.min(24, Math.max(1, n)) : 12;
    let result;
    try {
      result = await search.search(q, limit);
    } catch {
      throw new AppError("IMAGES_UNAVAILABLE", "The picture sources are not answering right now. Try again in a moment.", 502);
    }
    // the same words give the same pictures, so a browser may keep them for a while
    res.set("Cache-Control", result.partial ? "no-store" : "private, max-age=3600");
    res.json(result);
  }));

  return r;
}
