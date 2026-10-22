import { describe, expect, it } from "vitest";
import { nutrientHistorySummary } from "../nutrient-history-summary";

// 2026-10-04 is a Sunday (CN); the 5th is a Monday (T2)
const day = (d: number, percentage: number | null) => ({ iso: `2026-10-${String(d).padStart(2, "0")}`, percentage });

describe("nutrientHistorySummary", () => {
  it("names the best day when no day reached the target", () => {
    const points = [day(4, 68), day(5, 90), day(6, 35), day(7, 58), day(8, 54), day(9, 42), day(10, 33)];
    expect(nutrientHistorySummary(points, "1.000 mg")).toBe("Chưa ngày nào đạt 1.000 mg; cao nhất T2 (90%).");
  });

  it("counts the days that reached the target", () => {
    const points = [day(4, 100), day(5, 140), day(6, 35), day(7, null), day(8, 54), day(9, 42), day(10, 33)];
    expect(nutrientHistorySummary(points, "8–10 mg")).toBe("Đạt 8–10 mg 2/7 ngày; cao nhất T2 (140%).");
  });

  it("gives a tie for the best day to the later one", () => {
    expect(nutrientHistorySummary([day(5, 80), day(6, 80)], "1.000 mg")).toBe("Chưa ngày nào đạt 1.000 mg; cao nhất T3 (80%).");
  });

  it("says nothing without a target or without any share", () => {
    expect(nutrientHistorySummary([day(5, 80)], null)).toBeNull();
    expect(nutrientHistorySummary([day(5, null), day(6, null)], "1.000 mg")).toBeNull();
  });
});
