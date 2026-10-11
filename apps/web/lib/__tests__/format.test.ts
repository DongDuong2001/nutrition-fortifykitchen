import { describe, it, expect } from "vitest";
import { formatNumber, formatRange } from "../format";

describe("lib/format", () => {
  describe("formatNumber", () => {
    it("formats integers with dot thousand separators", () => {
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(60)).toBe("60");
      expect(formatNumber(1041)).toBe("1.041");
      expect(formatNumber(1950)).toBe("1.950");
      expect(formatNumber(2275)).toBe("2.275");
      expect(formatNumber(1000000)).toBe("1.000.000");
    });

    it("formats decimal numbers with comma decimal separator", () => {
      expect(formatNumber(2.1)).toBe("2,1");
      expect(formatNumber(1.5, { decimals: 1 })).toBe("1,5");
      expect(formatNumber(2.125, { decimals: 2 })).toBe("2,13");
      expect(formatNumber(1041.5, { decimals: 1 })).toBe("1.041,5");
      expect(formatNumber(0.6)).toBe("0,6");
      expect(formatNumber(0.04)).toBe("0,04");
    });
  });

  describe("formatRange", () => {
    it("formats ranges with en-dash and dot thousand separators", () => {
      expect(formatRange(1950, 2275)).toBe("1.950–2.275");
      expect(formatRange(33, 65)).toBe("33–65");
      expect(formatRange(5200, 6500)).toBe("5.200–6.500");
    });

    it("returns single value if min equals max", () => {
      expect(formatRange(1200, 1200)).toBe("1.200");
    });
  });
});
