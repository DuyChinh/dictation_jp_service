import { Router } from "express";
import fs from "node:fs";
import type { StaticContentRepository } from "./StaticContentRepository.js";
import {
  stripPackageForPractice,
  stripQuestionForPractice,
  toLessonDetail,
  toLessonSummary,
} from "./contentMappers.js";
import { AppError } from "../../shared/errors.js";
import type { AppConfig } from "../../config.js";
import type { ContentStatus } from "@jd/content-schema";

export function createContentRouter(
  repo: StaticContentRepository,
  cfg: AppConfig,
): Router {
  const r = Router();

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
      .map(toLessonSummary);
    res.json({ lessons });
  });

  r.get("/lessons/:lessonId", (req, res) => {
    const meta = repo.get(req.params.lessonId);
    if (!meta || !cfg.allowStatuses.includes(meta.package.status as never)) {
      throw new AppError("CONTENT_NOT_FOUND", "Lesson not found", 404);
    }
    res.json({ lesson: toLessonDetail(meta) });
  });

  r.get("/lessons/:lessonId/practice", (req, res) => {
    const meta = repo.get(req.params.lessonId);
    if (!meta || !cfg.allowStatuses.includes(meta.package.status as never)) {
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
    if (!found || !cfg.allowStatuses.includes(found.meta.package.status as never)) {
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

export function createAudioRouter(repo: StaticContentRepository): Router {
  const r = Router();

  r.get("/:lessonId", (req, res) => {
    const meta = repo.get(req.params.lessonId);
    if (!meta || !fs.existsSync(meta.audioPath)) {
      throw new AppError("CONTENT_NOT_FOUND", "Audio not found", 404);
    }

    const stat = fs.statSync(meta.audioPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");

    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!m) {
        res.status(416).end();
        return;
      }
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : fileSize - 1;
      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).end();
        return;
      }
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", String(chunkSize));
      fs.createReadStream(meta.audioPath, { start, end }).pipe(res);
      return;
    }

    res.setHeader("Content-Length", String(fileSize));
    fs.createReadStream(meta.audioPath).pipe(res);
  });

  return r;
}
