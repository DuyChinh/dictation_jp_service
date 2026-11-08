import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { config } from "../../config.js";
import * as mongo from "../../database/mongo.js";
import { Admin } from "../../models/Admin.js";
import { TrafficHour } from "../../models/TrafficHour.js";
import { StaticContentRepository } from "../content/StaticContentRepository.js";

const ADMIN_ID = "64b000000000000000000001";
const token = jwt.sign({ typ: "admin", adminId: ADMIN_ID, tv: 0 }, config.adminJwtSecret);
const app = createApp(new StaticContentRepository("/unused")).app;

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(new Date("2026-11-10T17:30:00Z").getTime());
  vi.spyOn(mongo, "getMongoStatus").mockReturnValue({ connected: true, configured: true, readyState: 1 });
  vi.spyOn(Admin, "findById").mockResolvedValue({ _id: ADMIN_ID, status: "active", tokenVersion: 0, role: "support" } as never);
});
afterEach(() => vi.restoreAllMocks());

describe("traffic recording", () => {
  it("counts a guest view in the server's current hour without storing client data", async () => {
    const write = vi.spyOn(TrafficHour, "updateOne").mockResolvedValue({} as never);
    const res = await request(app).post("/api/traffic/view").send({ date: "2000-01-01", path: "/private?token=secret", views: 100 });
    expect(res.status).toBe(204);
    expect(write).toHaveBeenCalledExactlyOnceWith(
      { _id: new Date("2026-11-10T17:00:00Z") }, { $inc: { views: 1 } }, { upsert: true },
    );
  });

  it("preserves a view when simultaneous first writes race on the hour", async () => {
    const write = vi.spyOn(TrafficHour, "updateOne")
      .mockRejectedValueOnce({ code: 11000 }).mockResolvedValueOnce({} as never);
    expect((await request(app).post("/api/traffic/view")).status).toBe(204);
    expect(write).toHaveBeenLastCalledWith({ _id: new Date("2026-11-10T17:00:00Z") }, { $inc: { views: 1 } });
  });

  it("fails promptly without buffering writes when MongoDB is disconnected", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(mongo, "getMongoStatus").mockReturnValue({ connected: false, configured: false, readyState: 0 });
    const write = vi.spyOn(TrafficHour, "updateOne");
    expect((await request(app).post("/api/traffic/view")).status).toBe(503);
    expect(write).not.toHaveBeenCalled();
  });
});

describe("admin hourly traffic", () => {
  it("requires an admin token and rejects a learner token", async () => {
    const read = vi.spyOn(TrafficHour, "find");
    expect((await request(app).get("/api/admin/traffic")).status).toBe(401);
    const learner = jwt.sign({ userId: ADMIN_ID }, config.jwtSecret);
    expect((await request(app).get("/api/admin/traffic").set("Authorization", `Bearer ${learner}`)).status).toBe(401);
    expect(read).not.toHaveBeenCalled();
  });

  it("uses the Vietnam calendar day, excludes the next midnight and fills all 24 hours", async () => {
    const read = vi.spyOn(TrafficHour, "find").mockReturnValue({ lean: async () => [
      { _id: new Date("2026-11-10T17:00:00Z"), views: 4 },
      { _id: new Date("2026-11-11T16:00:00Z"), views: 7 },
    ] } as never);
    const res = await request(app).get("/api/admin/traffic").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(read).toHaveBeenCalledWith({ _id: { $gte: new Date("2026-11-10T17:00:00Z"), $lt: new Date("2026-11-11T17:00:00Z") } });
    expect(res.body).toMatchObject({ date: "2026-11-11", timeZone: "Asia/Ho_Chi_Minh", total: 11 });
    expect(res.body.series).toHaveLength(24);
    expect(res.body.series[0]).toEqual({ hour: 0, views: 4 });
    expect(res.body.series[1]).toEqual({ hour: 1, views: 0 });
    expect(res.body.series[23]).toEqual({ hour: 23, views: 7 });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("returns zeros for a selected historical day with no traffic", async () => {
    vi.spyOn(TrafficHour, "find").mockReturnValue({ lean: async () => [] } as never);
    const res = await request(app).get("/api/admin/traffic?date=2024-02-29").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.date).toBe("2024-02-29");
    expect(res.body.total).toBe(0);
    expect(res.body.series).toEqual(Array.from({ length: 24 }, (_, hour) => ({ hour, views: 0 })));
  });

  it.each(["2026-02-29", "2026-02-30", "2026-13-01", "2026-1-1", "invalid", "", "2026-11-11&date=2026-11-10"])("rejects invalid date %s", async (date) => {
    const read = vi.spyOn(TrafficHour, "find");
    const res = await request(app).get(`/api/admin/traffic?date=${date}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(read).not.toHaveBeenCalled();
  });
});
