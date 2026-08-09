import { Router } from "express";
import passport from "passport";
import { register, login, forgotPassword, resetPassword, getCurrentUser, googleCallback } from "./authController.js";
import { config } from "../../config.js";
import { requireAuth } from "../../shared/middleware/auth.js";

export function createAuthRouter(): Router {
  const router = Router();

  // Local Auth routes
  router.post("/register", register);
  router.post("/login", login);
  router.post("/forgot-password", forgotPassword);
  router.post("/reset-password", resetPassword);

  // Google Auth routes
  router.get(
    "/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    })
  );

  router.get(
    "/google/callback",
    passport.authenticate("google", {
      session: false,
      failureRedirect: "/api/auth/google/failure",
    }),
    googleCallback
  );

  router.get("/google/failure", (_req, res) => {
    res.redirect(`${config.clientUrl}/login?error=google_auth_failed`);
  });

  // Get current user info
  router.get("/me", requireAuth, getCurrentUser);

  return router;
}
