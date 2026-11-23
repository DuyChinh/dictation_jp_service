import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { config } from "../../config.js";
import { StaticContentRepository } from "../content/StaticContentRepository.js";
import { FlashcardSet } from "../../models/FlashcardSet.js";
import { User } from "../../models/User.js";
import { MAX_ENTRY_BYTES, MAX_PROGRESS_ENTRIES, mergeProgress, sanitizeProgress } from "./flashcardProgress.js";

const NOW = 1_800_000_000_000;
const DAY = 24 * 3600 * 1000;
const game = (at: number, extra: Record<string, unknown> = {}) => ({ at, data: { direction: "term", ...extra } });

describe("sanitizeProgress", () => {
  it("keeps well-formed games, study rounds and cleared marks", () => {
    const out = sanitizeProgress({ "g:d1:blitz": game(NOW - 1000), "l:d1": game(NOW - 5, { index: 3 }), "g:d1:drop": { at: NOW - 9, data: null } }, NOW);
    expect(Object.keys(out).sort()).toEqual(["g:d1:blitz", "g:d1:drop", "l:d1"]);
    expect(out["g:d1:drop"].data).toBeNull();
  });
  it("accepts the map inside a { progress } body", () => {
    expect(Object.keys(sanitizeProgress({ progress: { "l:d1": game(NOW - 1) } }, NOW))).toEqual(["l:d1"]);
  });
  it("drops bad keys, bad shapes, stale and oversized entries", () => {
    const huge = { at: NOW - 1, data: { blob: "x".repeat(MAX_ENTRY_BYTES + 10) } };
    const out = sanitizeProgress({
      "bad key": game(NOW - 1), "g:d1": game(NOW - 1), "x:d1": game(NOW - 1), "g:d1:Blitz": game(NOW - 1),
      "g:d1:a": { at: "now", data: {} }, "g:d1:b": { at: NOW - 1, data: [1] }, "g:d1:c": { at: NOW - 1, data: "str" },
      "g:d1:old": game(NOW - 31 * DAY), "g:d1:huge": huge, "g:d1:ok": game(NOW - 1),
    }, NOW);
    expect(Object.keys(out)).toEqual(["g:d1:ok"]);
  });
  it("pulls a clock far ahead back to now", () => {
    expect(sanitizeProgress({ "l:d1": game(NOW + 10 * DAY) }, NOW)["l:d1"].at).toBeLessThanOrEqual(NOW + 3600 * 1000);
  });
  it("copes with junk", () => {
    for (const junk of [null, undefined, 5, "x", [], { progress: 3 }]) expect(sanitizeProgress(junk, NOW)).toEqual({});
  });
});

describe("mergeProgress", () => {
  it("keeps the newer copy of each key and the keys only one side has", () => {
    const stored = sanitizeProgress({ "g:d1:blitz": game(NOW - 100, { from: "A" }), "l:d1": game(NOW - 50) }, NOW);
    const incoming = sanitizeProgress({ "g:d1:blitz": game(NOW - 10, { from: "B" }), "g:d2:match": game(NOW - 20) }, NOW);
    const m = mergeProgress(stored, incoming);
    expect(m["g:d1:blitz"].data).toMatchObject({ from: "B" });
    expect(Object.keys(m).sort()).toEqual(["g:d1:blitz", "g:d2:match", "l:d1"]);
  });
  it("lets a later finish beat an earlier save, and a later save beat a finish", () => {
    const saved = sanitizeProgress({ "g:d1:blitz": game(NOW - 100) }, NOW);
    const cleared = sanitizeProgress({ "g:d1:blitz": { at: NOW - 10, data: null } }, NOW);
    expect(mergeProgress(saved, cleared)["g:d1:blitz"].data).toBeNull();
    expect(mergeProgress(cleared, sanitizeProgress({ "g:d1:blitz": game(NOW - 1) }, NOW))["g:d1:blitz"].data).not.toBeNull();
  });
  it("keeps the stored copy on a tie", () => {
    const m = mergeProgress({ "l:d1": { at: NOW - 5, data: { from: "stored" } } }, { "l:d1": { at: NOW - 5, data: { from: "sent" } } });
    expect(m["l:d1"].data).toMatchObject({ from: "stored" });
  });
  it("keeps only the newest entries", () => {
    const many = Object.fromEntries(Array.from({ length: MAX_PROGRESS_ENTRIES + 20 }, (_, i) => [`l:d${i}`, game(NOW - 1000 + i)]));
    const m = mergeProgress({}, sanitizeProgress(many, NOW));
    expect(Object.keys(m)).toHaveLength(MAX_PROGRESS_ENTRIES);
    expect(m).toHaveProperty(`l:d${MAX_PROGRESS_ENTRIES + 19}`);
    expect(m).not.toHaveProperty("l:d0");
  });
});

describe("flashcard progress API", () => {
  const OWNER = "64b000000000000000000001";
  const token = jwt.sign({ userId: OWNER }, config.jwtSecret);
  const auth = { Authorization: `Bearer ${token}` };
  const lean = <T,>(v: T) => ({ lean: async () => v }) as never;
  let app: ReturnType<typeof createApp>["app"];
  beforeAll(() => {
    const repo = new StaticContentRepository(new URL("../../../../content", import.meta.url).pathname);
    repo.load();
    app = createApp(repo).app;
  });
  afterEach(() => vi.restoreAllMocks());
  const signedIn = () => vi.spyOn(User, "findById").mockImplementation((() => ({ then: (ok: (v: unknown) => void) => ok({ _id: OWNER, status: "active" }) })) as never);

  it("needs a sign-in", async () => {
    expect((await request(app).get("/api/flashcards/progress")).status).toBe(401);
    expect((await request(app).put("/api/flashcards/progress")).status).toBe(401);
  });

  it("downloads what the account holds (and nothing when it holds nothing)", async () => {
    signedIn();
    vi.spyOn(FlashcardSet, "findOne").mockReturnValue(lean(null));
    const none = await request(app).get("/api/flashcards/progress").set(auth);
    expect(none.status).toBe(200);
    expect(none.body).toEqual({ progress: {} });
    const at = Date.now() - 1000;
    vi.spyOn(FlashcardSet, "findOne").mockReturnValue(lean({ progress: { "g:d1:blitz": { at, data: { direction: "term" } } } }));
    const some = await request(app).get("/api/flashcards/progress").set(auth);
    expect(some.body.progress["g:d1:blitz"]).toEqual({ at, data: { direction: "term" } });
  });

  it("merges what a device sends with what is stored, saves it and returns the result", async () => {
    signedIn();
    const t = Date.now();
    vi.spyOn(FlashcardSet, "findOne").mockReturnValue(lean({ progress: { "g:d1:blitz": { at: t - 5000, data: { from: "A" } }, "l:d1": { at: t - 100, data: { index: 2 } } } }));
    const save = vi.spyOn(FlashcardSet, "findOneAndUpdate").mockReturnValue(lean(null));
    const res = await request(app).put("/api/flashcards/progress").set(auth).send({ progress: { "g:d1:blitz": { at: t - 10, data: { from: "B" } }, "bad": { at: t, data: {} } } });
    expect(res.status).toBe(200);
    expect(res.body.progress["g:d1:blitz"].data).toEqual({ from: "B" });
    expect(res.body.progress["l:d1"].data).toEqual({ index: 2 });
    expect(res.body.progress).not.toHaveProperty("bad");
    expect(save).toHaveBeenCalledWith({ userId: OWNER }, { $set: { progress: res.body.progress } }, expect.anything());
  });
});
