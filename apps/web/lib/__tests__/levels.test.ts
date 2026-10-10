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

  describe("getLevelColor", () => {
    it("returns light mode colors", () => {
      expect(getLevelColor("thieu", "light")).toBe("#D93F44");
      expect(getLevelColor("trungbinh", "light")).toBe("#B07800");
      expect(getLevelColor("ganDu", "light")).toBe("#17945F");
      expect(getLevelColor("dat", "light")).toBe("#1238D6");
    });

    it("returns dark mode colors", () => {
      expect(getLevelColor("thieu", "dark")).toBe("#E5484D");
      expect(getLevelColor("trungbinh", "dark")).toBe("#E8A400");
      expect(getLevelColor("ganDu", "dark")).toBe("#1FA971");
      expect(getLevelColor("dat", "dark")).toBe("#5C86F2");
    });
  });

  describe("getEmptySegmentColor", () => {
    it("returns correct empty segment color for tone", () => {
      expect(getEmptySegmentColor("light")).toBe("#E6E1D7");
      expect(getEmptySegmentColor("dark")).toBe("#2A2C31");
    });
  });
});
