import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { StaticContentRepository } from "./modules/content/StaticContentRepository.js";
import { createApp } from "./app.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../content",
);

describe("backend content + evaluate API", () => {
  let app: ReturnType<typeof createApp>["app"];

  beforeAll(() => {
    const repo = new StaticContentRepository(root);
    const { loaded, errors } = repo.load();
    expect(errors.filter((e) => e.includes("sample"))).toEqual([]);
    expect(loaded).toBeGreaterThanOrEqual(1);
    app = createApp(repo).app;
  });

  it("health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.content_lessons).toBeGreaterThanOrEqual(1);
  });

  it("lists published lessons", async () => {
    const res = await request(app).get("/api/content/lessons");
    expect(res.status).toBe(200);
    const ids = res.body.lessons.map((l: { id: string }) => l.id);
    expect(ids).toContain("fixture-sample-1");
  });

  it("practice payload strips correct flags", async () => {
    const res = await request(app).get(
      "/api/content/lessons/fixture-sample-1/practice",
    );
    expect(res.status).toBe(200);
    const q = res.body.practice.sections[0].questions[0];
    expect(q.choices[0].correct).toBeUndefined();
    expect(q.choices[0].explanation).toBeUndefined();
    expect(q.choices[0].text.ja).toBeTruthy();
  });

  it("evaluates listening wrong choice and reveals", async () => {
    const res = await request(app)
      .post("/api/evaluate/listening")
      .send({
        lesson_id: "fixture-sample-1",
        question_id: "fixture-sample-1-m1-q1",
        answer: { choice_id: "2" },
      });
    expect(res.status).toBe(200);
    expect(res.body.result.correct).toBe(false);
    expect(res.body.result.correct_choice_id).toBe("1");
    expect(res.body.result.evidence_segments.length).toBeGreaterThan(0);
  });

  it("evaluates dictation exact match", async () => {
    const res = await request(app)
      .post("/api/evaluate/dictation")
      .send({
        lesson_id: "fixture-sample-1",
        question_id: "fixture-sample-1-m1-q1",
        segment_id: "fixture-sample-1-m1-q1-s5",
        mode: "sentence_dictation",
        answer: { raw: "はい、分かりました。" },
      });
    expect(res.status).toBe(200);
    expect(res.body.result.score).toBe(100);
  });

  it("audio range request", async () => {
    const res = await request(app)
      .get("/api/audio/fixture-sample-1")
      .set("Range", "bytes=0-99");
    expect(res.status).toBe(206);
    expect(res.headers["content-range"]).toMatch(/bytes 0-99\//);
    expect(res.headers["content-type"]).toMatch(/audio/);
  });
});
