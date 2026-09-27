import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { Admin } from "../../../models/Admin.js";
import { AppError } from "../../../shared/errors.js";
import {
  checkLockout,
  clearFailures,
  hashPassword,
  recordFailure,
  requireAdmin,
  signAdminToken,
  toAdminView,
} from "../adminAuth.js";
import { ah, audit, currentAdmin, parseBody } from "../helpers.js";

// Compared against when the username doesn't exist, so a miss takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const loginBody = z.object({
  username: z.string().trim().toLowerCase().min(1).max(60),
  password: z.string().min(1).max(200),
});

const passwordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export function createAdminAuthRouter(): Router {
  const r = Router();

  r.post(
    "/login",
    ah(async (req, res) => {
      const { username, password } = parseBody(loginBody, req.body);
      checkLockout(username);

      const admin = await Admin.findOne({ username });
      const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
      if (!admin || !ok) {
        recordFailure(username);
        await audit(req, admin, "login_failed", username);
        throw new AppError("INVALID_CREDENTIALS", "Wrong username or password", 401);
      }
      if (admin.status !== "active") {
        throw new AppError("ACCOUNT_DISABLED", "This admin account is disabled", 403);
      }

      clearFailures(username);
      admin.lastLoginAt = new Date();
      await admin.save();
      await audit(req, admin, "login");
      res.json({ token: signAdminToken(admin), admin: toAdminView(admin) });
    }),
  );

  r.get("/me", requireAdmin, (_req, res) => {
    res.json({ admin: toAdminView(currentAdmin(res)) });
  });

  r.post(
    "/password",
    requireAdmin,
    ah(async (req, res) => {
      const { currentPassword, newPassword } = parseBody(passwordBody, req.body);
      const admin = currentAdmin(res);
      if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) {
        throw new AppError("INVALID_CREDENTIALS", "Current password is wrong", 400);
      }
      admin.passwordHash = await hashPassword(newPassword);
      admin.tokenVersion += 1;
      await admin.save();
      await audit(req, admin, "password_change", admin.username);
      // Other sessions end; this one continues on a fresh token.
      res.json({ token: signAdminToken(admin), admin: toAdminView(admin) });
    }),
  );

  return r;
}
