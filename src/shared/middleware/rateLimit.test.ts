import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../errors.js";
import { createRateLimiter } from "./rateLimit.js";

function hit(limiter: ReturnType<typeof createRateLimiter>, ip: string) {
  const next = vi.fn();
  limiter({ ip } as Request, {} as never, next);
  return next.mock.calls[0]?.[0];
}

describe("createRateLimiter", () => {
  it("lets an address through up to the cap, then answers 429", () => {
    const limiter = createRateLimiter({ max: 2 });
    expect(hit(limiter, "1.1.1.1")).toBeUndefined();
    expect(hit(limiter, "1.1.1.1")).toBeUndefined();
    const err = hit(limiter, "1.1.1.1");
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(429);
  });

  it("counts each address separately", () => {
    const limiter = createRateLimiter({ max: 1 });
    expect(hit(limiter, "1.1.1.1")).toBeUndefined();
    expect(hit(limiter, "2.2.2.2")).toBeUndefined();
    expect(hit(limiter, "1.1.1.1")).toBeInstanceOf(AppError);
  });

  it("forgets hits once the window has passed", () => {
    let t = 0;
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: () => t });
    expect(hit(limiter, "1.1.1.1")).toBeUndefined();
    expect(hit(limiter, "1.1.1.1")).toBeInstanceOf(AppError);
    t = 1001;
    expect(hit(limiter, "1.1.1.1")).toBeUndefined();
  });
});
