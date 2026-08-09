/**
 * Adapter: JLPT dictation JSON schema_version 4 → canonical ListeningPackage (v2).
 */
import type {
  Choice,
  ListeningPackage,
  LocalizedText,
  Question,
  Section,
  Segment,
} from "./schema.js";

export type ImageUrlMap = Record<string, string>; // choice id "1".."4" → Cloudinary URL for image-mode questions keyed by question id:
// format: `${questionStableKey}:${choiceId}` or just applied per-question via nested map

export type AdaptV4Options = {
  /** Public URLs for image choices: key = `${v4QuestionId}:${choiceId}` e.g. "m1-q2:1" */
  imageUrls?: ImageUrlMap;
  lessonId?: string;
  status?: ListeningPackage["status"];
};

type V4Sentence = {
  id: string;
  speaker?: string;
  text: string;
  start_ms?: number | null;
  end_ms?: number | null;
  timing_status?: string;
};

type V4Turn = {
  id: string;
  speaker?: string;
  text?: string;
  sentences?: V4Sentence[];
};

type V4Choice = {
  id: string;
  text?: { ja?: string; vi?: string; en?: string };
  correct?: boolean;
  explanation_vi?: string;
  explanation_en?: string;
};

type V4Prompt = {
  ja?: string;
  ja_reconstructed?: string;
  vi?: string;
  en?: string;
};

type V4Subquestion = {
  id: string;
  order?: number;
  prompt?: V4Prompt;
  choices?: V4Choice[] | null;
  correct_choice_id?: string;
  explanation_vi?: string;
  explanation_en?: string;
  evidence_turn_ids?: string[];
};

type V4Listening = {
  enabled?: boolean;
  question_type?: string;
  prompt?: V4Prompt;
  choices?: V4Choice[] | null;
  correct_choice_id?: string;
  correct_answer_text?: {
    ja?: string;
    ja_reconstructed?: string;
    vi?: string;
    en?: string;
  };
  explanation_vi?: string;
  explanation_en?: string;
  evidence_turn_ids?: string[];
  choice_presentation?: { type?: string };
  choice_source?: string;
  subquestions?: V4Subquestion[];
};

type V4Question = {
  id: string;
  question_no?: number;
  start_ms?: number | null;
  end_ms?: number | null;
  turns?: V4Turn[];
  sentences?: V4Sentence[];
  listening_practice?: V4Listening;
  dialogue_translation_vi?: string;
  dialogue_translation_en?: string;
  timing_status?: string;
};

type V4Mondai = {
  id: string;
  number?: number;
  questions: V4Question[];
};

type V4Root = {
  schema_version?: number;
  source?: {
    level?: string;
    exam?: string;
    audio_filename?: string;
    audio_duration_ms?: number;
    name?: string;
  };
  mondai: V4Mondai[];
};

function loc(
  ja?: string,
  vi?: string,
  en?: string,
): LocalizedText {
  const o: LocalizedText = {};
  if (ja?.trim()) o.ja = ja.trim();
  if (vi?.trim()) o.vi = vi.trim();
  if (en?.trim()) o.en = en.trim();
  if (!o.ja && !o.vi && !o.en) o.ja = "—";
  return o;
}

function locPrompt(p?: V4Prompt): LocalizedText | undefined {
  if (!p) return undefined;
  const ja = p.ja?.trim() || p.ja_reconstructed?.trim();
  if (!ja && !p.vi?.trim() && !p.en?.trim()) return undefined;
  return loc(ja, p.vi, p.en);
}

