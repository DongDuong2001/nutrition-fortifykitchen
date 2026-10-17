import { describe, expect, it } from "vitest";
import { kcalLabel, kcalValue, sumKcal } from "../kcal";

describe("lib/kcal sumKcal", () => {
  it("adds the known values and skips the unknown ones", () => {
    expect(sumKcal([228, null, 126])).toBe(354);
  });
  it("keeps a measured 0", () => {
    expect(sumKcal([0, null])).toBe(0);
  });
  it("is null when nothing is known, never 0", () => {
    expect(sumKcal([null, null])).toBeNull();
    expect(sumKcal([])).toBeNull();
  });
});

describe("lib/kcal kcalValue", () => {
  it("formats a number the Vietnamese way and shows a dash for unknown", () => {
    expect(kcalValue(1041)).toBe("1.041");
    expect(kcalValue(0)).toBe("0");
    expect(kcalValue(null)).toBe("—");
    expect(kcalLabel(2100)).toBe("2.100 kcal");
    expect(kcalLabel(null)).toBe("— kcal");
  });
});
