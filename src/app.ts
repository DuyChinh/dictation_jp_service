import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { config } from "./config.js";
import { getMongoStatus } from "./database/mongo.js";
import { AppError, errorBody } from "./shared/errors.js";
import { StaticContentRepository } from "./modules/content/StaticContentRepository.js";
import {
  createAudioRouter,
  createContentRouter,
} from "./modules/content/contentRoutes.js";
import { createEvaluateRouter } from "./modules/evaluate/evaluateRoutes.js";
import passport from "passport";
import { configurePassport } from "./config/passport.js";
import { createAuthRouter } from "./modules/auth/authRoutes.js";
export function createApp(repo?: StaticContentRepository) {
  const contentRepo = repo ?? new StaticContentRepository(config.contentRoot);
  if (!repo) {
    const { loaded, errors } = contentRepo.load();
    if (errors.length) {
      console.warn("[content] load warnings/errors:", errors);
    }
    console.log(
      `[content] loaded ${loaded} lesson(s) from ${config.contentRoot}`,
    );
  }

  const app = express();
  app.use(
    cors({
      origin: config.corsOrigins,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  configurePassport();
  app.use(passport.initialize());

  app.get("/api/health", (_req, res) => {
    const mongo = getMongoStatus();
    res.json({
      ok: true,
      service: "japanese-dictation-backend",
      content_lessons: contentRepo.list({
        statuses: [...config.allowStatuses],
      }).length,
      mongo: {
        configured: mongo.configured,
        connected: mongo.connected,
      },
    });
  });

  app.use("/api/content", createContentRouter(contentRepo, config));
  app.use("/api/audio", createAudioRouter(contentRepo));
  app.use("/api/evaluate", createEvaluateRouter(contentRepo));
  app.use("/api/auth", createAuthRouter());

  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const e = err instanceof Error ? err : new Error(String(err));
      const status = err instanceof AppError ? err.status : 500;
      if (status >= 500) console.error(err);
      res
        .status(status)
        .json(errorBody(e, config.nodeEnv !== "production"));
    },
  );

  return { app, contentRepo };
}
