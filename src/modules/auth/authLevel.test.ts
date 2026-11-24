import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { config } from "../../config.js";
import { User } from "../../models/User.js";
import { StaticContentRepository } from "../content/StaticContentRepository.js";

const ME = "64b000000000000000000001";
const auth = { Authorization: `Bearer ${jwt.sign({ userId: ME }, config.jwtSecret)}` };

/** A signed-in learner as the sign-in check loads them: a document that can be saved and turned into plain data. */
function signedIn(level?: string) {
  const doc: Record<string, unknown> = { _id: ME, status: "active", email: "a@example.com", displayName: "Linh", password: "secret", jlptLevel: level };
  doc.save = vi.fn(async () => doc);
  doc.toObject = () => ({ ...doc });
  vi.spyOn(User, "findById").mockImplementation((() => ({ then: (ok: (v: unknown) => void) => ok(doc) })) as never);
  return doc;
}

describe("the learner's level on the account", () => {
  let app: ReturnType<typeof createApp>["app"];
  beforeAll(() => {
    const repo = new StaticContentRepository(new URL("../../../../content", import.meta.url).pathname);
    repo.load();
    app = createApp(repo).app;
  });
  afterEach(() => vi.restoreAllMocks());

  it("needs a sign-in", async () => {
    expect((await request(app).put("/api/auth/level").send({ level: "N2" })).status).toBe(401);
  });

  it("saves the chosen level, and each of N1 to N5 and ALL is accepted", async () => {
    for (const level of ["ALL", "N1", "N2", "N3", "N4", "N5"]) {
      const doc = signedIn();
      const res = await request(app).put("/api/auth/level").set(auth).send({ level });
      expect(res.status, level).toBe(200);
      expect(doc.jlptLevel).toBe(level);
      expect(doc.save).toHaveBeenCalled();
      expect(res.body.user.jlptLevel).toBe(level);
      vi.restoreAllMocks();
    }
  });

  it("does not send secrets back", async () => {
    signedIn();
    const res = await request(app).put("/api/auth/level").set(auth).send({ level: "N3" });
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.hasPassword).toBe(true);
  });

  it("rejects anything that is not a level, without saving", async () => {
    for (const body of [{ level: "N6" }, { level: "n2" }, { level: 2 }, { level: "" }, {}]) {
      const doc = signedIn("N4");
      expect((await request(app).put("/api/auth/level").set(auth).send(body)).status, JSON.stringify(body)).toBe(400);
      expect(doc.save).not.toHaveBeenCalled();
      expect(doc.jlptLevel).toBe("N4");
      vi.restoreAllMocks();
    }
  });

  it("comes back with the user on /me, so a new device can start from it", async () => {
    signedIn("N2");
    const res = await request(app).get("/api/auth/me").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.user.jlptLevel).toBe("N2");
  });
});
