import { describe, expect, it } from "vitest";
import { parseLevel, scaledScore, scoreSitting, type ScoreItem } from "./jlptScore.js";

/** A test paper: n questions in a part, right where `right(i)` says so. */
const part = (p: ScoreItem["part"], n: number, right: (i: number) => boolean, choices = 4): ScoreItem[] =>
  Array.from({ length: n }, (_, i) => ({ part: p, no: i + 1, choices, correct: right(i) }));

const everything = { vocab: true, grammar: true, reading: true, listening: true };

describe("scaledScore", () => {
  it("is 0 for all wrong and the maximum for all right", () => {
    expect(scaledScore(part("vocab", 30, () => false), 60)).toBe(0);
    expect(scaledScore(part("vocab", 30, () => true), 60)).toBe(60);
    expect(scaledScore([], 60)).toBe(0);
  });

  it("rises with every extra correct answer", () => {
    const at = (k: number) => scaledScore(part("vocab", 30, (i) => i < k), 60);
    for (let k = 1; k <= 30; k++) expect(at(k)).toBeGreaterThanOrEqual(at(k - 1));
    expect(at(30)).toBeGreaterThan(at(15));
    expect(at(15)).toBeGreaterThan(at(0));
  });

  it("scores the answer pattern, not only the count: same raw score, different scaled score", () => {
    const consistent = scaledScore(part("vocab", 30, (i) => i < 15), 60); // easy ones right, hard ones wrong
    const inverted = scaledScore(part("vocab", 30, (i) => i >= 15), 60); // hard ones right, easy ones wrong
    expect(consistent).not.toBe(inverted);
    expect(consistent).toBeGreaterThan(inverted);
  });

  it("scales to the section maximum", () => {
    expect(scaledScore(part("reading", 20, () => true), 120)).toBe(120);
  });

  it("uses calibrated parameters when an item carries them", () => {
    const form = (b: (i: number) => number) =>
      Array.from({ length: 10 }, (_, i) => ({ part: "vocab" as const, no: i + 1, choices: 4, correct: i < 5, a: 1, b: b(i) }));
    const ascending = scaledScore(form((i) => i - 4.5), 60); // the first five are the easy ones
    const descending = scaledScore(form((i) => 4.5 - i), 60); // the first five are the hard ones
    expect(ascending).toBeGreaterThan(descending);
  });
});

describe("scoreSitting", () => {
  const paper = (right: (i: number) => boolean) => [
    ...part("vocab", 30, right),
    ...part("grammar", 21, right),
    ...part("reading", 20, right),
    ...part("listening", 30, right, 3),
  ];

  it("gives three 0–60 scales and a total out of 180 for N2", () => {
    const s = scoreSitting("N2", paper(() => true), everything);
    expect(s.scales.map((x) => [x.id, x.score, x.max])).toEqual([
      ["language", 60, 60],
      ["reading", 60, 60],
      ["listening", 60, 60],
    ]);
    expect(s.total).toBe(180);
    expect(s.passed).toBe(true);
  });

  it("merges language and reading into one 0–120 scale for N4 and N5", () => {
    const s = scoreSitting("N4", paper(() => true), everything);
    expect(s.scales.map((x) => [x.id, x.score, x.max])).toEqual([
      ["languageReading", 120, 120],
      ["listening", 60, 60],
    ]);
    expect(s.pass_total).toBe(90);
  });

  it("fails on a section below the minimum even when the total clears the pass mark", () => {
    // Everything right except listening, which is all wrong: 120/180 total but listening is 0.
    const s = scoreSitting("N2", paper(() => true).map((i) => (i.part === "listening" ? { ...i, correct: false } : i)), everything);
    expect(s.total).toBe(120);
    expect(s.total).toBeGreaterThanOrEqual(s.pass_total);
    expect(s.passed).toBe(false);
  });

  it("fails when everything is wrong", () => {
    const s = scoreSitting("N1", paper(() => false), everything);
    expect(s.total).toBe(0);
    expect(s.passed).toBe(false);
  });

  it("marks a part-sitting as an estimate and gives no total or pass mark", () => {
    const s = scoreSitting("N2", part("vocab", 30, (i) => i < 20), { vocab: true, grammar: false, reading: false, listening: false });
    expect(s.scales).toHaveLength(1);
    expect(s.scales[0]).toMatchObject({ id: "language", partial: true, correct: 20, total: 30 });
    expect(s.total).toBeNull();
    expect(s.passed).toBeNull();
  });

  it("gives no total for the written part alone, but the scales are exact", () => {
    const written = paper(() => true).filter((i) => i.part !== "listening");
    const s = scoreSitting("N2", written, { vocab: true, grammar: true, reading: true, listening: false });
    expect(s.scales.every((x) => !x.partial)).toBe(true);
    expect(s.total).toBeNull();
  });

  it("a middling candidate lands near the middle of the scale", () => {
    const s = scoreSitting("N2", paper((i) => i % 5 < 3), everything); // 60% right everywhere
    expect(s.total).toBeGreaterThan(70);
    expect(s.total).toBeLessThan(140);
  });
});

describe("parseLevel", () => {
  it("accepts JLPT levels in any case and nothing else", () => {
    expect(parseLevel("n2")).toBe("N2");
    expect(parseLevel("N5")).toBe("N5");
    expect(parseLevel("N6")).toBeNull();
    expect(parseLevel(undefined)).toBeNull();
  });
});
