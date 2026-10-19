import { describe, expect, it } from "vitest";
import { VITALS_SAMPLE_RATE, clsOf, inpOf, pageOf, sampled } from "../vitals";

// Part 8 (Dong #5): the web reports LCP, INP and CLS for one page view in five, worked out from PerformanceObserver entries.

describe("vitals", () => {
  it("CLS is the worst session window, input-led shifts left out", () => {
    const shifts = [
      { startTime: 100, value: 0.05, hadRecentInput: false },
      { startTime: 600, value: 0.05, hadRecentInput: false },
      { startTime: 900, value: 0.5, hadRecentInput: true },
      // more than 1 s later: a new window
      { startTime: 2000, value: 0.08, hadRecentInput: false },
    ];
    expect(clsOf(shifts)).toBeCloseTo(0.1, 5);
    expect(clsOf([])).toBe(0);
  });

  it("a window ends after 5 s even when shifts keep coming", () => {
    const shifts = Array.from({ length: 12 }, (_, i) => ({ startTime: i * 900, value: 0.01, hadRecentInput: false }));
    expect(clsOf(shifts)).toBeCloseTo(0.06, 5);
  });

  it("INP is the slowest interaction, its events grouped by interaction id; 0 with none", () => {
    expect(inpOf([])).toBe(0);
    expect(
      inpOf([
        { interactionId: 1, duration: 80 },
        { interactionId: 1, duration: 120 },
        { interactionId: 2, duration: 200 },
        { interactionId: 0, duration: 900 },
      ]),
    ).toBe(200);
  });

  it("with 50 interactions or more, the 98th percentile (the worst one is left out)", () => {
    const events = Array.from({ length: 60 }, (_, i) => ({ interactionId: i + 1, duration: i === 59 ? 2000 : 100 + i }));
    expect(inpOf(events)).toBe(158);
  });

  it("samples one view in five and never sends the query", () => {
    expect(VITALS_SAMPLE_RATE).toBe(0.2);
    expect(sampled(0.19)).toBe(true);
    expect(sampled(0.2)).toBe(false);
    expect(pageOf("/app?date=2026-10-12#x")).toBe("/app");
  });
});
