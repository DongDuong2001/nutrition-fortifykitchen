import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SAMPLE_DAY, type MockDayData } from "../mock/sample-day";
import { SAMPLE_PROFILE, applyProfileTargets, targetsFor } from "../profile";
import { microsSummaryFor } from "../lacking";

// V3-SPEC §6 (Hao 22/10): the demo day's targets come from lib/targets.ts and lib/rda.ts for the default demo profile,
// so every screen (Hôm nay, Vi chất, Mục tiêu, Tổng quan, trends, detail, share) shows the same numbers. Only targets
// and percentages are computed; the food values stay as they are.
beforeAll(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-15T10:00:00+07:00") }));
afterAll(() => vi.useRealTimers());

describe("the sample day", () => {
  it("carries the sample profile's targets and the percentages they give", () => {
    const expected = applyProfileTargets(SAMPLE_DAY, SAMPLE_PROFILE, targetsFor(SAMPLE_PROFILE));
    const pick = (d: MockDayData) => ({
      calories: d.calories,
      macros: d.macros.map((m) => [m.key, m.targetMin, m.targetMax, m.percentage, m.displayValue]),
      minerals: d.minerals.map((m) => [m.key, m.targetMin, m.targetMax, m.percentage, m.displayValue]),
      vitamins: d.vitamins.map((m) => [m.key, m.targetMin, m.targetMax, m.percentage, m.displayValue]),
      summary: d.microsSummary,
    });
    expect(pick(SAMPLE_DAY)).toEqual({ ...pick(expected), summary: microsSummaryFor(expected) });
  });

  it("reads the same everywhere: 9/22 reached, Vitamin D and Vitamin E lack most, 1.041 of 2.275 kcal", () => {
    expect(SAMPLE_DAY.microsSummary).toMatchObject({ achieved: 9, total: 22, mostLacking: ["Vitamin D", "Vitamin E"] });
    expect(SAMPLE_DAY.calories).toMatchObject({ consumed: 1041, targetMin: 2275, percentage: 46 });
  });
});
