import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StaticContentRepository } from "./modules/content/StaticContentRepository.js";
import { createApp } from "./app.js";

const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../content/fixtures/sample-lesson",
);
const LESSON = "fixture-sample-1";

const explain = "Giải thích đủ dài để qua kiểm tra.";
const choices = (correct: string) =>
  ["1", "2", "3", "4"].map((id) => ({ id, text: `c${id}`, correct: id === correct, explanation_vi: explain }));

function paper(status: string) {
  return {
    schema_version: 1,
    id: `${LESSON}-paper`,
    lesson_id: LESSON,
    status,
    content_version: 1,
    source: { level: "N2", year: 2025, month: 12 },
    items: [
      {
        id: `${LESSON}-v-q1`, no: 1, part: "vocab", mondai: 1, type: "mcq",
        stem: { ja: "柱はしっかりしている。", vi: "Cột rất vững.", target: "柱" },
        choices: choices("3"), summary_vi: "Tóm tắt", point_tags: ["vocab:柱"],
        vocab: [{ word: "柱", reading: "はしら", meaning_vi: "cột" }],
      },
      {
        id: `${LESSON}-g-q2`, no: 2, part: "grammar", mondai: 8, type: "sort_star",
        stem: { ja: "＿ ＿ ★ ＿", vi: "Câu." }, choices: choices("1"), summary_vi: "Tóm tắt", point_tags: ["g:x"],
        sort: { slots: ["a", "b", "c", "d"], star_index: 2 },
      },
      {
        id: `${LESSON}-r-q3`, no: 3, part: "reading", mondai: 10, type: "mcq", passage_id: `${LESSON}-r-p1`,
        stem: { ja: "筆者の考えは？", vi: "Tác giả nghĩ gì?" }, choices: choices("2"),
        summary_vi: "Tóm tắt", point_tags: ["reading:main-idea"], evidence_sentence_ids: [`${LESSON}-r-p1-s1`],
      },
    ],
    passages: [
      {
        id: `${LESSON}-r-p1`, mondai: 10, kind: "cloze", full_translation_vi: "Chợ không chỉ là nơi tụ tập.",
        sentences: [
          {
            id: `${LESSON}-r-p1-s1`,
            ja: "市場はただ集まる場ではない。",
            ja_blank: "市場は（　）集まる場ではない。",
            vi: "Chợ không chỉ là nơi tụ tập.",
            notes: "（注1）市場：いちば",
            notes_vi: "（注1）市場：いちば = chợ",
            chunks: [
              { ja: "市場は", vi: "chợ", accept_vi: ["thị trường"] },
              { ja: "ただ集まる場ではない", vi: "không chỉ là nơi tụ tập", accept_vi: [] },
            ],
            pitfalls: [{ wrong_vi: ["chỉ là nơi tụ tập"], explanation_vi: "ではない phủ định cả vế." }],
          },
        ],
      },
    ],
  };
}

