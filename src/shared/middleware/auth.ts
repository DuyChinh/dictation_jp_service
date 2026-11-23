import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";
import { User, IUser } from "../../models/User.js";
import { createTtlCache } from "../ttlCache.js";

// Extend Express User interface to include IUser properties
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends IUser {}
  }
}

/**
 * Most requests only need to know who is calling, so the user row is kept for a short while instead of
 * being read from MongoDB on every call. A request gets its own document built from that snapshot, so
 * nothing is shared between requests. The catch is staleness: a lock, plan change or edit made on another
 * server instance can take up to AUTH_CACHE_TTL_MS to show up here (0 turns the cache off).
 */
const userCache = createTtlCache<Record<string, unknown>>({
  ttlMs: config.authCacheTtlMs,
  maxEntries: 5000,
});

/** Forget a cached user, so their next request reads the database. */
export function invalidateAuthUser(userId: unknown): void {
  userCache.delete(String(userId));
}

async function loadUser(userId: string, useCache: boolean): Promise<IUser | null> {
  // Routes that change the user get the document straight from the database, exactly as before.
  if (!useCache || config.authCacheTtlMs <= 0) return User.findById(userId);

  const hit = userCache.get(userId);
  if (hit) return User.hydrate(hit) as unknown as IUser;

  // A miss reads the document exactly as before; only its plain copy is kept for the next requests.
  const doc = await User.findById(userId);
  if (doc && typeof doc.toObject === "function") {
    userCache.set(userId, doc.toObject() as unknown as Record<string, unknown>);
  }
  return doc;
}

function makeRequireAuth(useCache: boolean) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid token" } });
      }

      const token = authHeader.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };

      if (!useCache) {
        // The caller is about to change this user: drop any snapshot now and again once the response
        // is out, so other requests never see the old values for longer than this call.
        invalidateAuthUser(decoded.userId);
        res.on("finish", () => invalidateAuthUser(decoded.userId));
      }

      // Find user
      const user = await loadUser(decoded.userId, useCache);
      if (!user) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found or deleted" } });
      }
      if (user.status === "locked") {
        return res.status(401).json({ error: { code: "ACCOUNT_LOCKED", message: "This account has been locked" } });
      }

      // Attach to request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } });
    }
  };
}

/** Signed-in callers only; reads the user through the short-lived cache. */
export const requireAuth = makeRequireAuth(true);

/** For routes that change the user (profile, password, avatar) or must see current data: never cached. */
export const requireAuthFresh = makeRequireAuth(false);

/** Like requireAuth, but a missing or bad token just leaves req.user unset. */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();
  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], config.jwtSecret) as { userId: string };
    const user = await loadUser(decoded.userId, true);
    if (user && user.status !== "locked") req.user = user;
  } catch {
    // treated as signed out
  }
  next();
};
