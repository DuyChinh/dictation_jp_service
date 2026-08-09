import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User, IUser } from "../../models/User.js";
import { config } from "../../config.js";

export interface GoogleProfile {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
}

export class AuthService {
  async register(email: string, password: string, displayName: string): Promise<IUser> {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      email,
      password: hashedPassword,
      displayName,
      authProvider: "local",
    });

    await user.save();
    return user;
  }

  async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (user.authProvider === "google" && !user.password) {
      throw new Error("Please login with Google or reset your password to set one");
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  async generateResetToken(email: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(resetToken, 10);

    user.resetPasswordToken = hash;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    return resetToken;
  }

  async resetPassword(token: string, email: string, newPassword: string): Promise<void> {
    const user = await User.findOne({ 
      email,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user || !user.resetPasswordToken) {
      throw new Error("Invalid or expired password reset token");
    }

    const isValid = await bcrypt.compare(token, user.resetPasswordToken);
    if (!isValid) {
      throw new Error("Invalid or expired password reset token");
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // In case they were a Google user previously, they now have a local password.
    // We can keep authProvider as 'google' or change to 'local'. Let's keep it as is,
    // they just have a password now.
    await user.save();
  }

  generateToken(user: IUser): string {
    const payload = {
      userId: user._id,
      email: user.email,
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: "7d",
    });
  }

  async findOrCreateGoogleUser(profile: GoogleProfile): Promise<IUser> {
    // 1. Try to find by Google ID
    let user = await User.findOne({ googleId: profile.id });
    if (user) {
      return user;
    }

    // 2. Try to find by email
    user = await User.findOne({ email: profile.email });
    if (user) {
      // Link Google ID to existing account
      user.googleId = profile.id;
      // We don't overwrite the authProvider if it was "local", but we might update avatar
      if (!user.avatar && profile.avatar) {
        user.avatar = profile.avatar;
      }
      await user.save();
      return user;
    }

    // 3. Create new user
    user = new User({
      googleId: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatar: profile.avatar,
      authProvider: "google",
    });

    await user.save();
    return user;
  }
}

export const authService = new AuthService();
