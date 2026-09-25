import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { config } from "../../config.js";
import { Progress } from "../../models/Progress.js";
import { History } from "../../models/History.js";
import { ListeningAnswer } from "../../models/ListeningAnswer.js";

/** Most rows one import request may carry, per kind. */
const IMPORT_LIMITS = { dictation: 5000, sessions: 50, listening: 2000 };

function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function dateFromMs(v: unknown): Date {
  const n = num(v);
  return n > 0 ? new Date(n) : new Date();
}

type SessionInput = Record<string, unknown>;

/** Stores sessions, skipping any whose browser id this user already has. */
async function insertSessions(userId: string, items: SessionInput[]): Promise<number> {
  const ids = items.map((it) => str(it.id, 100)).filter(Boolean);
  // History pulled from the server carries the row's _id as its id, so match on either.
  const serverIds = ids.filter((id) => mongoose.isValidObjectId(id));
  const existing = new Set<string>();
  if (ids.length) {
    const found = await History.find(
      { userId, $or: [{ clientId: { $in: ids } }, { _id: { $in: serverIds } }] },
      { clientId: 1 }
    ).lean();
    for (const h of found) {
      existing.add(String(h._id));
      if (h.clientId) existing.add(h.clientId);
    }
  }

  const docs = items
    .filter((it) => !str(it.id, 100) || !existing.has(str(it.id, 100)))
    .map((it) => ({
      userId,
      clientId: str(it.id, 100) || undefined,
      lessonId: str(it.lessonId, 200),
      lessonTitle: str(it.lessonTitle, 300),
      level: str(it.level, 20) || "ALL",
      score: num(it.score),
      maxStreak: num(it.maxStreak),
      correctCount: num(it.correctCount),
      totalCount: num(it.totalCount),
      mascot: str(it.mascot, 50) || "shiba",
      createdAt: dateFromMs(it.timestamp),
    }))
    .filter((d) => d.lessonId);
  if (docs.length === 0) return 0;

  try {
    const inserted = await History.insertMany(docs, { ordered: false });
    return inserted.length;
  } catch (err: any) {
    // A parallel request may have stored the same session first; the unique index drops the copy.
    if (err?.code === 11000 || err?.writeErrors) return err.insertedDocs?.length ?? 0;
    throw err;
  }
}

function getUserIdFromAuthHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId?: string };
    return decoded.userId || null;
  } catch {
    return null;
  }
}

