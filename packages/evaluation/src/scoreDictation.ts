import { diffCharacters, type DiffOp } from "./diff.js";
import { levenshtein } from "./levenshtein.js";
import { kanjiToHiragana } from "./kanjiToHiragana.js";
import {
  normalizeForPunctInsensitive,
  normalizePrimary,
  stripPunctuation,
} from "./normalize.js";
import {
  ALGORITHM_VERSION,
  NORMALIZATION_VERSION,
  type AlgorithmVersion,
  type NormalizationVersion,
} from "./versions.js";

export type DictationScoreInput = {
  rawAnswer: string;
  expected: string;
  acceptedAnswers?: string[];
  /** default true for practice mode */
  ignorePunctuation?: boolean;
  algorithmVersion?: AlgorithmVersion;
  normalizationVersion?: NormalizationVersion;
};

export type DictationScoreResult = {
  score: number;
  correct: boolean;
  algorithm_version: AlgorithmVersion;
  normalization_version: NormalizationVersion;
  normalized_answer: string;
  normalized_expected: string;
  matched_accepted: boolean;
  ops: DiffOp[];
};

function perfect(
  answer: string,
  expected: string,
  matched_accepted: boolean,
): DictationScoreResult {
  return {
    score: 100,
    correct: true,
    algorithm_version: ALGORITHM_VERSION,
    normalization_version: NORMALIZATION_VERSION,
    normalized_answer: answer,
    normalized_expected: expected,
    matched_accepted,
    ops: answer === expected ? [{ type: "equal", text: answer }] : diffCharacters(expected, answer),
  };
}

/**
 * Score japanese dictation answer (dictation-v1).
 */
export function scoreDictation(input: DictationScoreInput): DictationScoreResult {
  const ignorePunctuation = input.ignorePunctuation ?? true;

  const normalized_answer = normalizePrimary(input.rawAnswer);
  const normalized_expected = normalizePrimary(input.expected);

  // Tier A: primary equality
  if (normalized_answer === normalized_expected) {
    return perfect(normalized_answer, normalized_expected, false);
  }

  // Accepted variants
  for (const alt of input.acceptedAnswers ?? []) {
    if (normalizePrimary(alt) === normalized_answer) {
      return perfect(normalized_answer, normalized_expected, true);
    }
  }

  // Tier B: punctuation-insensitive
  if (ignorePunctuation) {
    const a = normalizeForPunctInsensitive(input.rawAnswer);
    const e = normalizeForPunctInsensitive(input.expected);
    if (a === e && a.length > 0) {
      return {
        score: 100,
        correct: true,
        algorithm_version: ALGORITHM_VERSION,
        normalization_version: NORMALIZATION_VERSION,
        normalized_answer,
        normalized_expected,
        matched_accepted: false,
        ops: diffCharacters(normalized_expected, normalized_answer),
      };
    }
    // accepted with punct-insensitive
    for (const alt of input.acceptedAnswers ?? []) {
      if (normalizeForPunctInsensitive(alt) === a) {
        return {
          score: 100,
          correct: true,
          algorithm_version: ALGORITHM_VERSION,
          normalization_version: NORMALIZATION_VERSION,
          normalized_answer,
          normalized_expected,
          matched_accepted: true,
          ops: diffCharacters(normalized_expected, normalized_answer),
        };
      }
    }
  }

  // Tier C: Kana / Hiragana Reading Equality (Accept Hiragana for Kanji)
  const h_answer = stripPunctuation(kanjiToHiragana(normalized_answer));
  const h_expected = stripPunctuation(kanjiToHiragana(normalized_expected));

  if (h_answer === h_expected && h_answer.length > 0) {
    return {
      score: 100,
      correct: true,
      algorithm_version: ALGORITHM_VERSION,
      normalization_version: NORMALIZATION_VERSION,
      normalized_answer,
      normalized_expected,
      matched_accepted: false,
      ops: diffCharacters(normalized_expected, normalized_answer),
    };
  }

  for (const alt of input.acceptedAnswers ?? []) {
    if (stripPunctuation(kanjiToHiragana(normalizePrimary(alt))) === h_answer) {
      return {
        score: 100,
        correct: true,
        algorithm_version: ALGORITHM_VERSION,
        normalization_version: NORMALIZATION_VERSION,
        normalized_answer,
        normalized_expected,
        matched_accepted: true,
        ops: diffCharacters(normalized_expected, normalized_answer),
      };
    }
  }

  const orig_distance = levenshtein(normalizeForPunctInsensitive(input.rawAnswer), normalizeForPunctInsensitive(input.expected));
  const orig_maxLen = Math.max([...normalizeForPunctInsensitive(input.rawAnswer)].length, [...normalizeForPunctInsensitive(input.expected)].length, 1);
  const orig_score = Math.round(100 * (1 - orig_distance / orig_maxLen));

  const kana_distance = levenshtein(h_answer, h_expected);
  const kana_maxLen = Math.max([...h_answer].length, [...h_expected].length, 1);
  const kana_score = Math.round(100 * (1 - kana_distance / kana_maxLen));

  const bestScore = Math.max(orig_score, kana_score);
  const clamped = Math.max(0, Math.min(100, bestScore));

  return {
    score: clamped,
    correct: clamped === 100,
    algorithm_version: ALGORITHM_VERSION,
    normalization_version: NORMALIZATION_VERSION,
    normalized_answer,
    normalized_expected,
    matched_accepted: false,
    ops: diffCharacters(normalized_expected, normalized_answer),
  };
}

/**
 * Join full-question dictation expected text.
 * Eligible segments: dictation_eligible !== false, order preserved, empty string join.
 */
export function joinFullQuestionExpected(
  segments: Array<{ text: { ja: string }; dictation_eligible?: boolean }>,
): string {
  return segments
    .filter((s) => s.dictation_eligible !== false)
    .map((s) => s.text.ja)
    .join("");
}

/**
 * Fill-blank expected: join tokens text in order.
 */
export function joinFillBlankExpected(
  tokens: Array<{ text: string }>,
): string {
  return tokens.map((t) => t.text).join("");
}
