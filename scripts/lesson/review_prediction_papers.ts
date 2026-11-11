/** Review authored content through the same schema, loader and APIs used in production.
 * MONGODB_URI= NODE_ENV=production npx tsx scripts/lesson/review_prediction_papers.ts
 */
import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { checkPaper, PaperPackageSchema } from "@jd/content-schema";
import { analyzeTranslation } from "@jd/evaluation";
import { createApp } from "../../src/app.js";
import { config } from "../../src/config.js";
import { StaticContentRepository } from "../../src/modules/content/StaticContentRepository.js";

const contentRoot = fileURLToPath(new URL("../../content/", import.meta.url));
const bundle = path.join(contentRoot, "predictions-2026-12");
const manifest = JSON.parse(fs.readFileSync(path.join(bundle, "written-manifest.json"), "utf8")) as {
  lessons: Array<{ id: string; file: string }>;
};
assert.deepEqual(config.allowStatuses, ["published"], "Run with NODE_ENV=production");
const repo = new StaticContentRepository(contentRoot);
const loaded = repo.load();
const { app } = createApp(repo);
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
// Reuse one local listener throughout the review instead of opening one per request.
const api = request(server);
try {
  const results = [];
  let totalQuestions = 0;
  let totalSentences = 0;
  const readingTexts = new Set<string>();
  const catalog = await api.get("/api/content/lessons?kind=practice");
  assert.equal(catalog.status, 200);

  for (const lesson of manifest.lessons) {
    const paper = PaperPackageSchema.parse(JSON.parse(fs.readFileSync(path.join(contentRoot, lesson.file), "utf8")));
    assert.deepEqual(checkPaper(paper), [], lesson.id);
    assert.equal(paper.lesson_id, lesson.id);
    assert.equal(paper.status, "published");
    assert.equal(paper.items.length, 40);
    assert.deepEqual(paper.items.map((item) => item.no), Array.from({ length: 40 }, (_, i) => i + 1));
    const passages = new Map(paper.passages.map((p) => [p.id, p]));
    assert(catalog.body.lessons.some((item: { id: string }) => item.id === lesson.id), `Missing catalog entry ${lesson.id}`);
    assert(!loaded.errors.some((message) => message.includes(lesson.id) || message.includes(lesson.file)), lesson.id);
    assert(repo.getPaper(lesson.id, ["published"]), `Not loaded: ${lesson.id}`);

    const practice = await api.get(`/api/content/lessons/${lesson.id}/paper`);
    assert.equal(practice.status, 200);
    assert.deepEqual(practice.body.paper.counts, { vocab: 16, grammar: 16, reading: 8 });
    assert(!/"(?:correct|correct_choice_id|explanation_vi|summary_vi|stem_vi|chunks|sort)":/.test(JSON.stringify(practice.body)));

    const counts = [0, 0, 0, 0];
    for (const item of paper.items) {
      assert.equal(new Set(item.choices.map((choice) => choice.text)).size, 4, `${item.id}: repeated choice`);
      const correct = item.choices.find((choice) => choice.correct)!;
      counts[Number(correct.id) - 1]++;
      const checked = await api.post("/api/evaluate/paper-item")
        .send({ lesson_id: lesson.id, item_id: item.id, choice_id: correct.id });
      assert.equal(checked.status, 200, `${item.id}: ${JSON.stringify(checked.body)} ${checked.text.slice(0, 200)}`);
      assert.equal(checked.body.result.correct, true, item.id);
      assert.equal(checked.body.result.choices.length, 4);
      if (item.sort) {
        assert.equal(item.sort.slots.length, 4);
        assert.equal(correct.text, item.sort.slots[item.sort.star_index], item.id);
        assert.deepEqual([...item.sort.slots].sort(), item.choices.map((choice) => choice.text).sort());
        assert.equal((item.stem.ja.match(/＿＿|★/g) ?? []).length, 4);
      }
      if (item.type === "cloze_blank") {
        const passage = passages.get(item.passage_id!)!;
        const sentence = passage.sentences.find((s) => s.ja_blank === item.stem.ja);
        assert(sentence, `${item.id}: missing numbered blank in passage`);
        assert(item.evidence_sentence_ids.includes(sentence.id), `${item.id}: missing own evidence`);
        assert.equal(sentence.ja_blank!.replace(`（${item.no}）`, correct.text), sentence.ja, `${item.id}: wrong completed sentence`);
        const servedPassage = practice.body.paper.passages.find((p: { id: string }) => p.id === passage.id);
        const servedSentence = servedPassage.sentences.find((s: { id: string }) => s.id === sentence.id);
        assert.equal(servedSentence.text, sentence.ja_blank, `${item.id}: answer exposed in practice`);
      }
    }
    assert.deepEqual(counts, [10, 10, 10, 10]);

    for (const passage of paper.passages) {
      if (passage.kind !== "cloze") {
        const text = passage.sentences.map((s) => s.ja).join("");
        assert(!readingTexts.has(text), `${passage.id}: reused reading passage`);
        readingTexts.add(text);
      }
      const translation = await api.get(`/api/content/lessons/${lesson.id}/paper/passages/${passage.id}/translation`);
      assert.equal(translation.status, 200);
      assert.equal(translation.body.translation.sentences.length, passage.sentences.length);
      for (const sentence of passage.sentences) {
        assert(!/（\s*）|＿＿|★/.test(sentence.ja), `${sentence.id}: incomplete reference sentence`);
        assert.equal(sentence.chunks.map((chunk) => chunk.ja).join(""), sentence.ja, `${sentence.id}: chunk order/gaps`);
        const reference = analyzeTranslation(sentence.vi!, sentence);
        assert.equal(reference.coverage, 1, `${sentence.id}: reference translation fails its own chunks`);
        assert.equal(reference.pitfalls.length, 0, `${sentence.id}: false pitfall on correct translation`);
        for (const chunk of sentence.chunks) {
          for (const alias of chunk.accept_vi) {
            assert.equal(analyzeTranslation(alias, { chunks: [chunk], pitfalls: [] }).coverage, 1, sentence.id);
          }
        }
        for (const pitfall of sentence.pitfalls) {
          assert(analyzeTranslation(pitfall.wrong_vi[0]!, sentence).pitfalls.length > 0, `${sentence.id}: trap not detected`);
        }
        totalSentences++;
      }
      const sentence = passage.sentences[0]!;
      const drill = await api.post("/api/evaluate/translation")
        .send({ lesson_id: lesson.id, sentence_id: sentence.id, text: sentence.vi });
      assert.equal(drill.status, 200);
      assert.equal(drill.body.result.analysis.coverage, 1);
    }

    for (const scope of ["all", "vocab", "grammar", "reading"] as const) {
      const wanted = scope === "all" ? paper.items : paper.items.filter((item) => item.part === scope);
      const answers = wanted.map((item) => ({ item_id: item.id, choice_id: item.choices.find((choice) => choice.correct)!.id }));
      const full = await api.post("/api/evaluate/paper-exam").send({ lesson_id: lesson.id, scope, answers });
      assert.equal(full.status, 200);
      assert(full.body.result, `${lesson.id} ${scope}: ${JSON.stringify(full.body)}`);
      assert.equal(full.body.result.correct, wanted.length);
      const blank = await api.post("/api/evaluate/paper-exam").send({ lesson_id: lesson.id, scope, answers: [] });
      assert.equal(blank.status, 200);
      assert.equal(blank.body.result.correct, 0);
      assert.equal(blank.body.result.answered, 0);
    }
    totalQuestions += paper.items.length;
    results.push({ id: lesson.id, schema_errors: 0, questions: 40, answer_distribution: counts,
      catalog: true, practice_without_answers: true, cloze_blanks_hidden: true,
      star_answers_match_order: true, all_item_reviews: true, all_exam_scopes: true,
      full_score: 40, blank_score: 0, translation_reference_coverage: 1 });
  }

  const reviewedDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const report = { reviewed_date: reviewedDate, scope: "Original condensed written practice, 10 papers",
    validation: "Production status filter; local schema/loader/API checks; no database connection",
    questions: totalQuestions, reading_and_cloze_sentences: totalSentences,
    limitations: ["Not a full-length official test simulation", "Difficulty has not been calibrated with learners", "Editorial self-review; no independent Japanese-language reviewer"],
    lessons: results };
  fs.writeFileSync(path.join(bundle, "written-review.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
