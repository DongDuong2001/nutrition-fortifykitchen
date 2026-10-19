import { describe, expect, it } from "vitest";
import { PULL_SLOP_PX, PULL_TRIGGER_PX, pullOffset, startsPull } from "../home/pull-refresh";

// cc-62 (S4): pull to refresh follows the finger with rubber-band resistance and starts only on a clear downward move.

describe("pull to refresh", () => {
  it("is 120 · (1 − e^(−dy/120)): close to 1:1 at first, never past 120", () => {
    expect(pullOffset(0)).toBe(0);
    expect(pullOffset(-30)).toBe(0);
    expect(pullOffset(10)).toBeCloseTo(9.59, 2);
    expect(pullOffset(120)).toBeCloseTo(75.85, 2);
    expect(pullOffset(10_000)).toBeLessThanOrEqual(120);
  });

  it("reaches the 64 px threshold after about 92 px of finger travel", () => {
    expect(pullOffset(91)).toBeLessThan(PULL_TRIGGER_PX);
    expect(pullOffset(92)).toBeGreaterThanOrEqual(PULL_TRIGGER_PX);
  });

  it("starts only after 8 px, downward, and more down than sideways", () => {
    expect(startsPull(0, PULL_SLOP_PX - 1)).toBe(false);
    expect(startsPull(0, PULL_SLOP_PX)).toBe(true);
    expect(startsPull(12, 10)).toBe(false);
    expect(startsPull(-9, 10)).toBe(true);
    expect(startsPull(0, -20)).toBe(false);
  });
});
