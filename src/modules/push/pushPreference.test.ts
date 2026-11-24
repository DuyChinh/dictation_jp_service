import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { config } from "../../config.js";
import { PushSubscription } from "../../models/PushSubscription.js";
import { User } from "../../models/User.js";
import { StaticContentRepository } from "../content/StaticContentRepository.js";

const ME = "64b000000000000000000001";
const auth = { Authorization: `Bearer ${jwt.sign({ userId: ME }, config.jwtSecret)}` };

/** What the sign-in check reads, and what the route reads with .select().lean(). */
const asUser = (extra: Record<string, unknown> = {}) =>
  vi.spyOn(User, "findById").mockImplementation((() => ({
    select() {
      return this;
    },
    lean: async () => ({ _id: ME, ...extra }),
    then: (ok: (v: unknown) => void) => ok({ _id: ME, status: "active", ...extra }),
  })) as never);
const latestSubscription = (row: Record<string, unknown> | null) =>
  vi.spyOn(PushSubscription, "findOne").mockReturnValue({
    sort() {
      return this;
    },
    select() {
      return this;
    },
    lean: async () => row,
  } as never);

describe("reminder time on the account", () => {
  let app: ReturnType<typeof createApp>["app"];
  beforeAll(() => {
    const repo = new StaticContentRepository(new URL("../../../../content", import.meta.url).pathname);
    repo.load();
    app = createApp(repo).app;
  });
  afterEach(() => vi.restoreAllMocks());

  it("needs a sign-in", async () => {
    expect((await request(app).get("/api/push/preference")).status).toBe(401);
    expect((await request(app).put("/api/push/preference").send({ hour: 8, minute: 0 })).status).toBe(401);
  });

  it("gives the time kept on the account, so a new device starts from it", async () => {
    asUser({ reminderTime: { hour: 23, minute: 30 } });
    const res = await request(app).get("/api/push/preference").set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ time: { hour: 23, minute: 30 } });
  });

  it("falls back to the latest browser's time for accounts that set one before it was kept on the account", async () => {
    asUser();
    latestSubscription({ hour: 21, minute: 15 });
    expect((await request(app).get("/api/push/preference").set(auth)).body).toEqual({ time: { hour: 21, minute: 15 } });
  });

  it("treats a browser saved before minutes existed as on the hour", async () => {
    asUser();
    latestSubscription({ hour: 20 });
    expect((await request(app).get("/api/push/preference").set(auth)).body).toEqual({ time: { hour: 20, minute: 0 } });
  });

  it("has no time when the learner never chose one", async () => {
    asUser();
    latestSubscription(null);
    expect((await request(app).get("/api/push/preference").set(auth)).body).toEqual({ time: null });
  });

  it("saves the time on the account and moves every browser of the account to it", async () => {
    asUser();
    const user = vi.spyOn(User, "updateOne").mockResolvedValue({} as never);
    const subs = vi.spyOn(PushSubscription, "updateMany").mockResolvedValue({} as never);
    const res = await request(app).put("/api/push/preference").set(auth).send({ hour: 7, minute: 45 });
    expect(res.status).toBe(200);
    expect(user).toHaveBeenCalledWith({ _id: ME }, { $set: { reminderTime: { hour: 7, minute: 45 } } });
    expect(subs).toHaveBeenCalledWith({ userId: ME }, { $set: { hour: 7, minute: 45 } });
  });

  it("rejects a time that is not on the clock", async () => {
    asUser();
    const user = vi.spyOn(User, "updateOne").mockResolvedValue({} as never);
    for (const body of [{ hour: 24, minute: 0 }, { hour: 8, minute: 60 }, { hour: -1, minute: 0 }, { hour: 8.5, minute: 0 }, { hour: 8 }, {}]) {
      expect((await request(app).put("/api/push/preference").set(auth).send(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(user).not.toHaveBeenCalled();
  });
});
