import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { sanitizeCard } from "../flashcards/flashcardSync.js";
import { sharedView } from "../flashcards/flashcardShare.js";
import { sanitizeImage } from "./imageRefs.js";
import { createImageRouter } from "./imageRoutes.js";
import { createImageSearch, licenseLabel, normalizeQuery } from "./imageSearch.js";
import { createQueryWriter } from "./imageQueryWriter.js";

const ID1 = "3fa11800-4907-43d0-9921-52ed5ddb22aa";
const ID2 = "19e2e417-a819-4761-b838-d648b92d48ce";

const openverseBody = {
  results: [
    { id: ID1, title: "dog", creator: "Mathias Appel", license: "cc0", license_version: "1.0", thumbnail: `https://api.openverse.org/v1/images/${ID1}/thumb/`, mature: false },
    { id: ID2, title: "Dog <b>1</b>", creator: "Sean MacEntee", license: "by", license_version: "2.0", thumbnail: `https://api.openverse.org/v1/images/${ID2}/thumb/`, mature: false },
    { id: "5e1f9d3a-0000-4000-8000-000000000001", title: "sensitive", license: "by", license_version: "2.0", thumbnail: "https://api.openverse.org/v1/images/x/thumb/", mature: true },
  ],
};

const commonsBody = {
  query: {
    pages: [
      {
        title: "File:Dhole (Asiatic wild dog).jpg",
        index: 2,
        imageinfo: [{ thumburl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Dhole.jpg/400px-Dhole.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Dhole.jpg", extmetadata: { Artist: { value: '<a href="//x">Jane &amp; Co</a>' }, LicenseShortName: { value: "CC BY-SA 4.0" }, Categories: { value: "Dogs|Canidae" } } }],
      },
      {
        title: "File:Nude beach.jpg",
        index: 1,
        imageinfo: [{ thumburl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/x/xy/Nude.jpg/400px-Nude.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Nude.jpg", extmetadata: { Categories: { value: "Beaches" } } }],
      },
      {
        title: "File:Statue.jpg",
        index: 3,
        imageinfo: [{ thumburl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/s/st/Statue.jpg/400px-Statue.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Statue.jpg", extmetadata: { Categories: { value: "Erotic art|Statues" } } }],
      },
    ],
  },
};

type Answer = { status?: number; body?: unknown; hang?: boolean; /** Answers only when this is called. */ gate?: { release: () => void; promise: Promise<void> } };

/** A way to hold an answer back until the test lets it go. */
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => (release = resolve));
  return { release, promise };
}

/** A fetch that answers per host, and counts. */
function fakeFetch(answers: { openverse?: Answer; commons?: Answer; token?: Answer }) {
  const calls: Array<{ url: string; headers?: Record<string, string> }> = [];
  const fn = vi.fn(async (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => {
    calls.push({ url, headers: init?.headers });
    const a = url.includes("auth_tokens") ? answers.token : url.includes("openverse") ? answers.openverse : answers.commons;
    if (!a || a.hang) throw new Error("timeout");
    if (a.gate) await a.gate.promise;
    const status = a.status ?? 200;
    return { ok: status < 400, status, json: async () => a.body };
  });
  /** Changes what a source answers from now on. */
  const setAnswer = (source: "openverse" | "commons" | "token", a: Answer) => void (answers[source] = a);
  return { fn, calls, setAnswer };
}

describe("picture references", () => {
  it("keeps a thumbnail and credit page from Openverse or Commons", () => {
    expect(
      sanitizeImage({ url: `https://api.openverse.org/v1/images/${ID1}/thumb/`, page: `https://openverse.org/image/${ID1}`, by: "  Mathias   Appel ", lic: "CC0 1.0", extra: 1 }),
    ).toEqual({ url: `https://api.openverse.org/v1/images/${ID1}/thumb/`, page: `https://openverse.org/image/${ID1}`, by: "Mathias Appel", lic: "CC0 1.0" });
    // Commons resizes on thumb.wikimedia.org (what its search answers with); upload.wikimedia.org holds the originals
    for (const host of ["thumb.wikimedia.org", "upload.wikimedia.org"]) {
      const url = `https://${host}/wikipedia/commons/thumb/a/ab/Dhole.jpg/400px-Dhole.jpg`;
      expect(sanitizeImage({ url })).toEqual({ url });
    }
  });

  it("refuses a picture from anywhere else, so a shared deck cannot make viewers load an address of its author's choosing", () => {
    for (const url of [
      "https://evil.example/pixel.gif",
      "http://api.openverse.org/v1/images/x/thumb/",
      "https://api.openverse.org.evil.example/x",
      "https://user:pw@api.openverse.org/x",
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "//api.openverse.org/x",
      42,
      null,
    ]) {
      expect(sanitizeImage({ url }), String(url)).toBeNull();
    }
    expect(sanitizeImage("https://api.openverse.org/x")).toBeNull();
    expect(sanitizeImage([])).toBeNull();
  });

  it("drops a credit page that is not Openverse's or Commons', and bounds the text", () => {
    const ref = sanitizeImage({ url: `https://api.openverse.org/v1/images/${ID1}/thumb/`, page: "https://evil.example/", by: "x".repeat(300), lic: "y".repeat(100) })!;
    expect(ref.page).toBeUndefined();
    expect(ref.by).toHaveLength(80);
    expect(ref.lic).toHaveLength(24);
  });

  it("travels with a synced card and in a shared deck, but never from a stranger's host", () => {
    const base = { id: "c1", deckId: "d1", term: "犬", termLang: "ja", definition: "chó", definitionLang: "vi", box: 0, due: 0, right: 0, wrong: 0, createdAt: 1, updatedAt: 2 };
    const image = { url: `https://api.openverse.org/v1/images/${ID1}/thumb/`, by: "Mathias Appel", lic: "CC0 1.0" };
    expect(sanitizeCard({ ...base, image })!.image).toEqual(image);
    expect(sanitizeCard({ ...base, image: { url: "https://evil.example/p.gif" } })!.image).toBeUndefined();
    expect("image" in sanitizeCard(base)!).toBe(false);
    const state = { decks: [{ id: "d1", name: "D", createdAt: 1, updatedAt: 2 }], cards: [sanitizeCard({ ...base, image })!] };
    expect(sharedView(state as never, "d1")!.cards[0]!.image).toEqual(image);
  });
});

describe("query and licence text", () => {
  it("normalises a query the way it is cached", () => {
    expect(normalizeQuery("  To   EAT ")).toBe("to eat");
    expect(normalizeQuery("x".repeat(100))).toHaveLength(60);
    expect(normalizeQuery("   ")).toBe("");
  });
  it("writes a licence the way people read it", () => {
    expect(licenseLabel("by-sa", "4.0")).toBe("CC BY-SA 4.0");
    expect(licenseLabel("cc0", "1.0")).toBe("CC0");
    expect(licenseLabel("pdm", "1.0")).toBe("Public domain");
    expect(licenseLabel(undefined, undefined)).toBeUndefined();
  });
});

describe("picture search", () => {
  it("asks Openverse for safe, reusable pictures and takes turns with Commons", async () => {
    const f = fakeFetch({ openverse: { body: openverseBody }, commons: { body: commonsBody } });
    const { search } = createImageSearch({ fetchFn: f.fn });
    const r = await search("dog", 12);
    const ov = new URL(f.calls.find((c) => c.url.includes("openverse"))!.url);
    expect(ov.searchParams.get("q")).toBe("dog");
    expect(ov.searchParams.get("mature")).toBe("false");
    expect(ov.searchParams.get("license_type")).toBe("commercial,modification");
    expect(r.partial).toBe(false);
    // the sensitive one, the one with a title and the one with a category that does not belong on a study card are gone
    expect(r.results.map((h) => h.source)).toEqual(["openverse", "wikimedia", "openverse"]);
    expect(r.results[0]).toMatchObject({ page: `https://openverse.org/image/${ID1}`, by: "Mathias Appel", lic: "CC0", source: "openverse" });
    expect(r.results[1]).toMatchObject({ by: "Jane & Co", lic: "CC BY-SA 4.0", title: "Dhole (Asiatic wild dog)", source: "wikimedia", page: "https://commons.wikimedia.org/wiki/File:Dhole.jpg" });
    expect(r.results[2]!.title).toBe("Dog 1");
    expect(r.results.every((h) => !!sanitizeImage(h))).toBe(true);
  });

  it("returns no more than asked for", async () => {
    const f = fakeFetch({ openverse: { body: openverseBody }, commons: { body: commonsBody } });
    expect((await createImageSearch({ fetchFn: f.fn }).search("dog", 2)).results).toHaveLength(2);
  });

  it("remembers an answer, and asks one question once even when asked twice at the same time", async () => {
    const f = fakeFetch({ openverse: { body: openverseBody }, commons: { body: commonsBody } });
    const s = createImageSearch({ fetchFn: f.fn });
    await Promise.all([s.search("dog"), s.search("  DOG ")]);
    expect(f.calls).toHaveLength(2); // one per source
    await s.search("dog");
    expect(f.calls).toHaveLength(2);
    await s.search("cat");
    expect(f.calls).toHaveLength(4);
  });

  it("fills in from Commons when Openverse does not answer, and tries Openverse again soon", async () => {
    let t = 1_000_000;
    const f = fakeFetch({ openverse: { hang: true }, commons: { body: commonsBody } });
    const s = createImageSearch({ fetchFn: f.fn, now: () => t });
    const first = await s.search("dog");
    expect(first.partial).toBe(true);
    expect(first.results.map((h) => h.source)).toEqual(["wikimedia"]);
    await s.search("dog");
    expect(f.calls.filter((c) => c.url.includes("openverse"))).toHaveLength(1); // kept for a few minutes
    t += 6 * 60 * 1000;
    await s.search("dog");
    expect(f.calls.filter((c) => c.url.includes("openverse"))).toHaveLength(2); // asked again
  });

  it("tries the missing source again in the background when a half answer is asked for again, and has the full one next time", async () => {
    let t = 1_000_000;
    const slow = gate();
    const f = fakeFetch({ openverse: { hang: true }, commons: { body: commonsBody } });
    const s = createImageSearch({ fetchFn: f.fn, now: () => t, graceMs: 0 });
    expect((await s.search("dog")).partial).toBe(true);
    const asked = () => f.calls.filter((c) => c.url.includes("openverse")).length;
    expect(asked()).toBe(1);
    // too soon: the same answer, nobody asked again
    t += 5_000;
    await s.search("dog");
    expect(asked()).toBe(1);
    // Openverse is back by now: this look-up still answers at once with the half answer, and tries again behind it
    f.setAnswer("openverse", { body: openverseBody, gate: slow });
    t += 20_000;
    expect((await s.search("dog")).partial).toBe(true);
    expect(asked()).toBe(2);
    await s.search("dog");
    expect(asked()).toBe(2); // one retry at a time
    slow.release();
    await vi.waitFor(async () => expect((await s.search("dog")).partial).toBe(false));
  });

  it("keeps a full answer for days", async () => {
    let t = 0;
    const f = fakeFetch({ openverse: { body: openverseBody }, commons: { body: commonsBody } });
    const s = createImageSearch({ fetchFn: f.fn, now: () => t });
    await s.search("dog");
    t += 6 * 24 * 3600 * 1000;
    await s.search("dog");
    expect(f.calls).toHaveLength(2);
    t += 2 * 24 * 3600 * 1000;
    await s.search("dog");
    expect(f.calls).toHaveLength(4);
  });

  it("does not wait for a slow source once the other has answered well, and has the full answer ready when it arrives", async () => {
    const slow = gate();
    const f = fakeFetch({ openverse: { body: openverseBody, gate: slow }, commons: { body: commonsBody } });
    const s = createImageSearch({ fetchFn: f.fn, graceMs: 10 });
    const first = await s.search("dog");
    expect(first.partial).toBe(true);
    expect(first.results.map((h) => h.source)).toEqual(["wikimedia"]);
    // Openverse comes in later; the next look-up has both, without asking anyone again
    slow.release();
    await vi.waitFor(async () => expect((await s.search("dog")).partial).toBe(false));
    expect(f.calls).toHaveLength(2);
    expect((await s.search("dog")).results.map((h) => h.source)).toEqual(["openverse", "wikimedia", "openverse"]);
  });

  it("gives the slow source its moment when it answers within it", async () => {
    const slow = gate();
    const f = fakeFetch({ openverse: { body: openverseBody, gate: slow }, commons: { body: commonsBody } });
    const s = createImageSearch({ fetchFn: f.fn, graceMs: 2000 });
    const pending = s.search("dog");
    setTimeout(() => slow.release(), 20);
    const r = await pending;
    expect(r.partial).toBe(false);
    expect(r.results.map((h) => h.source)).toEqual(["openverse", "wikimedia", "openverse"]);
  });

  it("waits for the other source when the first one to answer had nothing usable", async () => {
    const slow = gate();
    const f = fakeFetch({ openverse: { body: openverseBody, gate: slow }, commons: { status: 500 } });
    const s = createImageSearch({ fetchFn: f.fn, graceMs: 10 });
    const pending = s.search("dog");
    setTimeout(() => slow.release(), 50);
    const r = await pending;
    expect(r.partial).toBe(true);
    expect(r.results.map((h) => h.source)).toEqual(["openverse", "openverse"]);
  });

  it("fails when neither source answers, and does not remember the failure", async () => {
    const f = fakeFetch({ openverse: { status: 504 }, commons: { hang: true } });
    const s = createImageSearch({ fetchFn: f.fn });
    await expect(s.search("dog")).rejects.toThrow();
    await expect(s.search("dog")).rejects.toThrow();
    expect(f.calls).toHaveLength(4);
  });

  it("gives an empty list for an empty query without asking anyone", async () => {
    const f = fakeFetch({});
    expect(await createImageSearch({ fetchFn: f.fn }).search("   ")).toEqual({ query: "", results: [], partial: false });
    expect(f.calls).toHaveLength(0);
  });

  it("uses an Openverse token when credentials are set, fetching it once", async () => {
    const f = fakeFetch({ openverse: { body: openverseBody }, commons: { body: commonsBody }, token: { body: { access_token: "TOKEN", expires_in: 36000 } } });
    const s = createImageSearch({ fetchFn: f.fn, openverseId: "id", openverseSecret: "secret" });
    await s.search("dog");
    await s.search("cat");
    const searches = f.calls.filter((c) => c.url.includes("/images/"));
    expect(searches.every((c) => c.headers?.Authorization === "Bearer TOKEN")).toBe(true);
    expect(f.calls.filter((c) => c.url.includes("auth_tokens"))).toHaveLength(1);
  });

  it("still gets Commons pictures if the Openverse token cannot be had", async () => {
    const f = fakeFetch({ openverse: { body: openverseBody }, commons: { body: commonsBody }, token: { status: 401 } });
    const r = await createImageSearch({ fetchFn: f.fn, openverseId: "id", openverseSecret: "bad" }).search("dog");
    expect(r.partial).toBe(true);
    expect(r.results.map((h) => h.source)).toEqual(["wikimedia"]);
  });
});

describe("keeping out what is not a picture of the word", () => {
  const page = (title: string, index: number, info: Record<string, unknown> = {}) => ({
    title: `File:${title}`,
    index,
    imageinfo: [
      {
        thumburl: `https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/${encodeURIComponent(title)}/400px-x.jpg`,
        descriptionurl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}`,
        width: 1200,
        height: 800,
        extmetadata: { Categories: { value: "Dogs" } },
        ...info,
      },
    ],
  });

  it("asks Commons for bitmaps with scans, diagrams, maps and the like ruled out", async () => {
    const f = fakeFetch({ openverse: { hang: true }, commons: { body: commonsBody } });
    await createImageSearch({ fetchFn: f.fn }).search("be convinced", 6);
    const q = new URL(f.calls.find((c) => !c.url.includes("openverse"))!.url).searchParams;
    const text = q.get("gsrsearch")!;
    expect(text).toContain("filetype:bitmap");
    expect(text).toContain("be convinced");
    for (const term of ['-"book images"', "-diagram", "-map", "-chart", "-logo", "-scan", "-syntax"]) expect(text).toContain(term);
    // more is asked for than is wanted, since some of it is dropped
    expect(q.get("gsrlimit")).toBe("18");
  });

  it("asks Openverse for photographs and illustrations of a decent size", async () => {
    const f = fakeFetch({ openverse: { body: openverseBody }, commons: { hang: true } });
    await createImageSearch({ fetchFn: f.fn }).search("dog");
    const q = new URL(f.calls.find((c) => c.url.includes("openverse"))!.url).searchParams;
    expect(q.get("category")).toBe("photograph,illustration");
    expect(q.get("size")).toBe("medium,large");
  });

  it("drops Commons pictures that are tiny or very long and thin, and keeps those that are fine", async () => {
    const body = {
      query: {
        pages: [
          page("Good dog.jpg", 1),
          page("Tiny dog.jpg", 2, { width: 120, height: 90 }),
          page("Banner of dogs.jpg", 3, { width: 3000, height: 400 }),
          page("Tall strip of dogs.jpg", 4, { width: 300, height: 1500 }),
          page("Dog with no size known.jpg", 5, { width: undefined, height: undefined }),
        ],
      },
    };
    const f = fakeFetch({ openverse: { hang: true }, commons: { body } });
    const r = await createImageSearch({ fetchFn: f.fn }).search("dog");
    expect(r.results.map((h) => h.title)).toEqual(["Good dog", "Dog with no size known"]);
  });

  it("drops results whose title says they are a diagram, a map, a scanned book page or a logo", async () => {
    const titles = ["Syntactic tree diagram of a sentence.png", "Map of the dog parks.png", "Internet Archive Book Images - Dogs page 12.jpg", "Dog club logo.png", "A dog on a beach.jpg"];
    const f = fakeFetch({
      openverse: {
        body: {
          results: titles.map((t, i) => ({
            id: `3fa11800-4907-43d0-9921-52ed5ddb22a${i}`,
            title: t,
            license: "by",
            license_version: "2.0",
            thumbnail: `https://api.openverse.org/v1/images/3fa11800-4907-43d0-9921-52ed5ddb22a${i}/thumb/`,
            mature: false,
          })),
        },
      },
      commons: { body: { query: { pages: titles.map((t, i) => page(t, i + 1)) } } },
    });
    const r = await createImageSearch({ fetchFn: f.fn }).search("dog", 24);
    expect(r.results.map((h) => h.title).sort()).toEqual(["A dog on a beach", "A dog on a beach.jpg"]);
    expect(r.results.map((h) => h.source).sort()).toEqual(["openverse", "wikimedia"]);
  });
});

