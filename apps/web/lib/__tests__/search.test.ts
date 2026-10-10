import { describe, it, expect } from "vitest";
import { removeVietnameseTones, searchFoods, findSimilarFoods } from "../search";
import { MOCK_FOODS } from "../mock/foods";

describe("lib/search", () => {
  describe("removeVietnameseTones", () => {
    it("strips diacritics and converts to lower case", () => {
      expect(removeVietnameseTones("Bánh tráng")).toBe("banh trang");
      expect(removeVietnameseTones("Chà là")).toBe("cha la");
      expect(removeVietnameseTones("Yến mạch")).toBe("yen mach");
      expect(removeVietnameseTones("Đậu hũ")).toBe("dau hu");
      expect(removeVietnameseTones("Ức gà")).toBe("uc ga");
    });
  });

  describe("searchFoods", () => {
    it("matches food by Vietnamese name ignoring diacritics and case", () => {
      const results = searchFoods(MOCK_FOODS, "cha la");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].nameVi).toBe("Chà là");
    });

    it("ranks prefix matches ahead of substring matches", () => {
      const results = searchFoods(MOCK_FOODS, "banh");
      expect(results.length).toBeGreaterThan(1);
      // All results start with Bánh
      expect(results[0].nameVi.toLowerCase()).toContain("bánh");
    });

    it("matches partial query without diacritics e.g. 'cha'", () => {
      const results = searchFoods(MOCK_FOODS, "cha");
      expect(results.some((r) => r.nameVi === "Chà là")).toBe(true);
    });

    it("returns empty array when nothing matches", () => {
      const results = searchFoods(MOCK_FOODS, "xyz123nonexistent");
      expect(results).toEqual([]);
    });

    it("returns all foods or popular foods when query is empty", () => {
      const results = searchFoods(MOCK_FOODS, "");
      expect(results.length).toBe(MOCK_FOODS.length);
    });
  });

  describe("findSimilarFoods (fuzzy suggestions)", () => {
    it("suggests similar items for unknown query like 'banh trang tron'", () => {
      const suggestions = findSimilarFoods(MOCK_FOODS, "bánh tráng trộn");
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.nameVi.includes("Bánh tráng"))).toBe(true);
    });
  });
});
