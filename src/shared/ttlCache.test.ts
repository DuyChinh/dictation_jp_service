import { describe, expect, it, vi } from "vitest";
import { createTtlCache } from "./ttlCache.js";

describe("createTtlCache", () => {
  it("returns a value until it expires", () => {
    let t = 0;
    const cache = createTtlCache<number>({ ttlMs: 100, now: () => t });
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    t = 99;
    expect(cache.get("a")).toBe(1);
    t = 100;
    expect(cache.get("a")).toBeUndefined();
  });

  it("shares one load between concurrent callers and caches the result", async () => {
    const cache = createTtlCache<number>({ ttlMs: 1000 });
    const loader = vi.fn(async () => 42);
    const [a, b, c] = await Promise.all([cache.load("k", loader), cache.load("k", loader), cache.load("k", loader)]);
    expect([a, b, c]).toEqual([42, 42, 42]);
    expect(await cache.load("k", loader)).toBe(42);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed load", async () => {
    const cache = createTtlCache<number>({ ttlMs: 1000 });
    await expect(cache.load("k", async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(await cache.load("k", async () => 7)).toBe(7);
  });

  it("drops the oldest entry when full", () => {
    const cache = createTtlCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("delete forgets a key", () => {
    const cache = createTtlCache<number>({ ttlMs: 1000 });
    cache.set("a", 1);
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
  });
});
