import { describe, expect, it } from "vitest";
import { BASE_POINTS, LEVELS, isLevel, levelForName, addDays, dayProgress, gainSoFar, plannedGain, vietnamHour, buildSeedLearners, dailyGain, dayKey, daysBetween, mulberry32, periodStart } from "./leaderboardSeed.js";

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
    expect(periodStart("year", new Date("2026-10-12T05:00:00Z"))).toBe("2026-01-01");
    // 17:00 UTC on 31 Dec is already 1 Jan in Vietnam.
    expect(periodStart("year", new Date("2026-12-31T17:00:00Z"))).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("spreading a day's gain over the day", () => {
  const learner = { points: 2500, activity: 1, intensity: 1.2 };

  it("plans the same gain every time, but a different one each day", () => {
    expect(plannedGain(learner, "abc", "2026-10-13")).toBe(plannedGain(learner, "abc", "2026-10-13"));
    const days = Array.from({ length: 10 }, (_, i) => plannedGain(learner, "abc", addDays("2026-10-01", i)));
    expect(new Set(days).size).toBeGreaterThan(5);
  });

  it("only ever grows during the day and ends at the plan", () => {
    const planned = plannedGain(learner, "abc", "2026-10-13");
    let last = 0;
    for (let h = 0; h <= 24; h += 0.5) {
      const now = gainSoFar(planned, "abc", "2026-10-13", h);
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
    expect(gainSoFar(planned, "abc", "2026-10-13", 24)).toBe(planned);
    expect(gainSoFar(planned, "abc", "2026-10-13", 3)).toBeLessThan(planned * 0.1);
  });

  it("has learners at different stages at the same hour", () => {
    const at = new Set(
      Array.from({ length: 40 }, (_, i) => dayProgress(14) && gainSoFar(1000, `id${i}`, "2026-10-13", 14)),
    );
    expect(at.size).toBeGreaterThan(20);
  });

  it("reads the hour in Vietnam", () => {
    expect(vietnamHour(new Date("2026-10-13T00:30:00Z"))).toBe(7.5);
  });
});

describe("levels", () => {
  it("gives every demo learner a fixed level, with all five used", () => {
    const learners = buildSeedLearners();
    const counts = new Map<string, number>();
    for (const l of learners) counts.set(l.level, (counts.get(l.level) ?? 0) + 1);
    expect([...counts.keys()].sort()).toEqual([...LEVELS].sort());
    expect(Math.min(...counts.values())).toBeGreaterThan(8);
    expect(levelForName(learners[0]!.name)).toBe(learners[0]!.level);
  });

  it("accepts only N1 to N5", () => {
    expect(isLevel("N2")).toBe(true);
    expect(isLevel("n2")).toBe(false);
    expect(isLevel("ALL")).toBe(false);
  });
});
