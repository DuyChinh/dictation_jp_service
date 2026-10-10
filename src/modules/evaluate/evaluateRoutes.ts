import { Router } from "express";
import {
  joinFillBlankExpected,
  joinFullQuestionExpected,
  scoreDictation,
  evaluateListening,
  analyzeTranslation,
} from "@jd/evaluation";
import type { ContentStatus } from "@jd/content-schema";
import { z } from "zod";
import type { StaticContentRepository } from "../content/StaticContentRepository.js";
import { AppError } from "../../shared/errors.js";
import { findSentence, toItemResult } from "../content/paperMappers.js";

const DictationBody = z.object({
  lesson_id: z.string(),
  question_id: z.string(),
  segment_id: z.string().optional(),
  mode: z.enum([
    "sentence_dictation",
    "full_question_dictation",
    "fill_blank",
  ]),
  answer: z.object({ raw: z.string() }),
  fill_blank: z
    .object({
      item_id: z.string().optional(),
      variant_id: z.string().optional(),
    })
    .optional(),
  force_reveal: z.boolean().optional(),
  behavior: z
    .object({
      replay_count: z.number().optional(),
      hint_count: z.number().optional(),
      attempt_index: z.number().optional(),
    })
    .optional(),
});

const ListeningBody = z.object({
  lesson_id: z.string(),
  question_id: z.string(),
  answer: z.object({ choice_id: z.string() }),
  behavior: z
    .object({
      replay_count: z.number().optional(),
      hint_count: z.number().optional(),
    })
    .optional(),
});

const PaperItemBody = z.object({
  lesson_id: z.string(),
  item_id: z.string(),
  choice_id: z.enum(["1", "2", "3", "4"]),
});

const PaperExamBody = z.object({
  lesson_id: z.string(),
  scope: z.enum(["all", "vocab", "grammar", "reading"]),
  answers: z
    .array(z.object({ item_id: z.string(), choice_id: z.enum(["1", "2", "3", "4"]) }))
    .max(300),
});

const ListeningExamBody = z.object({
  lesson_id: z.string(),
  answers: z
    .array(z.object({ question_id: z.string(), choice_id: z.string().min(1).max(20) }))
    .max(300),
});

const TranslationBody = z.object({
  lesson_id: z.string(),
  sentence_id: z.string(),
  text: z.string().max(2000),
});

