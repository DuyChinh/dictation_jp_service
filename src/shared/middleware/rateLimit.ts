import type { RequestHandler } from "express";
import { AppError } from "../errors.js";

const WINDOW_MS = 60_000;

/** A per-address limiter to protect upstream APIs (and this small server) from being hammered. */
export function createRateLimiter(opts: {
  max: number;
  windowMs?: number;
  code?: string;
  message?: string;
  now?: () => number;
}): RequestHandler {
  const windowMs = opts.windowMs ?? WINDOW_MS;
  const max = opts.max;
  const code = opts.code ?? "RATE_LIMITED";
  const message = opts.message ?? "Too many requests, try again in a minute";
  const now = opts.now ?? Date.now;
  const hits = new Map<string, number[]>();

  return (req, _res, next) => {
    const t = now();
    const key = req.ip ?? "unknown";
    const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
    if (recent.length >= max) return next(new AppError(code, message, 429));
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (v.every((at) => t - at >= windowMs)) hits.delete(k);
    next();
  };
}
