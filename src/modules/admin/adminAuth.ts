import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { config } from "../../config.js";
import { Admin, type IAdmin } from "../../models/Admin.js";
import { AppError } from "../../shared/errors.js";
import { canAccess, ROLE_ACCESS, type AdminArea } from "./permissions.js";

const TOKEN_TTL = "8h";
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

type AdminClaims = { typ: "admin"; adminId: string; tv: number };

export function signAdminToken(admin: IAdmin): string {
  const claims: AdminClaims = { typ: "admin", adminId: String(admin._id), tv: admin.tokenVersion };
  return jwt.sign(claims, config.adminJwtSecret, { expiresIn: TOKEN_TTL });
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** What the admin UI needs to know about the signed-in admin. */
export function toAdminView(admin: IAdmin) {
  return {
    id: String(admin._id),
    username: admin.username,
    displayName: admin.displayName,
    role: admin.role,
    status: admin.status,
    lastLoginAt: admin.lastLoginAt ?? null,
    createdAt: admin.createdAt,
    permissions: ROLE_ACCESS[admin.role],
  };
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AppError("UNAUTHORIZED", "Admin sign-in required", 401);
    let claims: AdminClaims;
    try {
      claims = jwt.verify(header.slice(7), config.adminJwtSecret) as AdminClaims;
    } catch {
      throw new AppError("UNAUTHORIZED", "Admin session expired", 401);
    }
    // Learner tokens are signed with the same secret by default; only admin-typed tokens pass.
    if (claims?.typ !== "admin" || !mongoose.isValidObjectId(claims.adminId)) {
      throw new AppError("UNAUTHORIZED", "Admin sign-in required", 401);
    }
    const admin = await Admin.findById(claims.adminId);
    if (!admin || admin.status !== "active" || admin.tokenVersion !== claims.tv) {
      throw new AppError("UNAUTHORIZED", "Admin session expired", 401);
    }
    res.locals.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePerm(area: AdminArea, need: "read" | "write") {
  return (_req: Request, res: Response, next: NextFunction) => {
    const admin = res.locals.admin as IAdmin | undefined;
    if (!admin || !canAccess(admin.role, area, need)) {
      next(new AppError("FORBIDDEN", "Your role can't do this", 403));
      return;
    }
    next();
  };
}

/** Failed sign-ins per username; in memory, so it resets when the service restarts. */
const failures = new Map<string, { count: number; lockedUntil: number }>();

export function checkLockout(username: string): void {
  const f = failures.get(username);
  if (f && f.lockedUntil > Date.now()) {
    const minutes = Math.ceil((f.lockedUntil - Date.now()) / 60000);
    throw new AppError("LOCKED", `Too many failed attempts. Try again in ${minutes} min`, 429);
  }
}

export function recordFailure(username: string): void {
  const f = failures.get(username) ?? { count: 0, lockedUntil: 0 };
  if (f.lockedUntil && f.lockedUntil <= Date.now()) f.count = 0;
  f.count += 1;
  f.lockedUntil = f.count >= MAX_FAILURES ? Date.now() + LOCKOUT_MS : 0;
  failures.set(username, f);
}

export function clearFailures(username: string): void {
  failures.delete(username);
}

/** Creates the super admin named in ADMIN_USERNAME / ADMIN_PASSWORD if it doesn't exist yet. */
export async function seedAdmin(): Promise<void> {
  if (!config.adminUsername || !config.adminPassword) return;
  if (mongoose.connection.readyState !== 1) return;
  const existing = await Admin.findOne({ username: config.adminUsername });
  if (existing) return;
  await Admin.create({
    username: config.adminUsername,
    displayName: config.adminUsername,
    passwordHash: await hashPassword(config.adminPassword),
    role: "super_admin",
  });
  console.log(`[admin] created super admin "${config.adminUsername}"`);
}
