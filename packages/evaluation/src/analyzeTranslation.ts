/**
 * Chunk-by-chunk feedback for a learner's Japanese→Vietnamese translation of one sentence.
 *
 * Deterministic and free: it checks, per authored chunk, whether the learner's text contains one of
 * the accepted Vietnamese phrases, and whether it contains a known wrong rendering (pitfall).
 * It cannot judge free paraphrase — a miss means "not found", not "wrong" — so the UI must let the
 * learner overrule it and show the reference translation next to the result.
 */

export type TranslationChunk = {
  /** Substring of the Japanese sentence. */
  ja: string;
  /** Canonical Vietnamese for this chunk (always accepted). */
  vi: string;
  /** Other short phrases that also count as correct. */
  accept_vi?: string[];
  /** Why it is translated this way (grammar / vocab). */
  note_vi?: string;
};

export type TranslationPitfall = {
  /** Phrases that reveal the typical mistake. */
  wrong_vi: string[];
  explanation_vi: string;
};

export type TranslationTarget = {
  chunks: TranslationChunk[];
  pitfalls?: TranslationPitfall[];
};

export type ChunkFeedback = {
  ja: string;
  vi: string;
  note_vi?: string;
  hit: boolean;
  /** The phrase found in the learner's text. */
  matched?: string;
  /** Found only after ignoring Vietnamese diacritics (the learner may have typed without them). */
  loose?: boolean;
};

export type PitfallFeedback = { matched: string; explanation_vi: string };

export type TranslationAnalysis = {
  chunks: ChunkFeedback[];
  pitfalls: PitfallFeedback[];
  hits: number;
  total: number;
  /** hits / total, 0–1 */
  coverage: number;
  verdict: "good" | "partial" | "weak";
};

const MARKS = /[̀-ͯ]/g;

function tidy(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function strip(s: string): string {
  return s.normalize("NFD").replace(MARKS, "").replace(/đ/g, "d");
}

/** Whole-word(s) containment, so "ma" does not match inside "mang". */
function contains(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function find(text: string, loose: string, phrases: string[]): { phrase: string; loose: boolean } | null {
  for (const p of phrases) {
    if (contains(text, tidy(p))) return { phrase: p, loose: false };
  }
  for (const p of phrases) {
    if (contains(loose, strip(tidy(p)))) return { phrase: p, loose: true };
  }
  return null;
}

export function analyzeTranslation(userText: string, target: TranslationTarget): TranslationAnalysis {
  const text = tidy(userText);
  const loose = strip(text);

  const chunks: ChunkFeedback[] = target.chunks.map((c) => {
    const found = text ? find(text, loose, [c.vi, ...(c.accept_vi ?? [])]) : null;
    return {
      ja: c.ja,
      vi: c.vi,
      ...(c.note_vi ? { note_vi: c.note_vi } : {}),
      hit: found !== null,
      ...(found ? { matched: found.phrase, ...(found.loose ? { loose: true } : {}) } : {}),
    };
  });

  // A pitfall phrase can sit inside a correct one ("chỉ là nơi" in "không chỉ là nơi"):
  // blank out what was already accepted before looking for mistakes.
  let rest = ` ${text} `;
  let restLoose = ` ${loose} `;
  for (const c of chunks) {
    if (!c.matched) continue;
    rest = rest.split(` ${tidy(c.matched)} `).join(" | ");
    restLoose = restLoose.split(` ${strip(tidy(c.matched))} `).join(" | ");
  }
  rest = rest.trim();
  restLoose = restLoose.trim();

  const pitfalls: PitfallFeedback[] = [];
  for (const p of target.pitfalls ?? []) {
    const found = text ? find(rest, restLoose, p.wrong_vi) : null;
    if (found) pitfalls.push({ matched: found.phrase, explanation_vi: p.explanation_vi });
  }

  const hits = chunks.filter((c) => c.hit).length;
  const total = chunks.length;
  const coverage = total === 0 ? 0 : hits / total;
  const verdict =
    coverage >= 0.8 && pitfalls.length === 0 ? "good" : coverage >= 0.5 ? "partial" : "weak";
  return { chunks, pitfalls, hits, total, coverage, verdict };
}
