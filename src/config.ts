import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(backendRoot, "..");

// Load backend/.env (never commit secrets)
dotenv.config({ path: path.join(backendRoot, ".env") });

function requireEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

function resolveContentRoot(): string {
  if (process.env.CONTENT_ROOT && process.env.CONTENT_ROOT.trim() !== "") {
    return path.resolve(process.env.CONTENT_ROOT);
  }
  // Deploy: backend/content ships with the service
  const inBackend = path.join(backendRoot, "content");
  if (fs.existsSync(inBackend)) return inBackend;
  // Monorepo local fallback
  const inRepo = path.join(repoRoot, "content");
  if (fs.existsSync(inRepo)) return inRepo;
  return inBackend;
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv,
  contentRoot: resolveContentRoot(),
  mongodbUri: process.env.MONGODB_URI?.trim() || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:3001/api/auth/google/callback",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "default_jwt_secret_for_dev",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  allowStatuses:
    nodeEnv === "production"
      ? (["published"] as const)
      : (["published", "verified"] as const),
};

export type AppConfig = typeof config;

export function assertConfig(): void {
  if (config.port <= 0) throw new Error("Invalid PORT");
  // MONGODB_URI optional at boot for tests without DB; server.ts connects if set
  void requireEnv;
}
