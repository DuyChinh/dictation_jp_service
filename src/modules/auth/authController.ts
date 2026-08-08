import { Request, Response } from "express";
import { authService } from "./authService.js";
import { IUser } from "../../models/User.js";
import { config } from "../../config.js";

export function googleCallback(req: Request, res: Response) {
  // Passport injects the user into req.user
  const user = req.user as IUser | undefined;
  
  if (!user) {
    // If authentication failed
    return res.redirect(`${config.clientUrl}/login?error=google_auth_failed`);
  }

  try {
    const token = authService.generateToken(user);
    
    // We redirect to a specific callback page on the frontend
    // The frontend will extract the token from the URL, save it to localStorage,
    // and remove it from the browser history for security.
    res.redirect(`${config.clientUrl}/auth/google/callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error("Error generating token:", error);
    res.redirect(`${config.clientUrl}/login?error=jwt_generation_failed`);
  }
}

export function getCurrentUser(req: Request, res: Response) {
  // This endpoint expects a middleware to have set req.user (or similar) from JWT
  // For MVP, we just return what we have
  if (!req.user) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } });
  }

  // Hide sensitive info if necessary
  res.json({ user: req.user });
}