/** N2 問題3 (spoken choices only): synthesize 1–N numbered stubs for MC UI. */
function synthesizeNumberChoices(opts: {
  count: number;
  correctId?: string;
  explanationVi?: string;
  explanationEn?: string;
  correctAnswerText?: V4Listening["correct_answer_text"];
}): Choice[] {
  const correctId = opts.correctId != null ? String(opts.correctId) : undefined;
  const answerJa =
    opts.correctAnswerText?.ja?.trim() ||
    opts.correctAnswerText?.ja_reconstructed?.trim();
  const answerVi = opts.correctAnswerText?.vi?.trim();
  const answerEn = opts.correctAnswerText?.en?.trim();

  return Array.from({ length: opts.count }, (_, i) => {
    const id = String(i + 1);
    const isCorrect = correctId != null && id === correctId;
    // Exam UI uses numbers only before submit. After submit, text/vi on correct
    // come from reconstructed answer; other options are audio-only in source.
    const text = isCorrect
      ? loc(answerJa || id, answerVi, answerEn)
      : loc(
          id,
          "（Đáp án trong audio — chưa có bản ghi text đầy đủ）",
          "(Spoken option in audio — full wording not transcribed)",
        );
    return {
      id,
      text,
      correct: isCorrect,
      explanation: isCorrect
        ? loc(
            undefined,
            opts.explanationVi,
            opts.explanationEn,
          )
        : loc("—", "—", "—"),
    } satisfies Choice;
  });
}

function cloneSegmentsForPart(
  segs: Segment[],
  partId: string,
): Segment[] {
  return segs.map((s) => ({
    ...s,
    id: `${partId}__${s.id}`,
  }));
}

function remapEvidence(
  ids: string[] | undefined,
  partId: string,
): string[] | undefined {
  if (!ids?.length) return ids;
  return ids.map((id) =>
    id.startsWith(`${partId}__`) ? id : `${partId}__${id}`,
  );
}

function mapChoicesFromV4(
  rawChoices: V4Choice[],
  opts: {
    correctId?: string;
    evidenceTurnIds?: string[];
    turnToSentenceIds: Map<string, string[]>;
    origToFinal: Map<string, string>;
    imageKeyPrefix: string;
    imageUrls?: ImageUrlMap;
    fallbackExplanationVi?: string;
    fallbackExplanationEn?: string;
  },
): Choice[] {
  const correctId = opts.correctId;
  let choices = rawChoices.map((c) => {
    const isCorrect =
      c.correct === true || (correctId != null && c.id === correctId);
    let evidence: string[] | undefined;
    if (isCorrect && opts.evidenceTurnIds?.length) {
      evidence = [];
      for (const tid of opts.evidenceTurnIds) {
        const sids = opts.turnToSentenceIds.get(tid) ?? [];
        for (const oid of sids) {
          const fid = opts.origToFinal.get(oid);
          if (fid) evidence.push(fid);
        }
      }
      if (evidence.length === 0) {
        for (const tid of opts.evidenceTurnIds) {
          const fid = opts.origToFinal.get(tid);
          if (fid) evidence.push(fid);
        }
      }
    }

    const imageKey = `${opts.imageKeyPrefix}:${c.id}`;
    const url = opts.imageUrls?.[imageKey];

    return {
      id: c.id,
      text: loc(c.text?.ja, c.text?.vi, c.text?.en),
      correct: isCorrect,
      explanation: loc(
        undefined,
        c.explanation_vi ??
          (isCorrect ? opts.fallbackExplanationVi : undefined),
        c.explanation_en ??
          (isCorrect ? opts.fallbackExplanationEn : undefined),
      ),
      ...(url
        ? {
            image: {
              url,
              alt: loc(c.text?.ja, c.text?.vi, c.text?.en),
            },
          }
        : {}),
      ...(evidence?.length ? { evidence_segment_ids: evidence } : {}),
    } satisfies Choice;
  });

  if (choices.filter((c) => c.correct).length !== 1 && correctId) {
    choices = choices.map((c) => ({
      ...c,
      correct: c.id === correctId,
    }));
  }
  return choices;
}

/** JLPT N2 listening UI flags from 問題 number. */
function n2ListeningUi(mNum: number): {
  choiceDisplay: "text" | "image" | "numbers";
  promptVisibility: "always" | "after_submit";
} {
  // 問題1–2: full printed choices, hide question stem until submit
  // 問題3–5: number-only choices (spoken/printed numbers), hide stem until submit
  if (mNum >= 3) {
    return { choiceDisplay: "numbers", promptVisibility: "after_submit" };
  }
  return { choiceDisplay: "text", promptVisibility: "after_submit" };
}

