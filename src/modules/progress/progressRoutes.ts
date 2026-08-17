import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";
import { Progress } from "../../models/Progress.js";
import { History } from "../../models/History.js";

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

      const {
        lessonId,
        lessonTitle,
        level,
        score,
        maxStreak,
        correctCount,
        totalCount,
        mascot,
      } = req.body;

      const historyItem = new History({
        userId,
        lessonId: lessonId || "",
        lessonTitle: lessonTitle || "",
        level: level || "ALL",
        score: typeof score === "number" ? score : 0,
        maxStreak: typeof maxStreak === "number" ? maxStreak : 0,
        correctCount: typeof correctCount === "number" ? correctCount : 0,
        totalCount: typeof totalCount === "number" ? totalCount : 0,
        mascot: mascot || "shiba",
      });

      await historyItem.save();
      return res.json({ success: true, item: historyItem });
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

  return r;
}
