import { describe, it, expect } from "vitest";
import { contrast, token } from "./css-tokens";
import {
  calculateSegments,
  getLevel,
  getLevelLabel,
  getLevelColor,
  getEmptySegmentColor,
  homeSegments,
  homeBarColor,
  homeBarTone,
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
      expect(getLevelColor("thieu", "light")).toBe("var(--color-level-thieu)");
      expect(getLevelColor("trungbinh", "light")).toBe("var(--color-level-trungbinh)");
      expect(getLevelColor("ganDu", "light")).toBe("var(--color-level-gandu)");
      expect(getLevelColor("dat", "light")).toBe("var(--color-level-dat)");
    });

    it("uses the same four level tokens inside ink cards (one palette since 17/10; cc-66 dropped the -dark copies)", () => {
      for (const lvl of ["thieu", "trungbinh", "ganDu", "dat"] as const) expect(getLevelColor(lvl, "dark")).toBe(getLevelColor(lvl, "light"));
      expect(getLevelColor("thieu", "dark")).toBe("var(--color-level-thieu)");
    });
  });

  describe("getEmptySegmentColor", () => {
    it("returns correct empty segment token for tone", () => {
      expect(getEmptySegmentColor("light")).toBe("var(--color-level-empty)");
      expect(getEmptySegmentColor("dark")).toBe("var(--color-level-empty-dark)");
    });
  });
  describe("homeSegments", () => {
    it("is floor(pct/10) capped at 10, but 1 when 0 < pct < 10", () => {
      expect(homeSegments(0)).toBe(0);
      expect(homeSegments(-5)).toBe(0);
      expect(homeSegments(0.4)).toBe(1);
      expect(homeSegments(9)).toBe(1);
      expect(homeSegments(10)).toBe(1);
      expect(homeSegments(47)).toBe(4);
      expect(homeSegments(99)).toBe(9);
      expect(homeSegments(100)).toBe(10);
      expect(homeSegments(250)).toBe(10);
    });
  });

  describe("homeBarTone", () => {
    it("uses the four levels on every day, today included (Hao, 16/10): red under 50, yellow 50 to 79, mint 80 to 99, green from 100 (V3)", () => {
      expect(homeBarTone(0)).toBe("thieu");
      expect(homeBarTone(49)).toBe("thieu");
      expect(homeBarTone(50)).toBe("trungbinh");
      expect(homeBarTone(79)).toBe("trungbinh");
      expect(homeBarTone(80)).toBe("ganDu");
      expect(homeBarTone(99)).toBe("ganDu");
      expect(homeBarTone(100)).toBe("dat");
      expect(homeBarTone(180)).toBe("dat");
    });
    it("has no grey tone: every tone maps to a level colour on both surfaces", () => {
      for (const pct of [0, 30, 60, 90, 120]) {
        for (const surface of ["light", "dark"] as const) {
          expect(homeBarColor(homeBarTone(pct), surface)).toMatch(/^var\(--color-level-(thieu|trungbinh|gandu|dat)\)$/);
        }
      }
    });
  });

  describe("bars on the ink hero card", () => {
    // Non-text contrast (WCAG 1.4.11): a lit segment must stand out from an empty one by at least 3:1
    it.each(["thieu", "trungbinh", "gandu", "dat"])("%s is at least 3:1 against the empty segment and the card", (name) => {
      const lit = token(`level-${name}`);
      expect(lit).not.toBe("");
      expect(contrast(lit, token("level-empty-dark"))).toBeGreaterThanOrEqual(3);
      expect(contrast(lit, token("ink"))).toBeGreaterThanOrEqual(3);
    });
  });
});
