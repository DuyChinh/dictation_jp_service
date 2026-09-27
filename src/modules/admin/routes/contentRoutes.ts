import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { LessonSetting } from "../../../models/LessonSetting.js";
import type { StaticContentRepository } from "../../content/StaticContentRepository.js";
import { computeCounts } from "../../content/contentMappers.js";
import { requirePerm } from "../adminAuth.js";
import { ah, audit, currentAdmin, parseBody } from "../helpers.js";

/** Applies the hidden flags saved in Mongo to the loaded lessons. */
export async function loadHiddenLessons(repo: StaticContentRepository): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  const hidden = await LessonSetting.find({ hidden: true }, { lessonId: 1 }).lean();
  repo.setHidden(
    hidden.map((h) => h.lessonId),
    true,
  );
}

const visibilityBody = z.object({
  ids: z.array(z.string().min(1).max(200)).min(1).max(500),
  hidden: z.boolean(),
});

function sortKey(source: { type: string; year?: number; month?: number }): number {
  return source.type === "jlpt" ? (source.year ?? 0) * 100 + (source.month ?? 0) : -1;
}

export function createContentAdminRouter(repo: StaticContentRepository): Router {
  const r = Router();

  r.get("/", requirePerm("content", "read"), (_req, res) => {
    const lessons = repo
      .all()
      .map((m) => {
        const p = m.package;
        return {
          id: p.id,
          title: p.title,
          source: p.source,
          status: p.status,
          contentVersion: p.content_version,
          hidden: repo.isHidden(p.id),
          durationMs: p.audio.duration_ms ?? null,
          counts: computeCounts(p),
        };
      })
      .sort((a, b) => sortKey(b.source) - sortKey(a.source));
    res.json({ lessons, problems: repo.problems() });
  });

  r.post(
    "/reload",
    requirePerm("content", "write"),
    ah(async (req, res) => {
      const { loaded } = repo.load();
      const problems = repo.problems();
      await audit(req, currentAdmin(res), "content_reload", "", `${loaded} loaded, ${problems.length} skipped`);
      res.json({ loaded, problems });
    }),
  );

  r.post(
    "/visibility",
    requirePerm("content", "write"),
    ah(async (req, res) => {
      const { ids, hidden } = parseBody(visibilityBody, req.body);
      const known = ids.filter((id) => repo.get(id));
      if (known.length) {
        await LessonSetting.bulkWrite(
          known.map((lessonId) => ({
            updateOne: { filter: { lessonId }, update: { $set: { hidden } }, upsert: true },
          })),
        );
        repo.setHidden(known, hidden);
      }
      await audit(req, currentAdmin(res), hidden ? "lesson_hide" : "lesson_show", known.join(", "));
      res.json({ updated: known.length });
    }),
  );

  return r;
}
