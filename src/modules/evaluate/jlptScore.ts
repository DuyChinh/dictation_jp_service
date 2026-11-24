/**
 * JLPT-style scaled scoring.
 *
 * The real exam does not report "number right": every answer is fed to an Item Response Theory (IRT)
 * model, the candidate's ability is estimated from the whole answer pattern, and that ability is
 * equated onto a 0–60 scale per section (180 in total). Two candidates with the same raw score can
 * therefore land on different scaled scores, depending on which questions they got right.
 *
 * The JLPT does not publish its item parameters, so this module reproduces the *method* with
 * estimated parameters:
 *   - 3PL model: P(θ) = c + (1 − c) / (1 + e^(−a(θ − b))), c = 1 / number of choices (blind guessing).
 *   - b (difficulty) ramps from easy to hard across a part, the way an exam is laid out
 *     (question 1 of each part is the easiest, the last the hardest); reading and ordering
 *     questions get a small extra push.
 *   - θ is estimated by EAP (Expected A Posteriori): the mean of the posterior over a θ grid,
 *     with a standard-normal prior. Unlike maximum likelihood it stays finite for all-right and
 *     all-wrong patterns.
 *   - The ability is turned into a score through the test characteristic curve of the same items
 *     (the expected share right), stretched so an all-wrong pattern is 0 and an all-right one is the maximum.
 * Pass marks and section minimums are the published ones.
 *
 * If calibrated parameters become available, give an item `a` / `b` and they are used as they are.
 */

export type JlptLevel = "N1" | "N2" | "N3" | "N4" | "N5";
export type ScaleId = "language" | "reading" | "languageReading" | "listening";

export type ScoreItem = {
  part: "vocab" | "grammar" | "reading" | "listening";
  /** Position in the exam; only the order matters. */
  no: number;
  type?: string;
  choices: number;
  correct: boolean;
  a?: number;
  b?: number;
};

export type ScaleScore = {
  id: ScaleId;
  /** Scaled score, whole number in 0..max. */
  score: number;
  max: number;
  /** Published minimum for the section: below it the candidate fails whatever the total. */
  min: number;
  correct: number;
  total: number;
  /** True when only part of the section was sat (e.g. vocabulary alone), so the score is an estimate. */
  partial: boolean;
};

export type JlptScore = {
  method: "irt-3pl-eap";
  level: JlptLevel;
  scales: ScaleScore[];
  /** Sum of the scales; null unless every scale of the level was sat. */
  total: number | null;
  total_max: 180;
  pass_total: number;
  /** null unless the whole exam was sat. */
  passed: boolean | null;
};

type ScaleDef = { id: ScaleId; max: number; min: number; parts: ScoreItem["part"][] };

const MIN_SECTION = 19;

const SCALES_N1_N3: ScaleDef[] = [
  { id: "language", max: 60, min: MIN_SECTION, parts: ["vocab", "grammar"] },
  { id: "reading", max: 60, min: MIN_SECTION, parts: ["reading"] },
  { id: "listening", max: 60, min: MIN_SECTION, parts: ["listening"] },
];
const SCALES_N4_N5: ScaleDef[] = [
  { id: "languageReading", max: 120, min: 38, parts: ["vocab", "grammar", "reading"] },
  { id: "listening", max: 60, min: MIN_SECTION, parts: ["listening"] },
];

const LEVELS: Record<JlptLevel, { scales: ScaleDef[]; pass: number }> = {
  N1: { scales: SCALES_N1_N3, pass: 100 },
  N2: { scales: SCALES_N1_N3, pass: 90 },
  N3: { scales: SCALES_N1_N3, pass: 95 },
  N4: { scales: SCALES_N4_N5, pass: 90 },
  N5: { scales: SCALES_N4_N5, pass: 80 },
};

export function parseLevel(level: unknown): JlptLevel | null {
  const v = String(level ?? "").toUpperCase();
  return v in LEVELS ? (v as JlptLevel) : null;
}

