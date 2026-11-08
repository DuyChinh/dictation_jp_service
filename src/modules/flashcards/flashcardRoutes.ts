import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { requireAuth } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/errors.js";
import { FlashcardSet } from "../../models/FlashcardSet.js";
import { FlashcardShare } from "../../models/FlashcardShare.js";
import { User } from "../../models/User.js";
import { mergeState, sanitizeState, type SyncState } from "./flashcardSync.js";
import { MAX_SHARES_PER_USER, SHARE_ID, newShareId, sharedView } from "./flashcardShare.js";

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

const DECK_ID = /^[\w-]{1,64}$/;

export function createFlashcardRouter(): Router {
  const r = Router();
  r.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // A public deck, for anyone with its link (no sign-in). Gone as soon as it is made private or deleted.
  r.get("/shared/:shareId", wrap(async (req, res) => {
    const shareId = String(req.params.shareId);
    if (!SHARE_ID.test(shareId)) throw new AppError("NOT_FOUND", "Shared deck not found", 404);
    const share = await FlashcardShare.findOne({ shareId }).lean();
    if (!share) throw new AppError("NOT_FOUND", "Shared deck not found", 404);
    const view = sharedView(await load(share.userId), share.deckId);
    if (!view) throw new AppError("NOT_FOUND", "Shared deck not found", 404);
    const owner = await User.findById(share.userId).select("displayName").lean();
    res.json({ ...view, ownerName: owner?.displayName ?? "" });
  }));

  r.use(requireAuth);

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

  // Make a deck public: returns its share id (the same one if it already is). The deck must already be synced.
  r.put("/decks/:deckId/share", wrap(async (req, res) => {
    const deckId = String(req.params.deckId);
    if (!DECK_ID.test(deckId)) throw new AppError("BAD_REQUEST", "invalid deck id");
    const state = await load(req.user!._id);
    if (!state.decks.some((d) => d.id === deckId && !d.deleted)) {
      throw new AppError("DECK_NOT_SYNCED", "This deck is not on your account yet; sync and try again", 404);
    }
    const existing = await FlashcardShare.findOne({ userId: req.user!._id, deckId }).lean();
    if (existing) {
      res.json({ shareId: existing.shareId });
      return;
    }
    if ((await FlashcardShare.countDocuments({ userId: req.user!._id })) >= MAX_SHARES_PER_USER) {
      throw new AppError("LIMIT", `You can share at most ${MAX_SHARES_PER_USER} decks`, 409);
    }
    const share = await FlashcardShare.findOneAndUpdate(
      { userId: req.user!._id, deckId },
      { $setOnInsert: { shareId: newShareId() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({ shareId: share!.shareId });
  }));

  // Make it private again: the link stops working, and sharing later gives a new one.
  r.delete("/decks/:deckId/share", wrap(async (req, res) => {
    const deckId = String(req.params.deckId);
    if (!DECK_ID.test(deckId)) throw new AppError("BAD_REQUEST", "invalid deck id");
    await FlashcardShare.deleteMany({ userId: req.user!._id, deckId });
    res.json({ ok: true });
  }));

  return r;
}
