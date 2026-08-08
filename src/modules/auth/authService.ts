import jwt from "jsonwebtoken";
import { User, IUser } from "../../models/User.js";
import { config } from "../../config.js";

interface GoogleProfile {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
}

export class AuthService {
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

  generateToken(user: IUser): string {
    const payload = {
      userId: user._id,
      email: user.email,
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: "7d",
    });
  }
}

export const authService = new AuthService();
