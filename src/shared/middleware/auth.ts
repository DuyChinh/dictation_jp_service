import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";
import { User, IUser } from "../../models/User.js";

// Extend Express User interface to include IUser properties
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends IUser {}
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid token" } });
    }

    const token = authHeader.split(" ")[1];
    
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };

    // Find user
    const user = await User.findById(decoded.userId);
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

/** Like requireAuth, but a missing or bad token just leaves req.user unset. */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();
  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], config.jwtSecret) as { userId: string };
    const user = await User.findById(decoded.userId);
    if (user && user.status !== "locked") req.user = user;
  } catch {
    // treated as signed out
  }
  next();
};
