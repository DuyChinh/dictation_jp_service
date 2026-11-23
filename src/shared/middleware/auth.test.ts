import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../../config.js";
import { User } from "../../models/User.js";
import { invalidateAuthUser, requireAuth, requireAuthFresh } from "./auth.js";

const id = new mongoose.Types.ObjectId().toString();
const token = jwt.sign({ userId: id }, config.jwtSecret);
const bearer = { Authorization: `Bearer ${token}` };

const app = express();
app.get("/cached", requireAuth, (req, res) => res.json({ name: req.user!.displayName, status: req.user!.status }));
app.get("/fresh", requireAuthFresh, (req, res) => res.json({ name: req.user!.displayName }));

function userDoc(patch: Record<string, unknown> = {}) {
  return new User({ _id: id, email: "a@b.c", displayName: "Hana", ...patch });
}

let find: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  invalidateAuthUser(id);
  find = vi.spyOn(User, "findById").mockImplementation((() => Promise.resolve(userDoc())) as never);
});
afterEach(() => vi.restoreAllMocks());

describe("requireAuth user cache", () => {
  it("reads the database once for repeated requests from the same user", async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/cached").set(bearer);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ name: "Hana", status: "active" });
    }
    expect(find).toHaveBeenCalledTimes(1);
  });

  it("reads again after the user is invalidated, so a lock takes effect at once", async () => {
    expect((await request(app).get("/cached").set(bearer)).status).toBe(200);
    find.mockImplementation((() => Promise.resolve(userDoc({ status: "locked" }))) as never);
    invalidateAuthUser(id);
    const res = await request(app).get("/cached").set(bearer);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("never caches a missing user", async () => {
    find.mockImplementation((() => Promise.resolve(null)) as never);
    expect((await request(app).get("/cached").set(bearer)).status).toBe(401);
    find.mockImplementation((() => Promise.resolve(userDoc())) as never);
    expect((await request(app).get("/cached").set(bearer)).status).toBe(200);
  });

  it("rejects a missing or bad token without touching the database", async () => {
    expect((await request(app).get("/cached")).status).toBe(401);
    expect((await request(app).get("/cached").set({ Authorization: "Bearer nope" })).status).toBe(401);
    expect(find).not.toHaveBeenCalled();
  });
});

describe("requireAuthFresh", () => {
  it("always reads the database and drops the cached copy", async () => {
    expect((await request(app).get("/cached").set(bearer)).status).toBe(200);
    expect(find).toHaveBeenCalledTimes(1);
    expect((await request(app).get("/fresh").set(bearer)).status).toBe(200);
    expect((await request(app).get("/fresh").set(bearer)).status).toBe(200);
    expect(find).toHaveBeenCalledTimes(3);
    // the fresh call invalidated the snapshot, so the next cached call reads again
    expect((await request(app).get("/cached").set(bearer)).status).toBe(200);
    expect(find).toHaveBeenCalledTimes(4);
  });
});
