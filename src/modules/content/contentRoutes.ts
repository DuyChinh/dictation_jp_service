import { Router, type Request } from "express";
import fs from "node:fs";
import type { StaticContentRepository } from "./StaticContentRepository.js";
import {
  paperInfo,
  toPaperPractice,
  toPassageTranslation,
} from "./paperMappers.js";
import {
  stripPackageForPractice,
  stripQuestionForPractice,
  toLessonDetail,
  toLessonSummary,
} from "./contentMappers.js";
import { AppError } from "../../shared/errors.js";
import { createRateLimiter } from "../../shared/middleware/rateLimit.js";
import { config, type AppConfig } from "../../config.js";
import type { ContentStatus } from "@jd/content-schema";

const CONTENT_MAX_AGE_S = 60;
const AUDIO_MAX_PER_MINUTE = 120;
const AUDIO_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const AUDIO_REDIRECT_MAX_AGE_S = 3600;

export function createContentRouter(
  repo: StaticContentRepository,
  cfg: AppConfig,
): Router {
  const r = Router();

  // The same answer for every learner (the content is loaded once at startup), so browsers may reuse it
  // briefly. Errors drop this header in the app's error handler. A lesson hidden or edited by an admin
  // can take up to this long to change on a learner's screen.
  r.use((req, res, next) => {
    if (req.method === "GET") res.set("Cache-Control", `public, max-age=${CONTENT_MAX_AGE_S}`);
    next();
  });

  r.get("/lessons", (req, res) => {
    const level = req.query.level as string | undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const statusParam = req.query.status as string | undefined;
    const statuses = (
      statusParam
        ? [statusParam as ContentStatus]
        : [...cfg.allowStatuses]
    ) as ContentStatus[];

    const lessons = repo
      .list({ level, year, month, statuses })
      .map((meta) => ({
        ...toLessonSummary(meta),
        paper: paperInfo(repo.getPaper(meta.package.id, cfg.allowStatuses)),
      }));
    res.json({ lessons });
  });

  r.get("/lessons/:lessonId", (req, res) => {
    const meta = repo.get(req.params.lessonId);
    if (
      !meta ||
      repo.isHidden(meta.package.id) ||
      !cfg.allowStatuses.includes(meta.package.status as never)
    ) {
      throw new AppError("CONTENT_NOT_FOUND", "Lesson not found", 404);
    }
    res.json({
      lesson: {
        ...toLessonDetail(meta),
        paper: paperInfo(repo.getPaper(meta.package.id, cfg.allowStatuses)),
      },
    });
  });

  /** The written part (vocab / grammar / reading) with answers and explanations withheld. */
  r.get("/lessons/:lessonId/paper", (req, res) => {
    const meta = repo.get(req.params.lessonId);
    const paper = repo.getPaper(req.params.lessonId, cfg.allowStatuses);
    if (!meta || !paper || repo.isHidden(meta.package.id)) {
      throw new AppError("CONTENT_NOT_FOUND", "Paper not found", 404);
    }
    res.json({ paper: toPaperPractice(paper) });
  });

  r.get("/lessons/:lessonId/paper/passages/:passageId/translation", (req, res) => {
    const paper = repo.getPaper(req.params.lessonId, cfg.allowStatuses);
    const passage = paper?.passages.find((p) => p.id === req.params.passageId);
    if (!paper || !passage || repo.isHidden(req.params.lessonId)) {
      throw new AppError("CONTENT_NOT_FOUND", "Passage not found", 404);
    }
    res.json({ translation: toPassageTranslation(passage) });
  });

  r.get("/lessons/:lessonId/practice", (req, res) => {
    const meta = repo.get(req.params.lessonId);
    if (
      !meta ||
      repo.isHidden(meta.package.id) ||
      !cfg.allowStatuses.includes(meta.package.status as never)
    ) {
      throw new AppError("CONTENT_NOT_FOUND", "Lesson not found", 404);
    }
    let pkg = meta.package;
    const sectionId = req.query.section_id as string | undefined;
    if (sectionId) {
      const section = pkg.sections.find((s) => s.id === sectionId);
      if (!section) {
        throw new AppError("CONTENT_NOT_FOUND", "Section not found", 404);
      }
      pkg = { ...pkg, sections: [section] };
    }
    res.json({ practice: stripPackageForPractice(pkg) });
  });

  r.get("/lessons/:lessonId/questions/:questionId", (req, res) => {
    const found = repo.getQuestion(req.params.lessonId, req.params.questionId);
    if (
      !found ||
      repo.isHidden(found.meta.package.id) ||
      !cfg.allowStatuses.includes(found.meta.package.status as never)
    ) {
      throw new AppError("QUESTION_NOT_FOUND", "Question not found", 404);
    }
    res.json({
      lesson_id: found.meta.package.id,
      section_id: found.sectionId,
      audio_url: `/api/audio/${found.meta.package.id}`,
      speakers: found.meta.package.speakers,
      question: stripQuestionForPractice(found.question),
    });
  });

  return r;
}

export function createAudioRouter(
  repo: StaticContentRepository,
  cfg: Pick<AppConfig, "audioBaseUrl"> = config,
): Router {
  const r = Router();

  // A play issues several range requests (initial buffering, every seek), so the cap is generous.
  const audioLimiter = createRateLimiter({
    max: AUDIO_MAX_PER_MINUTE,
    message: "Too many audio requests, try again in a minute",
  });

  r.get("/:lessonId", audioLimiter, (req: Request<{ lessonId: string }>, res, next) => {
    const meta = repo.get(req.params.lessonId);

    // With a CDN / object store configured the file is served from there: this server only answers a
    // redirect, so the audio's bandwidth and CPU are no longer spent here. The player follows it as is.
    if (cfg.audioBaseUrl && meta?.audioPath) {
      res.set("Cache-Control", `public, max-age=${AUDIO_REDIRECT_MAX_AGE_S}`);
      res.redirect(302, `${cfg.audioBaseUrl}/${encodeURIComponent(meta.package.id)}.mp3`);
      return;
    }

    if (!meta || !fs.existsSync(meta.audioPath)) {
      throw new AppError("CONTENT_NOT_FOUND", "Audio not found", 404);
    }

    // sendFile handles Range (206/416), ETag + Last-Modified (304) and Cache-Control. A day of browser
    // caching keeps a replay or a returning learner from downloading the whole file again; after that
    // the browser revalidates, so a corrected recording still reaches everyone.
    res.sendFile(
      meta.audioPath,
      {
        acceptRanges: true,
        maxAge: AUDIO_MAX_AGE_MS,
        headers: { "Content-Type": "audio/mpeg" },
      },
      (err?: Error & { status?: number; headers?: Record<string, string> }) => {
        if (!err || res.headersSent) return;
        // An unsatisfiable Range is the client's mistake: answer 416 with its Content-Range, not a 500.
        if (typeof err.status === "number" && err.status < 500) {
          res.status(err.status).set(err.headers ?? {}).end();
          return;
        }
        next(err);
      },
    );
  });

  return r;
}
