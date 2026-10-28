import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { DictionaryService, SearchLang } from "./DictionaryService.js";

const MAX_TEXT = 120;
const LANGS: SearchLang[] = ["auto", "ja", "en", "vi"];

function intParam(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** Express 4 does not catch rejected promises; hand them to the error middleware. */
const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export function createDictRouter(service: DictionaryService): Router {
  const r = Router();

  // The dictionary data changes only when it is re-imported, so browsers and proxies may keep answers.
  r.use((_req, res, next) => {
    res.set("Cache-Control", "public, max-age=3600");
    next();
  });

  // The word under a click: `text` is a stretch of Japanese around the click, `offset` the clicked character.
  r.get("/lookup", wrap(async (req, res) => {
    const text = String(req.query.text ?? "");
    const offset = intParam(req.query.offset, 0, 0, MAX_TEXT);
    if (!text || [...text].length > MAX_TEXT) throw new AppError("BAD_REQUEST", `text must be 1-${MAX_TEXT} characters`);
    res.json({ result: await service.lookupAt(text, offset) });
  }));

  r.get("/search", wrap(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (!q || q.length > 80) throw new AppError("BAD_REQUEST", "q must be 1-80 characters");
    const lang = LANGS.includes(req.query.lang as SearchLang) ? (req.query.lang as SearchLang) : "auto";
    res.json(await service.search(q, lang, intParam(req.query.limit, 30, 1, 50)));
  }));

  r.get("/entry/:id", wrap(async (req, res) => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id)) throw new AppError("BAD_REQUEST", "invalid id");
    const entry = await service.entry(id);
    if (!entry) throw new AppError("NOT_FOUND", "Entry not found", 404);
    res.json({ entry });
  }));

  r.get("/kanji", wrap(async (req, res) => {
    const chars = [...String(req.query.chars ?? "")].slice(0, 40);
    res.json({ kanji: await service.kanji(chars) });
  }));

  return r;
}
