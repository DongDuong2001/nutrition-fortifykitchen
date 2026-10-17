import { describe, expect, it } from "vitest";
import { COUNT_MS, countAt } from "../count-up";

describe("countAt (cc-51 number tween)", () => {
  it("starts at the old value and ends exactly at the new one", () => {
    expect(countAt(100, 640, 0)).toBe(100);
    expect(countAt(100, 640, COUNT_MS)).toBe(640);
    expect(countAt(100, 640.4, COUNT_MS + 50)).toBe(640.4);
  });
  it("shows whole numbers on the way, eased out (more than half way at half the time)", () => {
    const mid = countAt(0, 1000, COUNT_MS / 2);
    expect(Number.isInteger(mid)).toBe(true);
    expect(mid).toBeGreaterThan(500);
    expect(mid).toBeLessThan(1000);
  });
  it("counts down too", () => {
    expect(countAt(900, 300, COUNT_MS / 2)).toBeLessThan(600);
  });
});