const GRID = Array.from({ length: 81 }, (_, i) => -4 + i * 0.1);
const PRIOR = GRID.map((t) => Math.exp((-t * t) / 2));
const DISCRIMINATION = 1.1;

type Params = { a: number; b: number; c: number };

/** Difficulty ramps from −1 (first of the part) to +1 (last); reading and ordering items sit a bit higher. */
function paramsFor(items: ScoreItem[]): Params[] {
  const byPart = new Map<string, ScoreItem[]>();
  for (const it of items) {
    const list = byPart.get(it.part) ?? [];
    list.push(it);
    byPart.set(it.part, list);
  }
  const rank = new Map<ScoreItem, number>();
  for (const list of byPart.values()) {
    [...list].sort((x, y) => x.no - y.no).forEach((it, i, all) => rank.set(it, all.length > 1 ? i / (all.length - 1) : 0.5));
  }
  return items.map((it) => {
    const nudge = (it.part === "reading" ? 0.2 : 0) + (it.type === "sort_star" ? 0.35 : 0);
    return {
      a: it.a ?? DISCRIMINATION,
      b: it.b ?? -1 + 2 * (rank.get(it) ?? 0.5) + nudge,
      c: 1 / Math.max(2, it.choices),
    };
  });
}

const prob = (theta: number, p: Params) => p.c + (1 - p.c) / (1 + Math.exp(-p.a * (theta - p.b)));

/** EAP ability: the posterior mean of θ given the answer pattern. */
export function eapTheta(params: Params[], right: boolean[]): number {
  let num = 0;
  let den = 0;
  GRID.forEach((theta, g) => {
    let like = PRIOR[g]!;
    params.forEach((p, i) => {
      const pr = prob(theta, p);
      like *= right[i] ? pr : 1 - pr;
    });
    num += theta * like;
    den += like;
  });
  return den > 0 ? num / den : 0;
}

/** Share of the items an examinee of ability θ is expected to get right (the test characteristic curve). */
const expectedShare = (params: Params[], theta: number) =>
  params.reduce((sum, p) => sum + prob(theta, p), 0) / Math.max(params.length, 1);

/** Scaled score 0..max for one answer pattern; all-wrong is 0 and all-right is max. */
export function scaledScore(items: ScoreItem[], max: number): number {
  if (items.length === 0) return 0;
  const params = paramsFor(items);
  const share = (right: boolean[]) => expectedShare(params, eapTheta(params, right));
  const low = share(items.map(() => false));
  const high = share(items.map(() => true));
  const mine = share(items.map((i) => i.correct));
  const unit = high > low ? (mine - low) / (high - low) : 0;
  return Math.round(Math.min(1, Math.max(0, unit)) * max);
}

/**
 * Scores a sitting. `full` tells which parts the exam contained (the sitting's scope), so a section
 * that was only partly sat is flagged and no total or pass mark is given for a partial sitting.
 */
export function scoreSitting(
  level: JlptLevel,
  items: ScoreItem[],
  sat: { vocab: boolean; grammar: boolean; reading: boolean; listening: boolean },
): JlptScore {
  const def = LEVELS[level];
  const scales: ScaleScore[] = [];
  for (const scale of def.scales) {
    const own = items.filter((i) => scale.parts.includes(i.part));
    if (own.length === 0) continue;
    scales.push({
      id: scale.id,
      score: scaledScore(own, scale.max),
      max: scale.max,
      min: scale.min,
      correct: own.filter((i) => i.correct).length,
      total: own.length,
      partial: !scale.parts.every((p) => sat[p]),
    });
  }
  const whole = scales.length === def.scales.length && scales.every((s) => !s.partial);
  const total = whole ? scales.reduce((sum, s) => sum + s.score, 0) : null;
  return {
    method: "irt-3pl-eap",
    level,
    scales,
    total,
    total_max: 180,
    pass_total: def.pass,
    passed: total === null ? null : total >= def.pass && scales.every((s) => s.score >= s.min),
  };
}
