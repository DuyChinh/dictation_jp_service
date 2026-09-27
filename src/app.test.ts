import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { StaticContentRepository } from "./modules/content/StaticContentRepository.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { canAccess } from "./modules/admin/permissions.js";

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

  it("handles progress requests gracefully without auth", async () => {
    const postRes = await request(app)
      .post("/api/progress/dictation")
      .send({
        lesson_id: "fixture-sample-1",
        question_id: "fixture-sample-1-m1-q1",
        segment_id: "fixture-sample-1-m1-q1-s5",
        status: "correct",
        score: 100,
      });
    expect(postRes.status).toBe(200);
    expect(postRes.body.localOnly).toBe(true);

    const getRes = await request(app).get("/api/progress/lesson/fixture-sample-1");
    expect(getRes.status).toBe(200);
    expect(getRes.body.progress).toEqual({});
  });

  it("keeps listening answers local without auth", async () => {
    const postRes = await request(app)
      .post("/api/progress/listening")
      .send({ lesson_id: "fixture-sample-1", question_id: "q1", choice_id: "1", correct: true });
    expect(postRes.status).toBe(200);
    expect(postRes.body.localOnly).toBe(true);

    const getRes = await request(app).get("/api/progress/listening/fixture-sample-1");
    expect(getRes.status).toBe(200);
    expect(getRes.body.answers).toEqual({});

    const delRes = await request(app).delete("/api/progress/listening/fixture-sample-1?question_ids=q1");
    expect(delRes.status).toBe(200);
    expect(delRes.body.localOnly).toBe(true);
  });

  it("keeps lesson activity local without auth", async () => {
    const postRes = await request(app).post("/api/progress/activity").send({ lesson_id: "fixture-sample-1" });
    expect(postRes.status).toBe(200);
    expect(postRes.body.localOnly).toBe(true);

    const getRes = await request(app).get("/api/progress/activity");
    expect(getRes.status).toBe(200);
    expect(getRes.body.activity).toEqual({});
  });

  it("returns an empty progress overview without auth", async () => {
    const res = await request(app).get("/api/progress/overview");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ dictation: {}, listening: {} });
  });

  it("refuses to import progress without auth", async () => {
    const res = await request(app).post("/api/progress/import").send({ dictation: [], sessions: [], listening: [] });
    expect(res.status).toBe(401);
  });

  it("keeps the admin API closed without an admin token", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });

  it("does not accept a learner token on the admin API", async () => {
    const learnerToken = jwt.sign({ userId: "64b000000000000000000001", email: "a@example.com" }, config.jwtSecret);
    const res = await request(app).get("/api/admin/overview").set("Authorization", `Bearer ${learnerToken}`);
    expect(res.status).toBe(401);
  });

  it("needs a learner sign-in to post, like, react, reply, upload, edit or delete feedback", async () => {
    const post = await request(app).post("/api/feedback").send({ category: "idea", body: "More N1 tests please" });
    expect(post.status).toBe(401);
    const like = await request(app).post("/api/feedback/64b000000000000000000001/like");
    expect(like.status).toBe(401);
    const edit = await request(app).patch("/api/feedback/64b000000000000000000001").send({ body: "Edited text" });
    expect(edit.status).toBe(401);
    const del = await request(app).delete("/api/feedback/64b000000000000000000001");
    expect(del.status).toBe(401);
    const react = await request(app).post("/api/feedback/64b000000000000000000001/react").send({ emoji: "🎉" });
    expect(react.status).toBe(401);
    const reply = await request(app).post("/api/feedback/64b000000000000000000001/replies").send({ body: "Agree!" });
    expect(reply.status).toBe(401);
    const upload = await request(app).post("/api/feedback/images").send({ image: "data:image/png;base64,AAAA" });
    expect(upload.status).toBe(401);
  });

  it("keeps feedback moderation in the admin API", async () => {
    const res = await request(app).get("/api/admin/feedback");
    expect(res.status).toBe(401);
    expect(canAccess("support", "feedback", "write")).toBe(true);
    expect(canAccess("content", "feedback", "write")).toBe(false);
    expect(canAccess("accountant", "feedback", "read")).toBe(false);
  });

  it("gives each admin role only its own areas", () => {
    expect(canAccess("super_admin", "admins", "write")).toBe(true);
    expect(canAccess("content", "users", "read")).toBe(false);
    expect(canAccess("content", "content", "write")).toBe(true);
    expect(canAccess("support", "payments", "read")).toBe(true);
    expect(canAccess("support", "payments", "write")).toBe(false);
    expect(canAccess("accountant", "catalog", "write")).toBe(true);
    expect(canAccess("accountant", "admins", "read")).toBe(false);
  });
});
