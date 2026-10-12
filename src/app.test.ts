import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { StaticContentRepository } from "./modules/content/StaticContentRepository.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { canAccess } from "./modules/admin/permissions.js";
import { ExamHistory } from "./models/ExamHistory.js";
import { LeaderboardDaily, LeaderboardEntry } from "./models/LeaderboardEntry.js";

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

  it("grades a whole listening sitting at once", async () => {
    const res = await request(app)
      .post("/api/evaluate/listening-exam")
      .send({ lesson_id: "fixture-sample-1", answers: [{ question_id: "fixture-sample-1-m1-q1", choice_id: "1" }] });
    expect(res.status).toBe(200);
    expect(res.body.result).toMatchObject({ scope: "listening", total: 1, answered: 1, correct: 1 });
    expect(res.body.result.items[0]).toMatchObject({
      item_id: "fixture-sample-1-m1-q1",
      no: 1,
      part: "listening",
      mondai: 1,
      section_id: "fixture-sample-1-m1",
      selected: "1",
      correct_choice_id: "1",
      correct: true,
    });
  });

  it("scores unanswered and wrong listening questions, and rejects unknown ones", async () => {
    const blank = await request(app).post("/api/evaluate/listening-exam").send({ lesson_id: "fixture-sample-1", answers: [] });
    expect(blank.body.result).toMatchObject({ total: 1, answered: 0, correct: 0 });
    expect(blank.body.result.items[0]).toMatchObject({ selected: null, correct: false });
    const wrong = await request(app)
      .post("/api/evaluate/listening-exam")
      .send({ lesson_id: "fixture-sample-1", answers: [{ question_id: "fixture-sample-1-m1-q1", choice_id: "3" }] });
    expect(wrong.body.result).toMatchObject({ answered: 1, correct: 0 });
    const unknown = await request(app)
      .post("/api/evaluate/listening-exam")
      .send({ lesson_id: "fixture-sample-1", answers: [{ question_id: "nope", choice_id: "1" }] });
    expect(unknown.status).toBe(404);
    const noLesson = await request(app).post("/api/evaluate/listening-exam").send({ lesson_id: "nope", answers: [] });
    expect(noLesson.status).toBe(404);
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

  it("keeps listening attempts local for signed-out learners", async () => {
    const list = await request(app).get("/api/progress/listening-attempts/fixture-sample-1");
    expect(list.status).toBe(200);
    expect(list.body.attempts).toEqual([]);
    const save = await request(app).post("/api/progress/listening-attempts").send({ id: "a1", lessonId: "x" });
    expect(save.body.localOnly).toBe(true);
  });

  it("keeps exam history local for signed-out learners", async () => {
    const list = await request(app).get("/api/progress/exam-history");
    expect(list.status).toBe(200);
    expect(list.body.history).toEqual([]);
    const save = await request(app).post("/api/progress/exam-history").send({ lessonId: "x", startedAt: 1000 });
    expect(save.status).toBe(200);
    expect(save.body.localOnly).toBe(true);
  });

  it("lists the leaderboard and marks the caller's own row", async () => {
    const token = jwt.sign({ userId: "64b000000000000000000001" }, config.jwtSecret);
    const rows = [
      { _id: "a", name: "Top Learner", points: 5000 },
      { _id: "b", name: "Me", points: 1200, avatar: "https://img/x.png" },
    ];
    const findSpy = vi.spyOn(LeaderboardEntry, "find").mockReturnValue({
      sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve(rows) }) }) }),
    } as any);
    const countSpy = vi.spyOn(LeaderboardEntry, "countDocuments").mockImplementation((async (q: any) =>
      q?.$or ? 1 : 200) as any);
    const oneSpy = vi.spyOn(LeaderboardEntry, "findOne").mockReturnValue({
      lean: () => Promise.resolve(rows[1]),
    } as any);

    const res = await request(app).get("/api/leaderboard?limit=2").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(200);
    expect(res.body.entries.map((e: any) => [e.rank, e.isMe])).toEqual([
      [1, false],
      [2, true],
    ]);
    expect(res.body.entries[0]).not.toHaveProperty("userId");
    expect(res.body.me).toMatchObject({ rank: 2, points: 1200 });

    const weekly = vi.spyOn(LeaderboardDaily, "aggregate").mockImplementation((async (stages: any[]) => {
      if (stages.some((st) => st.$facet)) {
        return [{ rows: [{ _id: "b", points: 340, name: "Me", avatar: null }], total: [{ n: 57 }] }];
      }
      if (stages.some((st) => st.$count)) return [{ n: 11 }];
      return [{ points: 340 }];
    }) as any);
    const week = await request(app).get("/api/leaderboard?period=week&limit=5").set("Authorization", `Bearer ${token}`);
    expect(week.status).toBe(200);
    expect(week.body.total).toBe(57);
    expect(week.body.participants).toBe(200);
    expect(week.body.entries).toEqual([{ rank: 1, name: "Me", avatar: null, points: 340, isMe: true }]);
    expect(week.body.me).toMatchObject({ rank: 12, points: 340 });
    weekly.mockRestore();

    const guest = await request(app).get("/api/leaderboard");
    expect(guest.status).toBe(200);
    expect(guest.body.me).toBeNull();

    findSpy.mockRestore();
    countSpy.mockRestore();
    oneSpy.mockRestore();
  });

  it("manages exam history for authenticated learner in DB", async () => {
    const learnerToken = jwt.sign({ userId: "64b000000000000000000001", email: "a@example.com" }, config.jwtSecret);
    const mockRow = {
      lessonId: "jlpt-n2-2022-07",
      scope: "all",
      minutes: 105,
      startedAt: 1000,
      submittedAt: 5000,
      total: 105,
      answered: 105,
      correct: 90,
      result: { total: 105, answered: 105, correct: 90, items: [] },
    };

    const findSpy = vi.spyOn(ExamHistory, "find").mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve([mockRow]),
      }),
    } as any);

    const list = await request(app)
      .get("/api/progress/exam-history")
      .set("Authorization", `Bearer ${learnerToken}`);
    expect(list.status).toBe(200);
    expect(list.body.history).toHaveLength(1);
    expect(list.body.history[0].lessonId).toBe("jlpt-n2-2022-07");
    expect(list.body.history[0].result).toBeDefined();

    const updateSpy = vi.spyOn(ExamHistory, "findOneAndUpdate").mockResolvedValue({} as any);
    const existsSpy = vi.spyOn(ExamHistory, "exists").mockResolvedValue(null);
    const awardSpy = vi.spyOn(LeaderboardEntry, "findOneAndUpdate").mockResolvedValue({ _id: "e1", lastGain: 500 } as any);
    const dailySpy = vi.spyOn(LeaderboardDaily, "updateOne").mockResolvedValue({} as any);
    const save = await request(app)
      .post("/api/progress/exam-history")
      .set("Authorization", `Bearer ${learnerToken}`)
      .send({
        lessonId: "jlpt-n2-2022-07",
        startedAt: 1000,
        submittedAt: 5000,
        minutes: 105,
        total: 105,
        answered: 105,
        correct: 90,
        result: { total: 105 },
      });
    expect(save.status).toBe(200);
    expect(save.body.success).toBe(true);
    expect(updateSpy).toHaveBeenCalled();
    // A new sitting earns points: 50 for taking it plus 5 for each of the 90 right answers.
    expect(awardSpy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(awardSpy.mock.calls[0]![1])).toContain("500");
    expect(dailySpy).toHaveBeenCalledWith({ entryId: "e1", day: expect.any(String) }, { $inc: { points: 500 } }, { upsert: true });
    existsSpy.mockResolvedValue({ _id: "x" } as any);
    await request(app)
      .post("/api/progress/exam-history")
      .set("Authorization", `Bearer ${learnerToken}`)
      .send({ lessonId: "jlpt-n2-2022-07", startedAt: 1000, submittedAt: 5000, total: 105, answered: 105, correct: 90 });
    expect(awardSpy).toHaveBeenCalledTimes(1);

    const deleteSpy = vi.spyOn(ExamHistory, "deleteOne").mockResolvedValue({ deletedCount: 1 } as any);
    const del = await request(app)
      .delete("/api/progress/exam-history/jlpt-n2-2022-07/1000")
      .set("Authorization", `Bearer ${learnerToken}`);
    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(1);

    const bulkSpy = vi.spyOn(ExamHistory, "bulkWrite").mockResolvedValue({} as any);
    const imp = await request(app)
      .post("/api/progress/import")
      .set("Authorization", `Bearer ${learnerToken}`)
      .send({
        examHistory: [{ lessonId: "jlpt-n2-2022-07", startedAt: 1000, submittedAt: 5000 }],
      });
    expect(imp.status).toBe(200);
    expect(imp.body.imported.examHistory).toBe(1);

    findSpy.mockRestore();
    updateSpy.mockRestore();
    existsSpy.mockRestore();
    awardSpy.mockRestore();
    dailySpy.mockRestore();
    deleteSpy.mockRestore();
    bulkSpy.mockRestore();
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
    const upload = await request(app).post("/api/admin/feedback/images").send({ image: "data:image/png;base64,AAAA" });
    expect(upload.status).toBe(401);
    const video = await request(app).post("/api/admin/feedback/video-upload");
    expect(video.status).toBe(401);
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
