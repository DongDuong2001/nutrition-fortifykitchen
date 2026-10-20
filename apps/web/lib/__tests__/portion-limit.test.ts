import { describe, expect, it } from "vitest";
import {
  MAX_GRAMS_MESSAGE,
  MAX_GRAMS_PER_PORTION,
  MIN_GRAMS_MESSAGE,
  gramsTooSmall,
  fitPortion,
  formatGramsServingLabel,
  formatPortionLabel,
  overGramLimit,
  parseGramsInput,
  portionSummary,
  resolvePortion,
  withBase,
  withMult,
  type GramPortion,
} from "../portion";
import type { FoodItem } from "../mock/foods";
import type { CookSwitch } from "../yield";

const rice: FoodItem = { id: "rice", nameVi: "Cơm trắng", category: "tinh_bot", source: "USDA", servings: [{ label: "100 g", grams: 100 }], nutrients: { energy: 130 } };
const grams = (base: number, mult = 1, state: GramPortion["state"] = null): GramPortion => ({ kind: "grams", base, mult, state });

describe("the 5.000 g limit holds for base × N (cc-63, B1)", () => {
  it("5000 g × 20 is kept as 250 g × 20: the label, the logged grams and the summary say 5.000 g", () => {
    const out = fitPortion(rice, grams(5000, 20), null);
    expect(out.portion).toEqual(grams(250, 20));
    expect(out.grams).toBe(5000);
    expect(out.label).toBe("250 g × 20");
    expect(out.clamped).toBe(true);
    expect(portionSummary(out.portion, null)).toBe("5.000 g");
  });

  it("typing a bigger amount with N set lowers the amount, not N", () => {
    expect(withBase(grams(100, 20), 5000)).toEqual(grams(250, 20));
    expect(withBase(grams(100, 3), 1000)).toEqual(grams(1000, 3));
    expect(withBase(grams(100, 3), 2000)).toEqual(grams(1666.6, 3));
    expect(withBase(grams(100, 1), 5000)).toEqual(grams(5000, 1));
  });

  it("a total at the limit is not clamped, one gram over is", () => {
    expect(fitPortion(rice, grams(250, 20), null).clamped).toBe(false);
    expect(fitPortion(rice, grams(250.1, 20), null).clamped).toBe(true);
  });

  it("a label read back from an old entry (5.000 g × 20) is made to agree too", () => {
    const out = resolvePortion(rice, grams(5000, 20), null);
    expect(out.grams).toBe(5000);
    expect(out.label).toBe("250 g × 20");
  });

  it("a cooked amount converted to raw grams stays within the limit as well", () => {
    const sw: CookSwitch = { own: "raw", pair: null, factor: 0.5 };
    // 4000 g cooked is 8000 g raw: the amount is lowered until the logged grams are 5000
    const out = fitPortion(rice, grams(4000, 1, "cooked"), sw);
    expect(out.grams).toBeLessThanOrEqual(MAX_GRAMS_PER_PORTION);
    expect(out.portion).toEqual(grams(2500, 1, "cooked"));
    expect(out.label).toBe("Đã nấu chín · 2.500 g");
    expect(out.clamped).toBe(true);
  });

  it("the stepper's N still lowers the amount only as far as the limit", () => {
    expect(withMult(grams(100), 20)).toEqual(grams(100, 20));
    expect(formatPortionLabel(fitPortion(rice, withMult(grams(100), 20), null).portion)).toBe("100 g × 20");
  });

  it("explains itself", () => {
    expect(MAX_GRAMS_MESSAGE).toBe("Tối đa 5.000 g");
  });
});

describe("grams typed in a field", () => {
  it("clamps at 5.000 g in the value and in the Gam tab's label", () => {
    expect(parseGramsInput("100000")).toBe(5000);
    expect(formatGramsServingLabel("100000", "")).toBe("5.000 g");
    expect(overGramLimit("5001")).toBe(true);
    expect(overGramLimit("5000")).toBe(false);
    expect(overGramLimit("abc")).toBe(false);
  });
});

describe("number parsing (cc-63, B5)", () => {
  it("reads 1.000 (a dot and exactly three digits) as 1000 g, and 1,5 or 1.5 as 1,5 g", () => {
    expect(parseGramsInput("1.000")).toBe(1000);
    expect(parseGramsInput("1.234,5")).toBe(1234.5);
    expect(parseGramsInput("1,5")).toBe(1.5);
    expect(parseGramsInput("1.5")).toBe(1.5);
    expect(parseGramsInput("0.500")).toBe(0.5);
    expect(parseGramsInput("2,")).toBe(2);
    expect(parseGramsInput(" 250 ")).toBe(250);
  });

  it("rejects text, exponents, signs and a second separator", () => {
    for (const bad of ["12abc", "1e3", "abc", "-5", "+5", "1.2.3", "0x10", "Infinity", "NaN", "", "  "]) expect(parseGramsInput(bad), bad).toBe(0);
  });
});

describe("gramsTooSmall (cc-62, S17)", () => {
  it("asks for more than 0 g when the field holds 0 or junk, or was left empty after a touch", () => {
    expect(gramsTooSmall("0", false)).toBe(true);
    expect(gramsTooSmall("abc", false)).toBe(true);
    expect(gramsTooSmall("", false)).toBe(false);
    expect(gramsTooSmall("  ", true)).toBe(true);
    expect(gramsTooSmall("150", true)).toBe(false);
    expect(gramsTooSmall("0,5", false)).toBe(false);
    expect(MIN_GRAMS_MESSAGE).toBe("Nhập số gam lớn hơn 0");
  });
});