describe("written part (paper.json) API", () => {
  let dir: string;
  let app: ReturnType<typeof createApp>["app"];
  let draftApp: ReturnType<typeof createApp>["app"];

  function build(status: string) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "paper-"));
    const lessonDir = path.join(root, "jlpt", "n2", "2025-12");
    fs.mkdirSync(lessonDir, { recursive: true });
    for (const f of ["listening.json", "listening.mp3"]) fs.copyFileSync(path.join(fixture, f), path.join(lessonDir, f));
    fs.writeFileSync(path.join(lessonDir, "paper.json"), JSON.stringify(paper(status)));
    const repo = new StaticContentRepository(root);
    repo.load();
    return { root, app: createApp(repo).app };
  }

  const roots: string[] = [];
  beforeAll(() => {
    const a = build("verified");
    const b = build("draft");
    dir = a.root;
    roots.push(a.root, b.root);
    app = a.app;
    draftApp = b.app;
  });
  afterAll(() => {
    for (const r of roots) fs.rmSync(r, { recursive: true, force: true });
  });

  it("reports the written part on the lesson", async () => {
    const res = await request(app).get(`/api/content/lessons/${LESSON}`);
    expect(res.body.lesson.paper.counts).toEqual({ vocab: 1, grammar: 1, reading: 1 });
    const list = await request(app).get("/api/content/lessons");
    expect(list.body.lessons.find((l: { id: string }) => l.id === LESSON).paper.counts.reading).toBe(1);
    expect(dir).toBeTruthy();
  });

  it("practice payload withholds answers, explanations, translations and the arrangement", async () => {
    const res = await request(app).get(`/api/content/lessons/${LESSON}/paper`);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    for (const secret of ["correct", "explanation_vi", "summary_vi", "Cột rất vững", "slots", "chunks", "full_translation_vi", "evidence_sentence_ids", "point_tags"]) {
      expect(body).not.toContain(secret);
    }
    const item = res.body.paper.items[0];
    expect(item.stem.target).toBe("柱");
    expect(item.choices).toHaveLength(4);
  });

  it("cloze passages show the blank, not the answer", async () => {
    const res = await request(app).get(`/api/content/lessons/${LESSON}/paper`);
    expect(res.body.paper.passages[0].sentences[0].text).toBe("市場は（　）集まる場ではない。");
  });

  it("footnotes are shown as printed; Vietnamese glosses only come with the translation", async () => {
    const practice = await request(app).get(`/api/content/lessons/${LESSON}/paper`);
    const sentence = practice.body.paper.passages[0].sentences[0];
    expect(sentence.notes).toBe("（注1）市場：いちば");
    expect(JSON.stringify(practice.body)).not.toContain("= chợ");
    const tr = await request(app).get(`/api/content/lessons/${LESSON}/paper/passages/${LESSON}-r-p1/translation`);
    expect(tr.body.translation.sentences[0].notes_vi).toBe("（注1）市場：いちば = chợ");
  });

  it("is hidden while the paper is still a draft", async () => {
    expect((await request(draftApp).get(`/api/content/lessons/${LESSON}/paper`)).status).toBe(404);
    const detail = await request(draftApp).get(`/api/content/lessons/${LESSON}`);
    expect(detail.body.lesson.paper).toBeNull();
  });

  it("answers an item and reveals all four explanations", async () => {
    const wrong = await request(app).post("/api/evaluate/paper-item").send({ lesson_id: LESSON, item_id: `${LESSON}-v-q1`, choice_id: "1" });
    expect(wrong.body.result.correct).toBe(false);
    expect(wrong.body.result.correct_choice_id).toBe("3");
    expect(wrong.body.result.choices).toHaveLength(4);
    expect(wrong.body.result.choices[0].explanation_vi).toBe(explain);
    const right = await request(app).post("/api/evaluate/paper-item").send({ lesson_id: LESSON, item_id: `${LESSON}-v-q1`, choice_id: "3" });
    expect(right.body.result.correct).toBe(true);
    expect(right.body.result.summary_vi).toBe("Tóm tắt");
  });

  it("returns the arrangement of a ★ question only after answering", async () => {
    const res = await request(app).post("/api/evaluate/paper-item").send({ lesson_id: LESSON, item_id: `${LESSON}-g-q2`, choice_id: "1" });
    expect(res.body.result.sort).toEqual({ slots: ["a", "b", "c", "d"], star_index: 2 });
  });

  it("rejects unknown items and bad choices", async () => {
    expect((await request(app).post("/api/evaluate/paper-item").send({ lesson_id: LESSON, item_id: "nope", choice_id: "1" })).status).toBe(404);
    expect((await request(app).post("/api/evaluate/paper-item").send({ lesson_id: LESSON, item_id: `${LESSON}-v-q1`, choice_id: "9" })).status).toBe(400);
    expect((await request(draftApp).post("/api/evaluate/paper-item").send({ lesson_id: LESSON, item_id: `${LESSON}-v-q1`, choice_id: "1" })).status).toBe(404);
  });

  it("grades a timed sitting at once and counts unanswered questions as wrong", async () => {
    const answers = [
      { item_id: `${LESSON}-v-q1`, choice_id: "3" },
      { item_id: `${LESSON}-g-q2`, choice_id: "4" },
    ];
    const all = await request(app).post("/api/evaluate/paper-exam").send({ lesson_id: LESSON, scope: "all", answers });
    expect(all.status).toBe(200);
    expect(all.body.result).toMatchObject({ total: 3, answered: 2, correct: 1 });
    expect(all.body.result.items.map((i: { correct: boolean }) => i.correct)).toEqual([true, false, false]);
    expect(all.body.result.items[1].correct_choice_id).toBe("1");
    expect(all.body.result.items[2].selected).toBeNull();

    const vocab = await request(app).post("/api/evaluate/paper-exam").send({ lesson_id: LESSON, scope: "vocab", answers });
    expect(vocab.body.result).toMatchObject({ total: 1, answered: 1, correct: 1 });
  });

  it("rejects an exam with unknown questions, bad choices or a draft paper", async () => {
    const bad = (answers: unknown) => request(app).post("/api/evaluate/paper-exam").send({ lesson_id: LESSON, scope: "all", answers });
    expect((await bad([{ item_id: "nope", choice_id: "1" }])).status).toBe(404);
    expect((await bad([{ item_id: `${LESSON}-v-q1`, choice_id: "9" }])).status).toBe(400);
    const draft = await request(draftApp).post("/api/evaluate/paper-exam").send({ lesson_id: LESSON, scope: "all", answers: [] });
    expect(draft.status).toBe(404);
  });

  it("analyses a translation chunk by chunk", async () => {
    const sid = `${LESSON}-r-p1-s1`;
    const ok = await request(app).post("/api/evaluate/translation").send({ lesson_id: LESSON, sentence_id: sid, text: "Chợ không chỉ là nơi tụ tập." });
    expect(ok.body.result.analysis.verdict).toBe("good");
    expect(ok.body.result.reference.vi).toBe("Chợ không chỉ là nơi tụ tập.");
    const bad = await request(app).post("/api/evaluate/translation").send({ lesson_id: LESSON, sentence_id: sid, text: "Chợ chỉ là nơi tụ tập." });
    expect(bad.body.result.analysis.chunks.map((c: { hit: boolean }) => c.hit)).toEqual([true, false]);
    expect(bad.body.result.analysis.pitfalls).toHaveLength(1);
  });

  it("serves a passage translation", async () => {
    const res = await request(app).get(`/api/content/lessons/${LESSON}/paper/passages/${LESSON}-r-p1/translation`);
    expect(res.body.translation.sentences[0].vi).toBe("Chợ không chỉ là nơi tụ tập.");
    expect(res.body.translation.sentences[0].ja).toBe("市場はただ集まる場ではない。");
  });
});
