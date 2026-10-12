import { describe, expect, it } from "vitest";
import { BASE_POINTS, addDays, buildSeedLearners, dailyGain, dayKey, daysBetween, mulberry32, periodStart } from "./leaderboardSeed.js";

describe("demo learners", () => {
  const learners = buildSeedLearners();

  it("builds 200 unique, reproducible learners", () => {
    expect(learners).toHaveLength(200);
    expect(new Set(learners.map((l) => l.name)).size).toBe(200);
    expect(buildSeedLearners().map((l) => l.name)).toEqual(learners.map((l) => l.name));
  });

  it("starts everyone at or above the base score, with a long tail", () => {
    expect(Math.min(...learners.map((l) => l.points))).toBeGreaterThanOrEqual(BASE_POINTS);
    const newcomers = learners.filter((l) => l.points < BASE_POINTS + 500).length;
    expect(newcomers).toBeGreaterThan(20);
    expect(Math.max(...learners.map((l) => l.points))).toBeGreaterThan(5000);
  });
});

describe("dailyGain", () => {
  it("is zero on a day off and positive otherwise", () => {
    const learner = { points: 2000, activity: 0.5, intensity: 1 };
    expect(dailyGain(learner, () => 0.9)).toBe(0);
    expect(dailyGain(learner, () => 0.1)).toBeGreaterThanOrEqual(10);
  });

  it("tapers for learners far ahead", () => {
    const rand = () => 0.1;
    const low = dailyGain({ points: 1000, activity: 1, intensity: 1 }, rand);
    const high = dailyGain({ points: 60000, activity: 1, intensity: 1 }, rand);
    expect(high).toBeLessThan(low);
  });

  it("varies from learner to learner over a month", () => {
    const rand = mulberry32(7);
    const totals = buildSeedLearners(30).map((l) => {
      let sum = 0;
      for (let d = 0; d < 30; d++) sum += dailyGain(l, rand);
      return sum;
    });
    expect(new Set(totals).size).toBeGreaterThan(20);
  });
});

describe("day keys", () => {
  it("rolls over at midnight in Vietnam", () => {
    expect(dayKey(new Date("2026-10-12T16:59:00Z"))).toBe("2026-10-12");
    expect(dayKey(new Date("2026-10-12T17:00:00Z"))).toBe("2026-10-13");
  });

  it("counts days between keys", () => {
    expect(daysBetween("2026-10-10", "2026-10-13")).toBe(3);
    expect(daysBetween("2026-10-13", "2026-10-13")).toBe(0);
  });
});

describe("period start", () => {
  it("starts the week on Monday and the month on the 1st", () => {
    // Sunday 2026-10-11 in Vietnam belongs to the week that began Monday 2026-10-05.
    expect(periodStart("week", new Date("2026-10-11T05:00:00Z"))).toBe("2026-10-05");
    expect(periodStart("week", new Date("2026-10-12T05:00:00Z"))).toBe("2026-10-12");
    expect(periodStart("month", new Date("2026-10-12T05:00:00Z"))).toBe("2026-10-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
