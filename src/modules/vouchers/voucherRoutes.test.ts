import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { config } from "../../config.js";
import { StaticContentRepository } from "../content/StaticContentRepository.js";
import { User } from "../../models/User.js";
import { UserVoucher } from "../../models/UserVoucher.js";
import { VOUCHER_SOURCES, newVoucherCode, voucherView } from "./voucherRoutes.js";

const ME = "64b000000000000000000001";
const token = jwt.sign({ userId: ME }, config.jwtSecret);
const lean = <T,>(v: T) => ({ lean: async () => v, sort() { return this; } }) as never;
const row = (extra: Record<string, unknown> = {}) => ({
  userId: ME, source: "support_video", code: "KAITIQ10-ABCDEF", discountType: "percent", discountValue: 10,
  expiresAt: null, usedAt: null, createdAt: new Date("2026-11-23T00:00:00Z"), ...extra,
});

describe("voucher helpers", () => {
  it("makes readable, distinct codes with the source's prefix", () => {
    const codes = new Set(Array.from({ length: 300 }, () => newVoucherCode("KAITIQ10")));
    expect(codes.size).toBe(300);
    for (const c of codes) expect(c).toMatch(/^KAITIQ10-[A-HJ-NP-Z2-9]{6}$/);
  });
  it("gives 10% off for supporting the video", () => {
    expect(VOUCHER_SOURCES.support_video).toMatchObject({ discountType: "percent", discountValue: 10 });
  });
  it("shows a voucher without internals, and flags a spent one", () => {
    expect(voucherView(row() as never)).toEqual({
      source: "support_video", code: "KAITIQ10-ABCDEF", discountType: "percent", discountValue: 10,
      expiresAt: null, used: false, createdAt: "2026-11-23T00:00:00.000Z",
    });
    expect(voucherView(row({ usedAt: new Date() }) as never).used).toBe(true);
  });
});

describe("voucher API", () => {
  let app: ReturnType<typeof createApp>["app"];
  beforeAll(() => {
    const repo = new StaticContentRepository(new URL("../../../../content", import.meta.url).pathname);
    repo.load();
    app = createApp(repo).app;
  });
  afterEach(() => vi.restoreAllMocks());

  const signedIn = () => vi.spyOn(User, "findById").mockImplementation((() => ({ then: (ok: (v: unknown) => void) => ok({ _id: ME, status: "active" }) })) as never);
  const auth = { Authorization: `Bearer ${token}` };

  it("needs a sign-in", async () => {
    expect((await request(app).get("/api/vouchers/me")).status).toBe(401);
    expect((await request(app).post("/api/vouchers/claim")).status).toBe(401);
  });

  it("lists the user's vouchers", async () => {
    signedIn();
    vi.spyOn(UserVoucher, "find").mockReturnValue(lean([row()]));
    const res = await request(app).get("/api/vouchers/me").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.vouchers).toHaveLength(1);
    expect(res.body.vouchers[0]).toMatchObject({ code: "KAITIQ10-ABCDEF", discountValue: 10, used: false });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("saves a new 10% voucher on the first claim", async () => {
    signedIn();
    vi.spyOn(UserVoucher, "findOne").mockReturnValue(lean(null));
    const create = vi.spyOn(UserVoucher, "create").mockImplementation((async (d: Record<string, unknown>) => row(d)) as never);
    const res = await request(app).post("/api/vouchers/claim").set(auth).send({});
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ source: "support_video", discountType: "percent", discountValue: 10 }));
    expect(res.body.voucher.code).toMatch(/^KAITIQ10-/);
  });

  it("returns the voucher already held instead of making a second one", async () => {
    signedIn();
    vi.spyOn(UserVoucher, "findOne").mockReturnValue(lean(row()));
    const create = vi.spyOn(UserVoucher, "create");
    const res = await request(app).post("/api/vouchers/claim").set(auth).send({ source: "support_video" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ created: false, voucher: { code: "KAITIQ10-ABCDEF" } });
    expect(create).not.toHaveBeenCalled();
  });

  it("hands back the winner's voucher when two claims race", async () => {
    signedIn();
    vi.spyOn(UserVoucher, "findOne").mockReturnValueOnce(lean(null)).mockReturnValueOnce(lean(row()));
    vi.spyOn(UserVoucher, "create").mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));
    const res = await request(app).post("/api/vouchers/claim").set(auth).send({});
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);
  });

  it("rejects an unknown source", async () => {
    signedIn();
    const res = await request(app).post("/api/vouchers/claim").set(auth).send({ source: "free_money" });
    expect(res.status).toBe(400);
  });
});
