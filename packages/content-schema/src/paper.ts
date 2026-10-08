import { z } from "zod";
import { ContentStatusSchema } from "./schema.js";

/**
 * paper.json — the written part of a JLPT exam (文字・語彙 / 文法 / 読解), stored beside listening.json.
 * Question `no` is the official number printed in the exam and in the answer-key PDF.
 */

export const PaperPartSchema = z.enum(["vocab", "grammar", "reading"]);
export type PaperPart = z.infer<typeof PaperPartSchema>;

export const PaperChoiceSchema = z.object({
  id: z.enum(["1", "2", "3", "4"]),
  text: z.string().min(1),
  correct: z.boolean(),
  /** Why this choice is right / wrong in THIS context. Required for all four choices. */
  explanation_vi: z.string(),
  /** Meaning of the choice itself (vocab questions). */
  meaning_vi: z.string().optional(),
});

export const VocabNoteSchema = z.object({
  word: z.string().min(1),
  reading: z.string().optional(),
  meaning_vi: z.string().min(1),
});

export const PaperReviewSchema = z.object({
  flag: z.boolean(),
  reason: z.string(),
});

export const PaperItemSchema = z.object({
  /** `{lessonId}-v-q{no}` | `-g-q{no}` | `-r-q{no}` */
  id: z.string().min(1),
  no: z.number().int().positive(),
  part: PaperPartSchema,
  /** 問題 number printed in the exam (1–14). */
  mondai: z.number().int().min(1).max(14),
  type: z.enum(["mcq", "sort_star", "cloze_blank"]),
  passage_id: z.string().optional(),
  stem: z.object({
    ja: z.string().min(1),
    vi: z.string().optional(),
    reading: z.string().optional(),
    /** The underlined / asked-about word — lost in the PDF text, read it from the page image. */
    target: z.string().optional(),
  }),
  choices: z.array(PaperChoiceSchema).length(4),
  /** 1–2 line takeaway shown first (progressive disclosure). */
  summary_vi: z.string().optional(),
  /** e.g. "grammar:〜に違いない", "vocab:逃亡", "kanji:reading". Feeds weakness stats later. */
  point_tags: z.array(z.string()).default([]),
  vocab: z.array(VocabNoteSchema).default([]),
  /** 問題8 (★): fragments in the correct order and which one sits on ★ (0-based). */
  sort: z
    .object({
      slots: z.array(z.string().min(1)).min(2),
      star_index: z.number().int().min(0),
    })
    .optional(),
  /** Reading: sentences of the passage that justify the correct answer. */
  evidence_sentence_ids: z.array(z.string()).default([]),
  review: PaperReviewSchema.optional(),
});
export type PaperItem = z.infer<typeof PaperItemSchema>;

/** One piece of a sentence for translation feedback; `ja` must be a substring of the sentence. */
export const PaperChunkSchema = z.object({
  ja: z.string().min(1),
  vi: z.string().min(1),
  /** Other SHORT phrases that are also a correct rendering (not whole sentences). */
  accept_vi: z.array(z.string().min(1)).default([]),
  /** Why it is translated this way (grammar / vocab). */
  note_vi: z.string().optional(),
});

/** A typical wrong translation of this sentence and why it is wrong. */
export const PaperPitfallSchema = z.object({
  wrong_vi: z.array(z.string().min(1)).min(1),
  explanation_vi: z.string().min(1),
});

export const PaperSentenceSchema = z.object({
  id: z.string().min(1),
  /** Full sentence. For 問題9 cloze passages this is the COMPLETED sentence (correct answers filled in). */
  ja: z.string().min(1),
  /** 問題9 only: the sentence as printed, with the blanks shown (e.g. "…という人も（48）。"). */
  ja_blank: z.string().optional(),
  vi: z.string().optional(),
  reading: z.string().optional(),
  /**
   * Footnotes and markers exactly as PRINTED in the exam (Japanese only): （注1）term：definition,
   * （中略）, and layout markers "A" / "B" / "¶2". Shown to the learner while practising.
   */
  notes: z.string().optional(),
  /** Vietnamese glosses and editorial remarks (typo fixes, which phrase is underlined). Shown only after answering. */
  notes_vi: z.string().optional(),
  /** Drives the translation drill's "which parts were right / wrong" feedback. */
  chunks: z.array(PaperChunkSchema).default([]),
  pitfalls: z.array(PaperPitfallSchema).default([]),
});

export const PaperPassageSchema = z.object({
  /** `{lessonId}-r-p{n}` (reading) or `-g-p{n}` (問題9 cloze) */
  id: z.string().min(1),
  mondai: z.number().int().min(1).max(14),
  kind: z.enum(["prose", "notice", "email", "pair", "cloze", "info"]),
  title_ja: z.string().optional(),
  /** Tables / notices where the visual layout matters; shown preformatted. */
  layout_ja: z.string().optional(),
  sentences: z.array(PaperSentenceSchema).min(1),
  full_translation_vi: z.string().optional(),
  review: PaperReviewSchema.optional(),
});
export type PaperPassage = z.infer<typeof PaperPassageSchema>;

export const PaperPackageSchema = z.object({
  schema_version: z.literal(1),
  id: z.string().min(1),
  lesson_id: z.string().min(1),
  status: ContentStatusSchema,
  content_version: z.number().int().min(1),
  source: z.object({
    level: z.enum(["N1", "N2", "N3", "N4", "N5"]),
    year: z.number().int().min(1990).max(2100),
    month: z.number().int().min(1).max(12),
    answer_key: z.object({ file: z.string(), page: z.number().int().positive() }).optional(),
  }),
  items: z.array(PaperItemSchema),
  passages: z.array(PaperPassageSchema).default([]),
});
export type PaperPackage = z.infer<typeof PaperPackageSchema>;

/** `.work/answers.json`, written by `npm run exam -- answers`. */
export const AnswerKeySchema = z.object({
  exam: z.string(),
  level: z.string(),
  key_pdf: z.string(),
  key_page: z.number().int().positive(),
  parts: z.object({
    vocab: z.object({ from: z.number().int(), to: z.number().int() }),
    grammar: z.object({ from: z.number().int(), to: z.number().int() }),
    reading: z.object({ from: z.number().int(), to: z.number().int() }),
  }),
  /** official question number → correct choice (1–4) */
  answers: z.record(z.string(), z.number().int().min(1).max(4)),
});
export type AnswerKey = z.infer<typeof AnswerKeySchema>;
