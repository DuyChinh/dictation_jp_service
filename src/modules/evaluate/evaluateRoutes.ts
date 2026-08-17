import { Router } from "express";
import {
  joinFillBlankExpected,
  joinFullQuestionExpected,
  scoreDictation,
  evaluateListening,
} from "@jd/evaluation";
import { z } from "zod";
import type { StaticContentRepository } from "../content/StaticContentRepository.js";
import { AppError } from "../../shared/errors.js";

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

export function createEvaluateRouter(repo: StaticContentRepository): Router {
  const r = Router();

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