export function createProgressRouter(): Router {
  const r = Router();

  // Save / update progress for a segment
  r.post("/dictation", async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromAuthHeader(req);
      if (!userId) {
        return res.status(200).json({ success: true, localOnly: true });
      }

      const { lesson_id, question_id, segment_id, status, score, last_answer } = req.body;
      if (!lesson_id || !segment_id || !status) {
        return res.status(400).json({ error: { message: "Missing required fields" } });
      }

      const updated = await Progress.findOneAndUpdate(
        { userId, lessonId: lesson_id, segmentId: segment_id },
        {
          $set: {
            questionId: question_id || "",
            status: status === "correct" ? "correct" : "incorrect",
            score: typeof score === "number" ? score : 0,
            lastAnswer: last_answer || "",
          },
          $inc: { attempts: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.json({ success: true, progress: updated });
    } catch (err: any) {
      console.error("Save progress error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to save progress" } });
    }
  });

  // Save a practice session log
  r.post("/session", async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromAuthHeader(req);
      if (!userId) {
        return res.status(200).json({ success: true, localOnly: true });
      }

      const saved = await insertSessions(userId, [req.body ?? {}]);
      return res.json({ success: true, saved });
    } catch (err: any) {
      console.error("Save session error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to save session" } });
    }
  });

  // Get full practice history and calculated overall stats
  r.get("/history", async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromAuthHeader(req);
      if (!userId) {
        return res.json({ stats: null, history: [] });
      }

      const historyList = await History.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const progressItems = await Progress.find({ userId }).lean();
      const distinctLessons = await Progress.distinct("lessonId", { userId });

      let bestStreak = 0;
      for (const h of historyList) {
        if (h.maxStreak && h.maxStreak > bestStreak) {
          bestStreak = h.maxStreak;
        }
      }

      let totalCorrect = 0;
      let totalAttempts = 0;
      let totalScoreSum = 0;

      for (const p of progressItems) {
        totalAttempts += p.attempts || 1;
        totalScoreSum += p.score || 0;
        if (p.status === "correct") totalCorrect++;
      }

      const mappedHistory = historyList.map((h) => ({
        id: String(h._id),
        lessonId: h.lessonId,
        lessonTitle: h.lessonTitle,
        level: h.level,
        score: h.score,
        maxStreak: h.maxStreak,
        correctCount: h.correctCount,
        totalCount: h.totalCount,
        mascot: h.mascot,
        timestamp: new Date(h.createdAt).getTime(),
      }));

      return res.json({
        stats: {
          bestStreak,
          currentStreak: 0,
          totalAttempts,
          totalCorrect,
          totalScoreSum,
          lessonsPracticed: distinctLessons,
          updatedAt: Date.now(),
        },
        history: mappedHistory,
      });
    } catch (err: any) {
      console.error("Get history error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to load history" } });
    }
  });

  // Get all segment progress for a lesson
  r.get("/lesson/:lessonId", async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromAuthHeader(req);
      if (!userId) {
        return res.json({ lesson_id: req.params.lessonId, progress: {} });
      }

      const items = await Progress.find({
        userId,
        lessonId: req.params.lessonId,
      }).lean();

      const progressMap: Record<
        string,
        {
          status: "correct" | "incorrect";
          score: number;
          attempts: number;
          lastAnswer?: string;
          updatedAt: number;
        }
      > = {};

      for (const item of items) {
        progressMap[item.segmentId] = {
          status: item.status,
          score: item.score || 0,
          attempts: item.attempts || 1,
          lastAnswer: item.lastAnswer,
          updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
        };
      }

      return res.json({ lesson_id: req.params.lessonId, progress: progressMap });
    } catch (err: any) {
      console.error("Get lesson progress error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to load progress" } });
    }
  });

  // Get user progress summary across all lessons
  r.get("/summary", async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromAuthHeader(req);
      if (!userId) {
        return res.json({ totalCorrect: 0, totalAttempted: 0, lessonsCount: 0 });
      }

      const totalCorrect = await Progress.countDocuments({ userId, status: "correct" });
      const totalAttempted = await Progress.countDocuments({ userId });
      const distinctLessons = await Progress.distinct("lessonId", { userId });

      return res.json({
        totalCorrect,
        totalAttempted,
        lessonsCount: distinctLessons.length,
      });
    } catch (err: any) {
      console.error("Get summary error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to load summary" } });
    }
  });

  // Listening answers for a lesson, keyed by question id
  r.get("/listening/:lessonId", async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromAuthHeader(req);
      if (!userId) {
        return res.json({ lesson_id: req.params.lessonId, answers: {} });
      }

      const items = await ListeningAnswer.find({ userId, lessonId: req.params.lessonId }).lean();
      const answers: Record<
        string,
        { choiceId: string; correct: boolean; correctChoiceId: string | null; answeredAt: number }
      > = {};
      for (const item of items) {
        answers[item.questionId] = {
          choiceId: item.choiceId,
          correct: item.correct,
          correctChoiceId: item.correctChoiceId ?? null,
          answeredAt: new Date(item.answeredAt).getTime(),
        };
      }

      return res.json({ lesson_id: req.params.lessonId, answers });
    } catch (err: any) {
      console.error("Get listening answers error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to load answers" } });
    }
  });

  // Save a listening answer; only the first answer to a question counts
  r.post("/listening", async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromAuthHeader(req);
      if (!userId) {
        return res.status(200).json({ success: true, localOnly: true });
      }

      const { lesson_id, question_id, choice_id, correct, correct_choice_id, answered_at } = req.body;
      if (!lesson_id || !question_id || !choice_id || typeof correct !== "boolean") {
        return res.status(400).json({ error: { message: "Missing required fields" } });
      }

      const saved = await ListeningAnswer.findOneAndUpdate(
        { userId, lessonId: str(lesson_id, 200), questionId: str(question_id, 200) },
        {
          $setOnInsert: {
            choiceId: str(choice_id, 50),
            correct,
            correctChoiceId: str(correct_choice_id, 50) || null,
            answeredAt: dateFromMs(answered_at),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.json({ success: true, answer: saved });
    } catch (err: any) {
      console.error("Save listening answer error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to save answer" } });
    }
  });

  // Clear listening answers so the learner can retry: the given questions, or the whole lesson
  r.delete("/listening/:lessonId", async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromAuthHeader(req);
      if (!userId) {
        return res.status(200).json({ success: true, localOnly: true });
      }

      const raw = typeof req.query.question_ids === "string" ? req.query.question_ids : "";
      const questionIds = raw.split(",").filter(Boolean);
      const filter = questionIds.length
        ? { userId, lessonId: req.params.lessonId, questionId: { $in: questionIds } }
        : { userId, lessonId: req.params.lessonId };
      const { deletedCount } = await ListeningAnswer.deleteMany(filter);

      return res.json({ success: true, deleted: deletedCount });
    } catch (err: any) {
      console.error("Clear listening answers error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to clear answers" } });
    }
  });

  // Move practice done before signing in into this account, merging with what is already stored
  r.post("/import", async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromAuthHeader(req);
      if (!userId) {
        return res.status(401).json({ error: { message: "Sign in to import progress" } });
      }

      const body = req.body ?? {};
      const dictation: Record<string, unknown>[] = Array.isArray(body.dictation) ? body.dictation : [];
      const sessions: SessionInput[] = Array.isArray(body.sessions) ? body.sessions : [];
      const listening: Record<string, unknown>[] = Array.isArray(body.listening) ? body.listening : [];
      if (
        dictation.length > IMPORT_LIMITS.dictation ||
        sessions.length > IMPORT_LIMITS.sessions ||
        listening.length > IMPORT_LIMITS.listening
      ) {
        return res.status(413).json({ error: { message: "Too much data in one import" } });
      }

      const now = new Date();
      const dictationOps = dictation
        .filter((d) => str(d.lesson_id) && str(d.segment_id) && (d.status === "correct" || d.status === "incorrect"))
        .map((d) => ({
          updateOne: {
            filter: { userId, lessonId: str(d.lesson_id, 200), segmentId: str(d.segment_id, 200) },
            // Keep the better result of the two: correct wins, highest score, attempts add up.
            // Values from the client go through $literal so a string like "$x" is never read as a field.
            update: [
              {
                $set: {
                  questionId: { $ifNull: ["$questionId", { $literal: str(d.question_id, 200) }] },
                  status: {
                    $cond: [
                      { $or: [{ $eq: ["$status", "correct"] }, { $literal: d.status === "correct" }] },
                      "correct",
                      "incorrect",
                    ],
                  },
                  score: { $max: [{ $ifNull: ["$score", 0] }, { $literal: num(d.score) }] },
                  lastAnswer: { $ifNull: ["$lastAnswer", { $literal: str(d.last_answer, 2000) }] },
                  attempts: { $add: [{ $ifNull: ["$attempts", 0] }, { $literal: Math.max(1, num(d.attempts)) }] },
                  createdAt: { $ifNull: ["$createdAt", { $literal: now }] },
                  updatedAt: { $literal: now },
                },
              },
            ],
            upsert: true,
            timestamps: false,
          },
        }));

      const listeningOps = listening
        .filter((a) => str(a.lesson_id) && str(a.question_id) && str(a.choice_id) && typeof a.correct === "boolean")
        .map((a) => ({
          updateOne: {
            filter: { userId, lessonId: str(a.lesson_id, 200), questionId: str(a.question_id, 200) },
            // An answer already on the account was given first there, so it stays.
            update: {
              $setOnInsert: {
                choiceId: str(a.choice_id, 50),
                correct: a.correct as boolean,
                correctChoiceId: str(a.correct_choice_id, 50) || null,
                answeredAt: dateFromMs(a.answered_at),
              },
            },
            upsert: true,
          },
        }));

      if (dictationOps.length) await Progress.bulkWrite(dictationOps as any, { ordered: false });
      if (listeningOps.length) await ListeningAnswer.bulkWrite(listeningOps, { ordered: false });
      const sessionsSaved = await insertSessions(userId, sessions);

      return res.json({
        success: true,
        imported: { dictation: dictationOps.length, sessions: sessionsSaved, listening: listeningOps.length },
      });
    } catch (err: any) {
      console.error("Import progress error:", err);
      return res.status(500).json({ error: { message: err.message || "Failed to import progress" } });
    }
  });

  return r;
}
