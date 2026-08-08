import { Router } from "express";
import passport from "passport";
import { googleCallback, getCurrentUser } from "./authController.js";
import { requireAuth } from "../../shared/middleware/auth.js";
import { config } from "../../config.js";

export function createAuthRouter(): Router {
  const router = Router();

  // Redirect to Google for authentication
  router.get(
    "/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    })
  );

  // Google callback route
  router.get(
    "/google/callback",
    passport.authenticate("google", {
      session: false,
      failureRedirect: "/api/auth/google/failure", // We'll intercept failures in controller if we could, but passport handles it here
    }),
    googleCallback
  );

  // Endpoint to handle failure from passport directly (if needed)
  router.get("/google/failure", (_req, res) => {
    res.redirect(`${config.clientUrl}/login?error=google_auth_failed`);
  });

  // Get current user info
  router.get("/me", requireAuth, getCurrentUser);

  return router;
}