function normSpeaker(raw?: string): string {
  if (!raw) return "unknown";
  if (raw === "narrator" || raw === "ナレーション") return "narrator";
  if (raw === "女" || raw.includes("女")) return "female_1";
  if (raw === "男" || raw.includes("男")) return "male_1";
  return raw.replace(/\s+/g, "_").toLowerCase();
}

function speakerLabel(id: string): LocalizedText {
  if (id === "narrator") return loc("ナレーション", "Người dẫn", "Narrator");
  if (id === "female_1") return loc("女", "Nữ", "Woman");
  if (id === "male_1") return loc("男", "Nam", "Man");
  return loc(id, id, id);
}

function parseExam(exam?: string): { year: number; month: number } {
  // "2025-12"
  const m = /^(\d{4})-(\d{1,2})$/.exec(exam ?? "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  return { year: 2025, month: 12 };
}

function collectSentences(q: V4Question): {
  sentences: Array<V4Sentence & { turnId?: string }>;
  turnToSentenceIds: Map<string, string[]>;
} {
  const turnToSentenceIds = new Map<string, string[]>();
  const sentences: Array<V4Sentence & { turnId?: string }> = [];

  if (q.sentences?.length) {
    for (const s of q.sentences) {
      sentences.push(s);
    }
  } else if (q.turns?.length) {
    for (const t of q.turns) {
      const ids: string[] = [];
      for (const s of t.sentences ?? []) {
        sentences.push({ ...s, turnId: t.id, speaker: s.speaker ?? t.speaker });
        ids.push(s.id);
      }
      turnToSentenceIds.set(t.id, ids);
    }
  }
  return { sentences, turnToSentenceIds };
}

function sentenceJa(s: V4Sentence): string {
  const t = s.text as { ja?: string } | string | undefined;
  return (typeof t === "string" ? t : t?.ja) ?? "";
}

function isStandaloneNumberBanner(ja: string): boolean {
  const t = ja.replace(/\s+/g, "").trim();
  if (!t) return false;
  if (/^[1-9１-９]番[。.!?！？]?$/.test(t)) return true;
  if (/^(いち|に|さん|よん|し|ご|ろく|なな|しち|はち|きゅう|く|じゅう)?ばん[。.!?！？]?$/i.test(t))
    return true;
  if (/^(いちばん|にばん|さんばん|よんばん|ごばん)[。.!?！？]?$/i.test(t)) return true;
  return false;
}

/**
 * Q1 has verified start after 「1番」. Q2+ often set q.start at the number cue;
 * skip so first situation line matches Q1 behavior.
 */
function numberAnnouncementPadMs(opts: {
  qNum: number;
  qStart: number;
  qEnd: number;
  prevQEnd: number | null;
  sentences: V4Sentence[];
}): number {
  const { qNum, qStart, qEnd, prevQEnd, sentences } = opts;
  if (qNum <= 1 || !sentences.length) return 0;
  if (sentences.some((s) => isStandaloneNumberBanner(sentenceJa(s)))) return 0;
  if (isStandaloneNumberBanner(sentenceJa(sentences[0]!))) return 0;

  const span = Math.max(1000, qEnd - qStart);
  const gap = prevQEnd != null ? Math.max(0, qStart - prevQEnd) : 0;
  const maxPad = Math.max(0, span - 8000);
  let pad = 4000;
  if (gap >= 10000) pad = 3800;
  else if (gap >= 6000) pad = 4200;
  else if (gap > 0 && gap < 6000) pad = 4500;
  return Math.min(pad, maxPad);
}

/**
 * Allocate durations for unverified sentences.
 * Pure equal char-share under-runs natural speech (cuts mid-sentence on line 1).
 * Strategy:
 *  1) Floor each line with ms/char (+ pause after 。)
 *  2) If total fits → stretch leftover time proportionally
 *  3) If total overflows → keep first 2 lines (scene + task re-ask) near full floor,
 *     compress the middle dialogue harder (these lines are denser in raw JLPT audio too)
 */
function allocateUnverifiedDurationsMs(
  texts: string[],
  availableMs: number,
): number[] {
  if (!texts.length) return [];
  const n = texts.length;
  const MS_PER_CHAR = 320;
  const MIN_SEG = 1600;
  const PAUSE_AFTER_CLAUSE = 500;

  const floorOf = (text: string) => {
    const len = Math.max(1, text.length);
    let d = Math.max(MIN_SEG, Math.round(len * MS_PER_CHAR));
    if (/[。．.?!？！]$/.test(text.trim())) d += PAUSE_AFTER_CLAUSE;
    return d;
  };

  const floors = texts.map(floorOf);
  const floorSum = floors.reduce((a, b) => a + b, 0);

  if (floorSum <= availableMs) {
    // Stretch leftover
    const scale = availableMs / floorSum;
    const out = floors.map((d) => Math.floor(d * scale));
    const sum = out.reduce((a, b) => a + b, 0);
    out[n - 1]! += availableMs - sum;
    return out;
  }

  // Overflow: protect head (scene + question) and tail (final re-ask), squeeze body
  const headN = Math.min(2, n);
  const tailN = n > headN + 1 ? 1 : 0;
  const head = floors.slice(0, headN);
  const tail = tailN ? floors.slice(n - tailN) : [];
  const body = floors.slice(headN, n - tailN);

  // Prefer keep ~90% of head floors so scene is almost complete
  let headAlloc = head.map((d) => Math.floor(d * 0.92));
  let tailAlloc = tail.map((d) => Math.floor(d * 0.85));
  let headSum = headAlloc.reduce((a, b) => a + b, 0);
  let tailSum = tailAlloc.reduce((a, b) => a + b, 0);

  // Ensure body gets at least min per line if possible
  const bodyMin = body.length * 900;
  if (headSum + tailSum + bodyMin > availableMs) {
    // Extreme packing: proportional all floors
    const scale = availableMs / floorSum;
    const out = floors.map((d) => Math.max(800, Math.floor(d * scale)));
    const sum = out.reduce((a, b) => a + b, 0);
    out[n - 1]! += availableMs - sum;
    return out;
  }

  let bodyBudget = availableMs - headSum - tailSum;
  const bodyFloorSum = body.reduce((a, b) => a + b, 0) || 1;
  let bodyAlloc = body.map((d) =>
    Math.max(900, Math.floor((d / bodyFloorSum) * bodyBudget)),
  );
  let bSum = bodyAlloc.reduce((a, b) => a + b, 0);
  if (bodyAlloc.length) {
    bodyAlloc[bodyAlloc.length - 1]! += bodyBudget - bSum;
  }

  const out = [...headAlloc, ...bodyAlloc, ...tailAlloc];
  const sum = out.reduce((a, b) => a + b, 0);
  out[n - 1]! += availableMs - sum;
  return out;
}

export function adaptV4ToPackage(
  raw: unknown,
  options: AdaptV4Options = {},
): ListeningPackage {
  const v4 = raw as V4Root;
  const level = (v4.source?.level ?? "N2").toUpperCase() as
    | "N1"
    | "N2"
    | "N3"
    | "N4"
    | "N5";
  const { year, month } = parseExam(v4.source?.exam);
  const lessonId =
    options.lessonId ??
    `jlpt-${level.toLowerCase()}-${year}-${String(month).padStart(2, "0")}`;

  const speakerMap = new Map<string, LocalizedText>();
  speakerMap.set("narrator", speakerLabel("narrator"));
  speakerMap.set("female_1", speakerLabel("female_1"));
  speakerMap.set("male_1", speakerLabel("male_1"));

  const sections: Section[] = [];

  for (const mondai of v4.mondai ?? []) {
    const mNum =
      mondai.number ??
      (Number(String(mondai.id).replace(/\D/g, "")) || 1);
    const sectionId = `${lessonId}-m${mNum}`;
    const questions: Question[] = [];
    let prevQEnd: number | null = null;

    for (const q of mondai.questions ?? []) {
      const qNum =
        q.question_no ?? (Number(String(q.id).split("-q")[1]) || 1);
      const questionId = `${sectionId}-q${qNum}`;
      const { sentences, turnToSentenceIds } = collectSentences(q);

      const qStart = q.start_ms ?? 0;
      const qEnd =
        q.end_ms != null && q.end_ms > qStart
          ? q.end_ms
          : qStart + 60000;

      const cuePad = numberAnnouncementPadMs({
        qNum,
        qStart,
        qEnd,
        prevQEnd,
        sentences,
      });
      const contentStart = qStart + cuePad;

      // Precompute unverified sequence durations if no per-sentence verified range
      const texts = sentences.map(sentenceJa);
      const hasAnyVerified = sentences.some(
        (s) =>
          s.timing_status === "verified" &&
          s.start_ms != null &&
          s.end_ms != null &&
          (s.end_ms as number) > (s.start_ms as number),
      );

      const needEstimate = sentences.map((s) => {
        const v =
          s.timing_status === "verified" &&
          s.start_ms != null &&
          s.end_ms != null &&
          (s.end_ms as number) > (s.start_ms as number);
        return !v;
      });

      // If ALL need estimate, allocate over [contentStart, qEnd]
      // If MIXED: fill only runs of consecutive unverified between anchors (simpler: all-estimate only)
      let estimatedDurations: number[] | null = null;
      if (needEstimate.every(Boolean) && sentences.length > 0) {
        estimatedDurations = allocateUnverifiedDurationsMs(
          texts,
          Math.max(1000, qEnd - contentStart),
        );
      } else if (needEstimate.some(Boolean) && !hasAnyVerified) {
        estimatedDurations = allocateUnverifiedDurationsMs(
          texts,
          Math.max(1000, qEnd - contentStart),
        );
      }

      const segments: Segment[] = [];
      let cursor = contentStart;
      let order = 0;

      for (let i = 0; i < sentences.length; i++) {
        const s = sentences[i]!;
        order += 1;
        const textStr = texts[i] ?? "";
        const sp = normSpeaker(s.speaker);
        if (!speakerMap.has(sp)) speakerMap.set(sp, speakerLabel(sp));

        const verified =
          s.timing_status === "verified" &&
          s.start_ms != null &&
          s.end_ms != null &&
          (s.end_ms as number) > (s.start_ms as number);

        let segStart: number;
        let segEnd: number;
        let timingStatus: "verified" | "unverified";

        if (verified) {
          segStart = s.start_ms as number;
          segEnd = s.end_ms as number;
          timingStatus = "verified";
          cursor = Math.max(cursor, segEnd);
        } else if (estimatedDurations) {
          const dur = estimatedDurations[i] ?? 1200;
          segStart = cursor;
          segEnd = Math.min(qEnd, cursor + dur);
          // last segment: snap end to qEnd to avoid leftover dead zone cut-off
          if (i === sentences.length - 1) segEnd = qEnd;
          if (segEnd <= segStart) segEnd = Math.min(qEnd, segStart + 900);
          cursor = segEnd;
          timingStatus = "unverified";
        } else {
          // mixed with some verified anchors: use residual proportional between gap
          const nextVerifiedIdx = sentences.findIndex(
            (x, j) =>
              j > i &&
              x.timing_status === "verified" &&
              x.start_ms != null &&
              x.end_ms != null,
          );
          const rangeEnd =
            nextVerifiedIdx >= 0
              ? (sentences[nextVerifiedIdx]!.start_ms as number)
              : qEnd;
          const remaining = sentences.slice(i).filter((_, j) => {
            const idx = i + j;
            const x = sentences[idx]!;
            return !(
              x.timing_status === "verified" &&
              x.start_ms != null &&
              x.end_ms != null
            );
          });
          // count consecutive unverified until next verified
          let run = 0;
          for (let j = i; j < sentences.length; j++) {
            const x = sentences[j]!;
            if (
              x.timing_status === "verified" &&
              x.start_ms != null &&
              x.end_ms != null
            )
              break;
            run++;
          }
          const runTexts = texts.slice(i, i + run);
          const durs = allocateUnverifiedDurationsMs(
            runTexts,
            Math.max(1000, rangeEnd - cursor),
          );
          const dur = durs[0] ?? 1200;
          segStart = cursor;
          segEnd = Math.min(rangeEnd, cursor + dur);
          if (segEnd <= segStart) segEnd = Math.min(rangeEnd, segStart + 900);
          cursor = segEnd;
          timingStatus = "unverified";
          void remaining;
        }

        // Never start situation before contentStart when skipping number cue
        if (
          order === 1 &&
          cuePad > 0 &&
          !isStandaloneNumberBanner(textStr) &&
          segStart < contentStart
        ) {
          const shift = contentStart - segStart;
          segStart = contentStart;
          segEnd = Math.min(qEnd, segEnd + shift);
        }

        const segmentId = s.id.includes(lessonId)
          ? s.id
          : `${questionId}-s${order}`;
        const finalSegId = s.id.match(/m\d+-q\d+/)
          ? `${lessonId}-${s.id}`
          : segmentId;

        const bannerOnly = isStandaloneNumberBanner(textStr);
        const hasPlayable =
          segStart != null &&
          segEnd != null &&
          Number.isFinite(segStart) &&
          Number.isFinite(segEnd) &&
          (segEnd as number) > (segStart as number);

        segments.push({
          id: finalSegId,
          order,
          speaker_id: sp,
          start_ms: segStart,
          end_ms: segEnd,
          text: loc(s.text),
          timing_status: timingStatus,
          dictation_eligible: !bannerOnly && hasPlayable,
        });

        (s as { _finalId?: string })._finalId = finalSegId;
      }

      prevQEnd = qEnd;

      // build lookup original id → final
      const origToFinal = new Map<string, string>();
      sentences.forEach((s, i) => {
        const seg = segments[i];
        if (seg) {
          origToFinal.set(s.id, seg.id);
        }
      });

      const lp = q.listening_practice;
      const ui = n2ListeningUi(mNum);
      const imageMode =
        Boolean(lp?.choice_presentation?.type?.toLowerCase().includes("image")) ||
        lp?.choice_source === "image_semantic_transcription";

      const baseSegs =
        segments.length > 0
          ? segments
          : ([
              {
                id: `${questionId}-s1`,
                order: 1,
                speaker_id: "narrator",
                start_ms: qStart,
                end_ms: qEnd,
                text: loc("(empty)"),
                timing_status: "unverified" as const,
                dictation_eligible: false,
              },
            ] satisfies Segment[]);

      const dictationCfg = {
        enabled: true,
        modes: {
          sentence_dictation: { enabled: true },
          full_question_dictation: { enabled: true },
        },
      };

      const choiceMode = (
        imageMode ? "image" : ui.choiceDisplay
      ) as "text" | "image" | "numbers";

      type McPart = {
        id: string;
        order: number;
        unitId: string;
        prompt?: LocalizedText;
        choices: Choice[];
      };

      const parts: McPart[] = [];
      const subqs = Array.isArray(lp?.subquestions) ? lp!.subquestions! : [];

      if (subqs.length > 0) {
        // 問題5 Q2 style: one audio, multiple sub-questions answered together
        for (let si = 0; si < subqs.length; si++) {
          const sq = subqs[si]!;
          const sqOrder = sq.order ?? si + 1;
          const sqId = `${questionId}-sq${sqOrder}`;
          const hasSubChoices =
            Array.isArray(sq.choices) && (sq.choices?.length ?? 0) > 0;
          let sqChoices: Choice[] | undefined;
          if (hasSubChoices && sq.choices) {
            sqChoices = mapChoicesFromV4(sq.choices, {
              correctId: sq.correct_choice_id,
              evidenceTurnIds: sq.evidence_turn_ids,
              turnToSentenceIds,
              origToFinal,
              imageKeyPrefix: sq.id || `${q.id}-sq${sqOrder}`,
              imageUrls: options.imageUrls,
              fallbackExplanationVi: sq.explanation_vi,
              fallbackExplanationEn: sq.explanation_en,
            });
          } else if (sq.correct_choice_id) {
            sqChoices = synthesizeNumberChoices({
              count: 4,
              correctId: sq.correct_choice_id,
              explanationVi: sq.explanation_vi,
              explanationEn: sq.explanation_en,
            });
          }
          if (!sqChoices?.length) continue;
          parts.push({
            id: sqId,
            order: qNum * 100 + sqOrder,
            unitId: questionId,
            prompt: locPrompt(sq.prompt),
            choices: sqChoices,
          });
        }
      } else {
        const hasChoices =
          Array.isArray(lp?.choices) && (lp!.choices?.length ?? 0) > 0;
        let choices: Choice[] | undefined;
        if (hasChoices && lp?.choices) {
          choices = mapChoicesFromV4(lp.choices, {
            correctId: lp.correct_choice_id,
            evidenceTurnIds: lp.evidence_turn_ids,
            turnToSentenceIds,
            origToFinal,
            imageKeyPrefix: q.id,
            imageUrls: options.imageUrls,
            fallbackExplanationVi: lp.explanation_vi,
            fallbackExplanationEn: lp.explanation_en,
          });
        } else if (
          lp?.enabled !== false &&
          (lp?.correct_choice_id || lp?.question_type?.includes("choice"))
        ) {
          // Mondai 3: choices spoken only / null in source → stub ○1–○4
          const count = mNum === 4 ? 3 : 4;
          choices = synthesizeNumberChoices({
            count,
            correctId: lp?.correct_choice_id,
            explanationVi: lp?.explanation_vi,
            explanationEn: lp?.explanation_en,
            correctAnswerText: lp?.correct_answer_text,
          });
        }

        if (choices?.length) {
          parts.push({
            id: questionId,
            order: qNum,
            unitId: questionId,
            prompt: locPrompt(lp?.prompt),
            choices,
          });
        } else {
          // No MC → conversation/dictation-only container
          questions.push({
            id: questionId,
            order: qNum,
            type: "conversation",
            audio: { start_ms: qStart, end_ms: qEnd },
            ...(locPrompt(lp?.prompt)
              ? { prompt: locPrompt(lp?.prompt) }
              : {}),
            choice_display_mode: "text",
            dialogue_translation: loc(
              undefined,
              q.dialogue_translation_vi,
              q.dialogue_translation_en,
            ),
            segments: baseSegs,
            dictation: dictationCfg,
          });
        }
      }

      for (const part of parts) {
        // Unique segment ids when multiple parts share transcript (問題5 multi-sub)
        const partSegs = cloneSegmentsForPart(baseSegs, part.id);
        const partChoices = part.choices.map((c) => ({
          ...c,
          evidence_segment_ids: remapEvidence(c.evidence_segment_ids, part.id),
        }));
        questions.push({
          id: part.id,
          order: part.order,
          type: "listening_multiple_choice",
          audio: { start_ms: qStart, end_ms: qEnd },
          ...(part.prompt ? { prompt: part.prompt } : { prompt: loc("—") }),
          choices: partChoices,
          choice_display_mode: choiceMode,
          listening_unit_id: part.unitId,
          prompt_visibility: ui.promptVisibility,
          dialogue_translation: loc(
            undefined,
            q.dialogue_translation_vi,
            q.dialogue_translation_en,
          ),
          segments: partSegs,
          dictation: dictationCfg,
        });
      }
    }

    sections.push({
      id: sectionId,
      order: mNum,
      title: loc(`問題${mNum}`, `Vấn đề ${mNum}`, `Part ${mNum}`),
      questions,
    });
  }

  const speakers = [...speakerMap.entries()].map(([id, label]) => ({
    id,
    label,
  }));

  const titleName =
    v4.source?.name ?? `JLPT ${level} ${year}/${String(month).padStart(2, "0")}`;

  return {
    schema_version: 2,
    id: lessonId,
    status: options.status ?? "published",
    content_version: 1,
    title: loc(titleName, titleName, titleName),
    source: {
      type: "jlpt",
      level,
      year,
      month,
    },
    audio: {
      file: "listening.mp3",
      duration_ms: v4.source?.audio_duration_ms ?? null,
    },
    speakers,
    sections,
  };
}
