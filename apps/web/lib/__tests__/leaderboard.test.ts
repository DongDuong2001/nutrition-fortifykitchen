import { describe, expect, it } from "vitest";
import {
  calculateDisciplineScore,
  getMockLeaderboard,
  LEADERBOARD_STORAGE_KEY,
  isLeaderboardOptedIn,
  setLeaderboardOptIn,
  splitRanks,
} from "../leaderboard";

describe("leaderboard", () => {
  it("calculates discipline score based on days, micros pct, and target hits", () => {
    // 7 days logged * 20 = 140
    // 80% micros * 0.6 = 48
    // 5 target hits * 15 = 75
    // Total = 140 + 48 + 75 = 263
    const score = calculateDisciplineScore(7, 80, 5);
    expect(score).toBe(263);
  });

  it("caps maximum score at 1000", () => {
    const score = calculateDisciplineScore(30, 100, 30);
    expect(score).toBeLessThanOrEqual(1000);
  });

  it("returns zero score for zero activity", () => {
    const score = calculateDisciplineScore(0, 0, 0);
    expect(score).toBe(0);
  });

  it("generates mock leaderboard for weekly and monthly periods", () => {
    const weekly = getMockLeaderboard("weekly", "user-me");
    expect(weekly.period).toBe("weekly");
    expect(weekly.ranks.length).toBeGreaterThan(0);
    expect(weekly.ranks[0].rank).toBe(1);
    expect(weekly.ranks[0].totalScore).toBeGreaterThanOrEqual(weekly.ranks[1].totalScore);

    const monthly = getMockLeaderboard("monthly", "user-me");
    expect(monthly.period).toBe("monthly");
    expect(monthly.ranks.length).toBeGreaterThan(0);
  });

  it("toggles leaderboard opt-in status in storage", () => {
    setLeaderboardOptIn(true);
    expect(isLeaderboardOptedIn()).toBe(true);

    setLeaderboardOptIn(false);
    expect(isLeaderboardOptedIn()).toBe(false);
  });
});

describe("splitRanks (cc-63, B9)", () => {
  it("takes a podium from three ranks and rows for the rest", () => {
    expect(splitRanks([1, 2, 3, 4, 5])).toEqual({ podium: [1, 2, 3], rows: [4, 5] });
    expect(splitRanks([1, 2, 3])).toEqual({ podium: [1, 2, 3], rows: [] });
  });

  it("with fewer than three ranks there is no podium and every rank is a row", () => {
    expect(splitRanks([1, 2])).toEqual({ podium: [], rows: [1, 2] });
    expect(splitRanks([1])).toEqual({ podium: [], rows: [1] });
    expect(splitRanks([])).toEqual({ podium: [], rows: [] });
  });
});
