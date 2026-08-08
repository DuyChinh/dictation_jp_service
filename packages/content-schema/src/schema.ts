import { z } from "zod";

/** schema_version 1 or 2 (v2 adds optional en + image choices) */
export const SchemaVersionSchema = z.union([z.literal(1), z.literal(2)]);

export const ContentStatusSchema = z.enum(["draft", "verified", "published"]);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

export const TimingStatusSchema = z.enum(["verified", "unverified"]);

/** ja/vi/en optional; at least one non-empty key preferred at write-time */
export const LocalizedTextSchema = z
  .object({
    ja: z.string().optional(),
    vi: z.string().optional(),
    en: z.string().optional(),
    reading: z.string().optional(),
  })
  .refine((t) => Boolean(t.ja || t.vi || t.en), {
    message: "LocalizedText needs at least one of ja/vi/en",
  });

/** Back-compat alias */
export const LocaleTextSchema = LocalizedTextSchema;

export const SourceMetaSchema = z.union([
  z.object({
    type: z.literal("jlpt"),
    level: z.enum(["N1", "N2", "N3", "N4", "N5"]),
    year: z.number().int().min(1990).max(2100),
    month: z.number().int().min(1).max(12),
    source_reference: z.string().nullable().optional(),
    rights_note: z.string().nullable().optional(),
  }),
  z.object({
    type: z.enum(["podcast", "other"]),
    title: z.string().min(1),
    source_reference: z.string().nullable().optional(),
    rights_note: z.string().nullable().optional(),
  }),
]);

export const SpeakerSchema = z.object({
  id: z.string().min(1),
  label: LocalizedTextSchema,
});

export const TimeRangeSchema = z
  .object({
    start_ms: z.number().int().min(0),
    end_ms: z.number().int().min(1),
  })
  .refine((r) => r.end_ms > r.start_ms, {
    message: "end_ms must be greater than start_ms",
  });

export const ChoiceImageSchema = z.object({
  url: z.string().url(),
  alt: LocalizedTextSchema.optional(),
});

export const ChoiceSchema = z.object({
  id: z.string().min(1),
  text: LocalizedTextSchema,
  correct: z.boolean(),
  explanation: LocalizedTextSchema.optional(),
  image: ChoiceImageSchema.optional(),
  evidence_segment_ids: z.array(z.string().min(1)).optional(),
});

export const SegmentSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1),
  speaker_id: z.string().min(1),
  start_ms: z.number().int().min(0).nullable().optional(),
  end_ms: z.number().int().min(0).nullable().optional(),
  text: LocalizedTextSchema,
  timing_status: TimingStatusSchema,
  dictation_eligible: z.boolean().optional(),
});

export const FillBlankItemSchema = z.object({
  id: z.string().optional(),
  segment_id: z.string().min(1),
  tokens: z
    .array(
      z.object({
        text: z.string().min(1),
        hidden: z.boolean().optional(),
      }),
    )
    .min(1),
  variants: z
    .array(
      z.object({
        id: z.string().min(1),
        hidden_token_indexes: z.array(z.number().int().min(0)),
      }),
    )
    .optional(),
  accepted_answers: z.array(z.string()).optional(),
});

export const DictationConfigSchema = z.object({
  enabled: z.boolean(),
  modes: z
    .object({
      sentence_dictation: z
        .object({
          enabled: z.boolean(),
          segment_ids: z.array(z.string()).optional(),
        })
        .optional(),
      full_question_dictation: z
        .object({
          enabled: z.boolean(),
        })
        .optional(),
      fill_blank: z
        .object({
          enabled: z.boolean(),
          items: z.array(FillBlankItemSchema).default([]),
        })
        .optional(),
    })
    .default({}),
});

export const QuestionTypeSchema = z.enum([
  "listening_multiple_choice",
  "dictation",
  "conversation",
]);

export const ChoiceDisplayModeSchema = z.enum(["text", "image"]);

export const QuestionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1),
  type: QuestionTypeSchema,
  audio: TimeRangeSchema,
  prompt: LocalizedTextSchema.optional(),
  choices: z.array(ChoiceSchema).optional(),
  choice_display_mode: ChoiceDisplayModeSchema.optional(),
  /** Full dialogue translation paragraphs when per-segment vi/en missing */
  dialogue_translation: LocalizedTextSchema.optional(),
  segments: z.array(SegmentSchema).min(1),
  dictation: DictationConfigSchema.optional(),
});

export const SectionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1),
  title: LocalizedTextSchema,
  questions: z.array(QuestionSchema).min(1),
});

export const ListeningPackageSchema = z.object({
  schema_version: SchemaVersionSchema,
  id: z.string().min(1),
  status: ContentStatusSchema,
  content_version: z.number().int().min(1),
  title: LocalizedTextSchema,
  source: SourceMetaSchema,
  audio: z.object({
    file: z.string().min(1),
    duration_ms: z.number().int().positive().nullable().optional(),
  }),
  speakers: z.array(SpeakerSchema).min(1),
  sections: z.array(SectionSchema).min(1),
  review_required: z.boolean().optional(),
  review_note: z.string().optional(),
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
export type ListeningPackage = z.infer<typeof ListeningPackageSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type ChoiceDisplayMode = z.infer<typeof ChoiceDisplayModeSchema>;

export function isPublished(status: ContentStatus): boolean {
  return status === "published";
}

export { z };