export function createEvaluateRouter(
  repo: StaticContentRepository,
  allowStatuses: readonly ContentStatus[] = ["published"],
): Router {
  const r = Router();

  /** Answer one question of the written part; the explanations come back only now. */
  r.post("/paper-item", (req, res) => {
    const body = PaperItemBody.safeParse(req.body);
    if (!body.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid request", 400, body.error.issues);
    }
    const { lesson_id, item_id, choice_id } = body.data;
    const paper = repo.getPaper(lesson_id, allowStatuses);
    const item = paper?.items.find((i) => i.id === item_id);
    if (!paper || !item) {
      throw new AppError("QUESTION_NOT_FOUND", "Question not found", 404);
    }
    res.json({ result: toItemResult(item, choice_id) });
  });

  /**
   * Grade a timed sitting in one go: the learner answered without seeing any result, so the
   * correct choices are revealed only here. Explanations stay behind /paper-item (review).
   */
  r.post("/paper-exam", (req, res) => {
    const body = PaperExamBody.safeParse(req.body);
    if (!body.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid request", 400, body.error.issues);
    }
    const { lesson_id, scope, answers } = body.data;
    const paper = repo.getPaper(lesson_id, allowStatuses);
    if (!paper) {
      throw new AppError("CONTENT_NOT_FOUND", "Paper not found", 404);
    }
    const picked = new Map(answers.map((a) => [a.item_id, a.choice_id]));
    const known = new Set(paper.items.map((i) => i.id));
    if (answers.some((a) => !known.has(a.item_id))) {
      throw new AppError("QUESTION_NOT_FOUND", "Unknown question in answers", 404);
    }
    const inScope = paper.items
      .filter((i) => scope === "all" || i.part === scope)
      .sort((a, b) => a.no - b.no);
    const items = inScope.map((i) => {
      const selected = picked.get(i.id) ?? null;
      const correctChoice = i.choices.find((c) => c.correct)?.id ?? null;
      return {
        item_id: i.id,
        no: i.no,
        part: i.part,
        mondai: i.mondai,
        selected,
        correct_choice_id: correctChoice,
        correct: selected !== null && selected === correctChoice,
      };
    });
    res.json({
      result: {
        scope,
        total: items.length,
        answered: items.filter((i) => i.selected !== null).length,
        correct: items.filter((i) => i.correct).length,
        items,
      },
    });
  });

  /**
   * Grade a timed listening sitting in one go: every listening question of the lesson is scored
   * against what the learner picked, and the correct choices are revealed only here. The
   * explanations stay behind /listening, opened from the review.
   */
  r.post("/listening-exam", (req, res) => {
    const body = ListeningExamBody.safeParse(req.body);
    if (!body.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid request", 400, body.error.issues);
    }
    const { lesson_id, answers } = body.data;
    const meta = repo.get(lesson_id);
    if (!meta) {
      throw new AppError("CONTENT_NOT_FOUND", "Lesson not found", 404);
    }
    const questions = meta.package.sections.flatMap((section) =>
      section.questions
        .filter((q) => q.type === "listening_multiple_choice" && q.choices?.length)
        .map((q) => ({ q, section })),
    );
    const known = new Set(questions.map(({ q }) => q.id));
    if (answers.some((a) => !known.has(a.question_id))) {
      throw new AppError("QUESTION_NOT_FOUND", "Unknown question in answers", 404);
    }
    const picked = new Map(answers.map((a) => [a.question_id, a.choice_id]));
    const items = questions.map(({ q, section }, i) => {
      const selected = picked.get(q.id) ?? null;
      const correctChoice = q.choices?.find((c) => c.correct)?.id ?? null;
      return {
        item_id: q.id,
        no: i + 1,
        part: "listening" as const,
        mondai: section.order,
        section_id: section.id,
        selected,
        correct_choice_id: correctChoice,
        correct: selected !== null && selected === correctChoice,
      };
    });
    res.json({
      result: {
        scope: "listening" as const,
        total: items.length,
        answered: items.filter((i) => i.selected !== null).length,
        correct: items.filter((i) => i.correct).length,
        items,
      },
    });
  });

  /** Feedback on a learner's Vietnamese translation of one sentence of a passage. */
  r.post("/translation", (req, res) => {
    const body = TranslationBody.safeParse(req.body);
    if (!body.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid request", 400, body.error.issues);
    }
    const { lesson_id, sentence_id, text } = body.data;
    const paper = repo.getPaper(lesson_id, allowStatuses);
    const found = paper && findSentence(paper, sentence_id);
    if (!found) {
      throw new AppError("SEGMENT_NOT_FOUND", "Sentence not found", 404);
    }
    const { sentence } = found;
    res.json({
      result: {
        analysis: analyzeTranslation(text, {
          chunks: sentence.chunks,
          pitfalls: sentence.pitfalls,
        }),
        reference: {
          ja: sentence.ja,
          vi: sentence.vi ?? "",
          ...(sentence.notes_vi ? { notes_vi: sentence.notes_vi } : {}),
        },
      },
    });
  });

  r.post("/dictation", (req, res) => {
    const body = DictationBody.safeParse(req.body);
    if (!body.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid request", 400, body.error.issues);
    }
    const { lesson_id, question_id, mode, answer, fill_blank, force_reveal, behavior } =
      body.data;

    const found = repo.getQuestion(lesson_id, question_id);
    if (!found) {
      throw new AppError("QUESTION_NOT_FOUND", "Question not found", 404);
    }
    const q = found.question;

    let expected = "";
    let accepted: string[] = [];
    let expectedVi: string | undefined;

    if (mode === "sentence_dictation") {
      const sid = body.data.segment_id;
      if (!sid) {
        throw new AppError("VALIDATION_ERROR", "segment_id required", 400);
      }
      const seg = q.segments.find((s) => s.id === sid);
      if (!seg) {
        throw new AppError("SEGMENT_NOT_FOUND", "Segment not found", 404);
      }
      expected = seg.text.ja ?? "";
      expectedVi = seg.text.vi;
      let expectedEn = seg.text.en;
      if (!expectedVi && q.dialogue_translation?.vi) {
        const lines = q.dialogue_translation.vi.split("\n").map((l) => l.trim()).filter(Boolean);
        const idx = q.segments.findIndex((s) => s.id === sid);
        if (idx >= 0 && lines[idx]) expectedVi = lines[idx];
      }
      if (!expectedEn && q.dialogue_translation?.en) {
        const lines = q.dialogue_translation.en.split("\n").map((l) => l.trim()).filter(Boolean);
        const idx = q.segments.findIndex((s) => s.id === sid);
        if (idx >= 0 && lines[idx]) expectedEn = lines[idx];
      }
    } else if (mode === "full_question_dictation") {
      expected = joinFullQuestionExpected(
        q.segments.map((s) => ({
          text: { ja: s.text.ja ?? "" },
          dictation_eligible: s.dictation_eligible,
        })),
      );
      expectedVi = q.segments
        .filter((s) => s.dictation_eligible !== false)
        .map((s) => s.text.vi ?? "")
        .join("");
    } else {
      const items = q.dictation?.modes?.fill_blank?.items ?? [];
      const item =
        items.find((i) => i.id === fill_blank?.item_id) ?? items[0];
      if (!item) {
        throw new AppError("EVALUATION_ERROR", "No fill_blank item", 400);
      }
      expected = joinFillBlankExpected(item.tokens);
      accepted = item.accepted_answers ?? [];
      const seg = q.segments.find((s) => s.id === item.segment_id);
      expectedVi = seg?.text.vi;
    }

    const scored = scoreDictation({
      rawAnswer: answer.raw,
      expected,
      acceptedAnswers: accepted,
    });

    const attemptIndex = behavior?.attempt_index ?? 1;
    const reveal =
      force_reveal === true || attemptIndex >= 2 || scored.correct;

    res.json({
      result: {
        ...scored,
        revealed: reveal
          ? {
              expected_text: {
                ja: expected,
                vi: expectedVi ?? "",
                en: (q.segments.find((s) => s.id === body.data.segment_id)?.text.en) ?? (q.dialogue_translation?.en) ?? "",
              },
              accepted_matched: scored.matched_accepted,
            }
          : null,
      },
    });
  });

  r.post("/listening", (req, res) => {
    const body = ListeningBody.safeParse(req.body);
    if (!body.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid request", 400, body.error.issues);
    }
    const { lesson_id, question_id, answer } = body.data;
    const found = repo.getQuestion(lesson_id, question_id);
    if (!found) {
      throw new AppError("QUESTION_NOT_FOUND", "Question not found", 404);
    }
    const q = found.question;
    if (!q.choices?.length) {
      throw new AppError("EVALUATION_ERROR", "Question has no choices", 400);
    }

    const evalResult = evaluateListening({
      selectedChoiceId: answer.choice_id,
      choices: q.choices.map((c) => ({
        id: c.id,
        correct: c.correct,
        text: c.text,
        explanation: c.explanation,
        evidence_segment_ids: c.evidence_segment_ids,
      })),
    });

    const evidenceIds =
      evalResult.correct_choice?.evidence_segment_ids ?? [];
    const evidence_segments = q.segments.filter((s) =>
      evidenceIds.includes(s.id),
    );

    res.json({
      result: {
        correct: evalResult.correct,
        selected_choice_id: evalResult.selected_choice_id,
        correct_choice_id: evalResult.correct_choice_id,
        choices: q.choices,
        evidence_segments,
        segments: q.segments,
        prompt: q.prompt,
      },
    });
  });

  return r;
}
