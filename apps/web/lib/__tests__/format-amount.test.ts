import { describe, it, expect } from "vitest";
import { formatAmount } from "../format";

describe("formatAmount", () => {
  it("shows kcal as a whole number with a thousands dot", () => {
    expect(formatAmount(1125.4, "kcal")).toBe("1.125");
  });

  it("shows mg as a whole number", () => {
    expect(formatAmount(295.5, "mg")).toBe("296");
  });

  it("shows grams under 100 with one decimal, and drops a trailing .0", () => {
    expect(formatAmount(22.04, "g")).toBe("22");
    expect(formatAmount(22.5, "g")).toBe("22,5");
  });

  it("shows µg like g: one decimal under 100 (vitamin D 2,1 µg)", () => {
    expect(formatAmount(2.1, "µg")).toBe("2,1");
    expect(formatAmount(150, "µg")).toBe("150");
  });

  it("shows grams of 100 or more as a whole number", () => {
    expect(formatAmount(150, "g")).toBe("150");
  });

  it("shows values under 1 with up to two decimals, using a comma", () => {
    expect(formatAmount(0.3, "mg")).toBe("0,3");
    expect(formatAmount(0.45, "mg")).toBe("0,45");
  });

  it("shows <0,01 for a positive value that would round to 0", () => {
    expect(formatAmount(0.004, "mg")).toBe("<0,01");
  });

  it("shows zero as 0", () => {
    expect(formatAmount(0, "kcal")).toBe("0");
  });
});
