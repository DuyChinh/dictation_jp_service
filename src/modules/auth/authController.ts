import { Request, Response } from "express";
import { authService } from "./authService.js";
import { config } from "../../config.js";

export async function register(req: Request, res: Response) {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: { message: "Missing required fields" } });
    }

    const user = await authService.register(email, password, displayName);
    const token = authService.generateToken(user);
    
    // Hide password before sending
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res.status(201).json({ user: userResponse, token });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(400).json({ error: { message: error.message || "Registration failed" } });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { message: "Missing email or password" } });
    }

    const { user, token } = await authService.login(email, password);
    
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res.json({ user: userResponse, token });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(401).json({ error: { message: error.message || "Login failed" } });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: { message: "Email is required" } });
    }

    const resetToken = await authService.generateResetToken(email);
    
    // In a real app, send this via email. For now, log it so the developer can see it.
    const resetUrl = `${config.clientUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    console.log(`[AUTH] Password reset link for ${email}: ${resetUrl}`);

    res.json({ message: "If that email is registered, a reset link has been generated." });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    // Don't leak whether the email exists
    res.json({ message: "If that email is registered, a reset link has been generated." });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: { message: "Missing required fields" } });
    }

    await authService.resetPassword(token, email, newPassword);
    res.json({ message: "Password has been successfully reset" });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(400).json({ error: { message: error.message || "Reset password failed" } });
  }
}

export function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } });
  }

  const userResponse = (req.user as any).toObject ? (req.user as any).toObject() : { ...req.user };
  delete userResponse.password;
  delete userResponse.resetPasswordToken;
  delete userResponse.resetPasswordExpires;

  res.json({ user: userResponse });
}

export function googleCallback(req: Request, res: Response) {
  const user = req.user as any;
  
  if (!user) {
    return res.redirect(`${config.clientUrl}/login?error=google_auth_failed`);
  }

  try {
    const token = authService.generateToken(user);
    res.redirect(`${config.clientUrl}/auth/google/callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error("Error generating token:", error);
    res.redirect(`${config.clientUrl}/login?error=jwt_generation_failed`);
  }
}
