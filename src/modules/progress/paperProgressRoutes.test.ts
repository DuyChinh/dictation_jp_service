import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config } from "../../config.js";
import { PaperProgress } from "../../models/PaperProgress.js";
import { createProgressRouter } from "./progressRoutes.js";

const owner = "64b000000000000000000001";
const other = "64b000000000000000000002";
const token = jwt.sign({ userId: owner }, config.jwtSecret);
const app = express().use(express.json()).use("/api/progress", createProgressRouter());
const change = { lessonId: "jlpt-n1-2021-07", kind: "answer", itemId: "q1", at: 1000,
  value: { choiceId: "2", correct: false, at: 1000, part: "reading", mondai: 10 } };
afterEach(() => vi.restoreAllMocks());

describe("account written progress API", () => {
  it("requires a valid account to read or write", async () => {
    const find = vi.spyOn(PaperProgress, "find");
    const save = vi.spyOn(PaperProgress, "bulkWrite");
    expect((await request(app).get("/api/progress/paper")).status).toBe(401);
    expect((await request(app).post("/api/progress/paper").set("Authorization", "Bearer expired").send({ changes: [change] })).status).toBe(401);
    expect(find).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("returns saved picks and resets only for the signed-in account and requested lesson", async () => {
    const rows = [change, { ...change, itemId: "q2", value: null }];
    const find = vi.spyOn(PaperProgress, "find").mockReturnValue({ lean: async () => rows } as never);
    const res = await request(app).get(`/api/progress/paper/${change.lessonId}?userId=${other}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.changes).toEqual(rows);
    expect(find).toHaveBeenCalledWith({ userId: owner, lessonId: change.lessonId });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("returns every lesson for the home page", async () => {
    const find = vi.spyOn(PaperProgress, "find").mockReturnValue({ lean: async () => [change] } as never);
    const res = await request(app).get("/api/progress/paper").set("Authorization", `Bearer ${token}`);
    expect(res.body.changes).toEqual([change]);
    expect(find).toHaveBeenCalledWith({ userId: owner });
  });

  it("upserts per question with a timestamp guard, including reset tombstones", async () => {
    const save = vi.spyOn(PaperProgress, "bulkWrite").mockResolvedValue({} as never);
    const res = await request(app).post("/api/progress/paper").set("Authorization", `Bearer ${token}`)
      .send({ changes: [{ ...change, userId: other }, { ...change, kind: "sentence", itemId: "s1", value: "good" }, { ...change, itemId: "q2", value: null }] });
    expect(res.status).toBe(200);
    const ops = save.mock.calls[0]![0] as any[];
    expect(ops).toHaveLength(3);
    expect(ops[0].updateOne.filter).toEqual({ userId: owner, lessonId: change.lessonId, kind: "answer", itemId: "q1" });
    expect(ops[0].updateOne.update[0].$set.value.$cond).toEqual([
      { $gte: [{ $literal: 1000 }, { $ifNull: ["$at", 0] }] }, { $literal: change.value }, "$value",
    ]);
    expect(ops[2].updateOne.update[0].$set.value.$cond[1]).toEqual({ $literal: null });
  });

  it.each([
    { ...change, kind: "unknown" }, { ...change, value: { ...change.value, part: "bad" } },
    { ...change, value: { ...change.value, correct: "false" } }, { ...change, kind: "sentence", value: "bad" },
    { ...change, at: -1 }, { ...change, at: Number.MAX_SAFE_INTEGER }, { ...change, lessonId: { $ne: "" } },
  ])("rejects malformed changes without saving", async (bad) => {
    const save = vi.spyOn(PaperProgress, "bulkWrite");
    const res = await request(app).post("/api/progress/paper").set("Authorization", `Bearer ${token}`).send({ changes: [bad] });
    expect(res.status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("reports DB failures so the client retains the outbox", async () => {
    vi.spyOn(PaperProgress, "bulkWrite").mockRejectedValue(new Error("offline"));
    expect((await request(app).post("/api/progress/paper").set("Authorization", `Bearer ${token}`).send({ changes: [change] })).status).toBe(500);
  });
});