describe("GET /api/images/search", () => {
  const app = (answers: Parameters<typeof fakeFetch>[0], now?: () => number) => {
    const f = fakeFetch(answers);
    const a = express();
    a.use("/api/images", createImageRouter(createImageSearch({ fetchFn: f.fn }), now));
    a.use((err: { status?: number; code?: string; message: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status ?? 500).json({ error: { code: err.code, message: err.message } });
    });
    return { a, f };
  };

  it("answers with pictures, kept by the browser when the answer is complete", async () => {
    const { a } = app({ openverse: { body: openverseBody }, commons: { body: commonsBody } });
    const res = await request(a).get("/api/images/search").query({ q: "Dog" });
    expect(res.status).toBe(200);
    expect(res.body.query).toBe("dog");
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.headers["cache-control"]).toBe("private, max-age=3600");
  });

  it("does not let the browser keep a half answer", async () => {
    const { a } = app({ openverse: { hang: true }, commons: { body: commonsBody } });
    const res = await request(a).get("/api/images/search").query({ q: "dog" });
    expect(res.body.partial).toBe(true);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("asks for a word, and clamps the number of pictures", async () => {
    const { a, f } = app({ openverse: { body: openverseBody }, commons: { body: commonsBody } });
    expect((await request(a).get("/api/images/search")).status).toBe(400);
    expect((await request(a).get("/api/images/search").query({ q: "   " })).status).toBe(400);
    await request(a).get("/api/images/search").query({ q: "dog", limit: "500" });
    expect(new URL(f.calls.find((c) => c.url.includes("openverse"))!.url).searchParams.get("page_size")).toBe("24");
  });

  it("says so, with a 502, when no source answers", async () => {
    const { a } = app({ openverse: { status: 504 }, commons: { status: 500 } });
    const res = await request(a).get("/api/images/search").query({ q: "dog" });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("IMAGES_UNAVAILABLE");
  });

  it("limits one address to a few dozen searches a minute", async () => {
    let t = 1000;
    const { a } = app({ openverse: { body: openverseBody }, commons: { body: commonsBody } }, () => t);
    for (let i = 0; i < 40; i++) expect((await request(a).get("/api/images/search").query({ q: `w${i}` })).status).toBe(200);
    expect((await request(a).get("/api/images/search").query({ q: "one-more" })).status).toBe(429);
    t += 61_000;
    expect((await request(a).get("/api/images/search").query({ q: "later" })).status).toBe(200);
  });
});

describe("POST /api/images/queries", () => {
  const toolResponse = (queries: string[], picturable = true) => ({
    content: [
      {
        type: "tool_use",
        id: "toolu_1",
        name: "suggest_queries",
        input: { queries, picturable },
      },
    ],
  });

  const fakeAnthropic = (handler: (params: unknown) => Promise<unknown> | unknown) => {
    const calls: unknown[] = [];
    const client = {
      messages: {
        create: vi.fn(async (params: unknown) => {
          calls.push(params);
          return handler(params);
        }),
      },
    };
    return { client, calls };
  };

  const queryApp = (
    handler?: (params: unknown) => Promise<unknown> | unknown,
    now?: () => number,
    opts: { provideWriter?: boolean } = {},
  ) => {
    const fake = handler ? fakeAnthropic(handler) : undefined;
    const writer = opts.provideWriter !== false
      ? createQueryWriter({ client: fake ? fake.client : undefined })
      : undefined;
    const a = express();
    a.use(express.json());
    a.use("/api/images", createImageRouter(createImageSearch({ fetchFn: vi.fn() as any }), writer, now));
    a.use((err: { status?: number; code?: string; message: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status ?? 500).json({ error: { code: err.code, message: err.message } });
    });
    return { a, fake };
  };

  it("answers 400 on bad body", async () => {
    const { a } = queryApp(() => toolResponse(["dog", "puppy"]));
    // missing word
    expect((await request(a).post("/api/images/queries").send({ meanings: ["dog"] })).status).toBe(400);
    // empty word
    expect((await request(a).post("/api/images/queries").send({ word: "   ", meanings: ["dog"] })).status).toBe(400);
    // word too long (> 40 chars)
    expect((await request(a).post("/api/images/queries").send({ word: "x".repeat(41), meanings: ["dog"] })).status).toBe(400);
    // meanings empty
    expect((await request(a).post("/api/images/queries").send({ word: "犬", meanings: [] })).status).toBe(400);
    // meanings > 8 items
    expect((await request(a).post("/api/images/queries").send({ word: "犬", meanings: Array(9).fill("dog") })).status).toBe(400);
    // meaning > 80 chars
    expect((await request(a).post("/api/images/queries").send({ word: "犬", meanings: ["x".repeat(81)] })).status).toBe(400);
    // unknown property rejected
    expect((await request(a).post("/api/images/queries").send({ word: "犬", meanings: ["dog"], extra: 1 })).status).toBe(400);
  });

  it("returns success shape and sanitizes quotes, duplicates, > 60 chars, and digits", async () => {
    const raw = [
      '"man nodding"',
      "man nodding",
      "a very long visual description that goes on and on and exceeds sixty characters in total length",
      "person with 2 dogs",
      "valid scene",
    ];
    const { a } = queryApp(() => toolResponse(raw, true));
    const res = await request(a).post("/api/images/queries").send({
      word: "思い込む",
      reading: "おもいこむ",
      meanings: ["to be convinced", "to assume"],
    });

    expect(res.status).toBe(200);
    expect(res.body.picturable).toBe(true);
    expect(res.body.source).toBe("ai");
    expect(res.body.queries).toEqual([
      "man nodding",
      "a very long visual description that goes on and on and excee",
      "valid scene",
    ]);
  });

  it("does not call the model again on cache hit", async () => {
    const { a, fake } = queryApp(() => toolResponse(["last cookie on plate", "single apple on table"]));
    const payload = { word: "残る", meanings: ["to remain"] };

    const first = await request(a).post("/api/images/queries").send(payload);
    expect(first.status).toBe(200);
    expect(first.body.source).toBe("ai");
    expect(fake?.calls.length).toBe(1);

    const second = await request(a).post("/api/images/queries").send(payload);
    expect(second.status).toBe(200);
    expect(second.body.source).toBe("cache");
    expect(second.body.queries).toEqual(first.body.queries);
    expect(fake?.calls.length).toBe(1);
  });

  it("calls the model once for concurrent identical requests", async () => {
    let release!: () => void;
    const gatePromise = new Promise<void>((r) => (release = r));
    const { a, fake } = queryApp(async () => {
      await gatePromise;
      return toolResponse(["dog", "puppy playing"]);
    });

    const payload = { word: "犬", meanings: ["dog"] };
    const p1 = request(a).post("/api/images/queries").send(payload);
    const p2 = request(a).post("/api/images/queries").send(payload);

    release();
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(fake?.calls.length).toBe(1);
  });

  it("limits one address to 10 requests a minute (429 on 11th)", async () => {
    let t = 2000;
    const { a } = queryApp(
      (params: any) => toolResponse([`phrase a`, `phrase b`]),
      () => t,
    );

    const words = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliet"];
    for (let i = 0; i < 10; i++) {
      const res = await request(a).post("/api/images/queries").send({ word: words[i], meanings: ["meaning"] });
      expect(res.status).toBe(200);
    }

    const blocked = await request(a).post("/api/images/queries").send({ word: "kilo", meanings: ["meaning"] });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");

    t += 61_000;
    const later = await request(a).post("/api/images/queries").send({ word: "lima", meanings: ["meaning"] });
    expect(later.status).toBe(200);
  });

  it("answers 501 AI_UNAVAILABLE when no key / writer is configured", async () => {
    const { a } = queryApp(undefined, undefined, { provideWriter: false });
    const res = await request(a).post("/api/images/queries").send({ word: "犬", meanings: ["dog"] });
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe("AI_UNAVAILABLE");
  });

  it("answers 502 AI_FAILED when the model fails or returns too few valid phrases", async () => {
    // Upstream error
    const failApp = queryApp(async () => {
      throw new Error("Anthropic overloaded");
    });
    const resFail = await request(failApp.a).post("/api/images/queries").send({ word: "犬", meanings: ["dog"] });
    expect(resFail.status).toBe(502);
    expect(resFail.body.error.code).toBe("AI_FAILED");

    // Too few valid phrases (only 1 valid phrase left after dropping digits)
    const fewApp = queryApp(() => toolResponse(["valid phrase", "phrase with 123", "another 456"]));
    const resFew = await request(fewApp.a).post("/api/images/queries").send({ word: "犬", meanings: ["dog"] });
    expect(resFew.status).toBe(502);
    expect(resFew.body.error.code).toBe("AI_FAILED");
  });
});
