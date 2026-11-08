import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { config } from "../../config.js";
import { StaticContentRepository } from "../content/StaticContentRepository.js";
import { FlashcardSet } from "../../models/FlashcardSet.js";
import { FlashcardShare } from "../../models/FlashcardShare.js";
import { User } from "../../models/User.js";
import { sanitizeDeck } from "./flashcardSync.js";
import { SHARE_ID, newShareId, sharedView } from "./flashcardShare.js";

const OWNER = "64b000000000000000000001";
const token = jwt.sign({ userId: OWNER }, config.jwtSecret);

const deck = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: `Deck ${id}`, createdAt: 1, updatedAt: 5, ...extra });
const card = (id: string, deckId: string, extra: Record<string, unknown> = {}) => ({
  id, deckId, term: "購入", termLang: "ja", definition: "mua", definitionLang: "vi", reading: "こうにゅう", hanViet: "CẤU NHẬP",
  box: 3, due: 99, right: 4, wrong: 1, createdAt: 10, updatedAt: 20, ...extra,
});
const lean = <T,>(v: T) => ({ lean: async () => v, select() { return this; } }) as never;

describe("sharing helpers", () => {
  it("makes unguessable URL-safe ids", () => {
    const ids = new Set(Array.from({ length: 200 }, newShareId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(SHARE_ID.test(id)).toBe(true);
  });
  it("shows a deck's live cards without anyone's study progress", () => {
    const state = {
      decks: [deck("d1"), deck("d2")],
      cards: [card("a", "d1", { createdAt: 30 }), card("b", "d1", { createdAt: 10 }), card("c", "d1", { deleted: true }), card("x", "d2")],
    } as never;
    const view = sharedView(state, "d1")!;
    expect(view.name).toBe("Deck d1");
    expect(view.cards.map((c) => c.id)).toEqual(["b", "a"]);
    expect(view.cards[0]).toEqual({ id: "b", term: "購入", termLang: "ja", definition: "mua", definitionLang: "vi", reading: "こうにゅう", hanViet: "CẤU NHẬP" });
    expect(sharedView(state, "nope")).toBeNull();
    expect(sharedView({ decks: [deck("d1", { deleted: true })], cards: [] } as never, "d1")).toBeNull();
  });
  it("keeps a deck's share id and legacy id when syncing", () => {
    expect(sanitizeDeck(deck("d1", { shareId: "AbC_123-xyz", legacyId: "default" }))).toMatchObject({ shareId: "AbC_123-xyz", legacyId: "default" });
    expect(sanitizeDeck(deck("d1", { shareId: "bad id!" }))).not.toHaveProperty("shareId");
  });
});

describe("flashcard share API", () => {
  let app: ReturnType<typeof createApp>["app"];
  beforeAll(() => {
    const repo = new StaticContentRepository(new URL("../../../../content", import.meta.url).pathname);
    repo.load();
    app = createApp(repo).app;
  });
  afterEach(() => vi.restoreAllMocks());

  const signedIn = () => vi.spyOn(User, "findById").mockImplementation((() => ({ ...lean({ displayName: "Linh" }), then: (ok: (v: unknown) => void) => ok({ _id: OWNER, status: "active", displayName: "Linh" }) })) as never);
  const ownerSet = (decks: unknown[], cards: unknown[] = []) => vi.spyOn(FlashcardSet, "findOne").mockReturnValue(lean({ decks, cards }));

  it("serves a public deck to anyone with the link, with the owner's name", async () => {
    vi.spyOn(FlashcardShare, "findOne").mockReturnValue(lean({ shareId: "abcdefghijkl", userId: OWNER, deckId: "d1" }));
    ownerSet([deck("d1")], [card("a", "d1")]);
    vi.spyOn(User, "findById").mockReturnValue(lean({ displayName: "Linh" }));
    const res = await request(app).get("/api/flashcards/shared/abcdefghijkl");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Deck d1", ownerName: "Linh" });
    expect(res.body.cards).toHaveLength(1);
    expect(res.body.cards[0]).not.toHaveProperty("box");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("answers 404 for an unknown link, a malformed one, or a deck that was deleted or made private", async () => {
    const bad = await request(app).get("/api/flashcards/shared/x");
    expect(bad.status).toBe(404);
    const findShare = vi.spyOn(FlashcardShare, "findOne").mockReturnValue(lean(null));
    expect((await request(app).get("/api/flashcards/shared/abcdefghijkl")).status).toBe(404);
    findShare.mockReturnValue(lean({ shareId: "abcdefghijkl", userId: OWNER, deckId: "d1" }));
    ownerSet([deck("d1", { deleted: true })]);
    expect((await request(app).get("/api/flashcards/shared/abcdefghijkl")).status).toBe(404);
  });

  it("needs a sign-in to share or unshare", async () => {
    expect((await request(app).put("/api/flashcards/decks/d1/share")).status).toBe(401);
    expect((await request(app).delete("/api/flashcards/decks/d1/share")).status).toBe(401);
    expect((await request(app).get("/api/flashcards")).status).toBe(401);
  });

  it("makes a synced deck public and returns the same link the next time", async () => {
    signedIn();
    ownerSet([deck("d1")]);
    vi.spyOn(FlashcardShare, "findOne").mockReturnValueOnce(lean(null)).mockReturnValueOnce(lean({ shareId: "existing-id-1" }));
    vi.spyOn(FlashcardShare, "countDocuments").mockResolvedValue(0 as never);
    const upsert = vi.spyOn(FlashcardShare, "findOneAndUpdate").mockReturnValue(lean({ shareId: "newlyMadeId1" }));
    const first = await request(app).put("/api/flashcards/decks/d1/share").set("Authorization", `Bearer ${token}`);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ shareId: "newlyMadeId1" });
    expect(upsert).toHaveBeenCalledOnce();
    const second = await request(app).put("/api/flashcards/decks/d1/share").set("Authorization", `Bearer ${token}`);
    expect(second.body).toEqual({ shareId: "existing-id-1" });
    expect(upsert).toHaveBeenCalledOnce();
  });

  it("will not share a deck that is not on the account yet, or past the limit", async () => {
    signedIn();
    ownerSet([deck("d1")]);
    expect((await request(app).put("/api/flashcards/decks/other/share").set("Authorization", `Bearer ${token}`)).status).toBe(404);
    vi.spyOn(FlashcardShare, "findOne").mockReturnValue(lean(null));
    vi.spyOn(FlashcardShare, "countDocuments").mockResolvedValue(50 as never);
    expect((await request(app).put("/api/flashcards/decks/d1/share").set("Authorization", `Bearer ${token}`)).status).toBe(409);
  });

  it("makes a deck private again by removing its link", async () => {
    signedIn();
    const del = vi.spyOn(FlashcardShare, "deleteMany").mockResolvedValue({ deletedCount: 1 } as never);
    const res = await request(app).delete("/api/flashcards/decks/d1/share").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith({ userId: expect.anything(), deckId: "d1" });
  });
});
