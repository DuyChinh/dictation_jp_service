import { describe, expect, it } from "vitest";
import { millionairePoints } from "./leaderboardService.js";

describe("points for a game of Who wants to be a millionaire", () => {
  it("pays one point for each million, so the top prize is 250", () => {
    expect(millionairePoints(250_000_000)).toBe(250);
    expect(millionairePoints(40_000_000)).toBe(40);
    expect(millionairePoints(1_000_000)).toBe(1);
  });

  it("pays nothing for the smallest prizes, or for an amount that is not on the ladder", () => {
    expect(millionairePoints(0)).toBe(0);
    expect(millionairePoints(600_000)).toBe(0);
    expect(millionairePoints(999_000_000)).toBe(0);
    expect(millionairePoints(-5)).toBe(0);
    expect(millionairePoints(Number.NaN)).toBe(0);
  });
});
