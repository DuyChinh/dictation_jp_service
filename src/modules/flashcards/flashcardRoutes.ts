import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { requireAuth } from "../../shared/middleware/auth.js";
import { FlashcardSet } from "../../models/FlashcardSet.js";
import { mergeState, sanitizeState, type SyncState } from "./flashcardSync.js";

/** Express 4 does not catch rejected promises; hand them to the error middleware. */
const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res).catch(next);
  };

async function load(userId: unknown): Promise<SyncState> {
  const doc = await FlashcardSet.findOne({ userId }).lean();
  return sanitizeState(doc ?? {});
}

export function createFlashcardRouter(): Router {
  const r = Router();
  r.use(requireAuth);
  r.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  r.get("/", wrap(async (req, res) => {
    res.json(await load(req.user!._id));
  }));

  // The device sends everything it has; the server merges it with what it holds and returns the result,
  // which the device then keeps. Sending nothing is a plain download.
  r.put("/", wrap(async (req, res) => {
    const merged = mergeState(await load(req.user!._id), sanitizeState(req.body));
    await FlashcardSet.findOneAndUpdate(
      { userId: req.user!._id },
      { $set: { decks: merged.decks, cards: merged.cards } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    res.json(merged);
  }));

  return r;
}
