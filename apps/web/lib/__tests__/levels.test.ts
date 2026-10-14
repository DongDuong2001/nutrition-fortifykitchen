import { describe, it, expect } from "vitest";
import {
  calculateSegments,
  getLevel,
  getLevelLabel,
  getLevelColor,
  getEmptySegmentColor,
  type NutrientLevel,
} from "../levels";

describe("lib/levels", () => {
  describe("calculateSegments", () => {
    it("floors pct/10 and caps at 10", () => {
      expect(calculateSegments(0)).toBe(0);
      expect(calculateSegments(9)).toBe(0);
      expect(calculateSegments(10)).toBe(1);
      expect(calculateSegments(47)).toBe(4);
      expect(calculateSegments(52)).toBe(5);
      expect(calculateSegments(60)).toBe(6);
      expect(calculateSegments(85)).toBe(8);
      expect(calculateSegments(99)).toBe(9);
      expect(calculateSegments(100)).toBe(10);
      expect(calculateSegments(140)).toBe(10);
    });

    it("handles negative percentage gracefully", () => {
      expect(calculateSegments(-10)).toBe(0);
    });
  });

  describe("getLevel", () => {
    it("returns 'thieu' for pct < 50", () => {
      expect(getLevel(0)).toBe("thieu");
      expect(getLevel(49.9)).toBe("thieu");
    });

    it("returns 'trungbinh' for 50 <= pct < 80", () => {
      expect(getLevel(50)).toBe("trungbinh");
      expect(getLevel(79.9)).toBe("trungbinh");
    });

    it("returns 'ganDu' for 80 <= pct < 100", () => {
      expect(getLevel(80)).toBe("ganDu");
      expect(getLevel(99.9)).toBe("ganDu");
    });

    it("returns 'dat' for pct >= 100", () => {
      expect(getLevel(100)).toBe("dat");
      expect(getLevel(150)).toBe("dat");
    });
  });

  describe("getLevelLabel", () => {
    it("returns Vietnamese labels matching the design", () => {
      expect(getLevelLabel("thieu")).toBe("Thiếu");
      expect(getLevelLabel("trungbinh")).toBe("Trung bình");
      expect(getLevelLabel("ganDu")).toBe("Gần đủ");
      expect(getLevelLabel("dat")).toBe("Đạt");
    });
  });

  // Colours are the @theme tokens in app/globals.css (no raw hex here), so light and dark follow the theme
  describe("getLevelColor", () => {
    it("returns light mode token variables", () => {
      expect(getLevelColor("thieu", "light")).toBe("var(--color-level-red)");
      expect(getLevelColor("trungbinh", "light")).toBe("var(--color-level-yellow)");
      expect(getLevelColor("ganDu", "light")).toBe("var(--color-level-green)");
      expect(getLevelColor("dat", "light")).toBe("var(--color-level-blue)");
    });

    it("returns dark mode token variables", () => {
      expect(getLevelColor("thieu", "dark")).toBe("var(--color-level-red-dark)");
      expect(getLevelColor("trungbinh", "dark")).toBe("var(--color-level-yellow-dark)");
      expect(getLevelColor("ganDu", "dark")).toBe("var(--color-level-green-dark)");
      expect(getLevelColor("dat", "dark")).toBe("var(--color-level-blue-dark)");
    });
  });

  describe("getEmptySegmentColor", () => {
    it("returns correct empty segment token for tone", () => {
      expect(getEmptySegmentColor("light")).toBe("var(--color-level-empty)");
      expect(getEmptySegmentColor("dark")).toBe("var(--color-level-empty-dark)");
    });
  });
});
