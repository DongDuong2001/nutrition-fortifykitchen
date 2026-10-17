import { describe, it, expect } from "vitest";
import { removeVietnameseTones, searchFoods, findSimilarFoods } from "../search";
import { MOCK_FOODS, type FoodItem } from "../mock/foods";

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

// A slice of the live catalogue: names that collide once the accents are folded away
const food = (nameVi: string, energy: number | null = 100, id = nameVi, brand?: string): FoodItem => ({
  id,
  nameVi,
  category: "trai_cay",
  brand,
  source: "USDA",
  servings: [{ label: "100 g", grams: 100 }],
  nutrients: { energy },
});

const CATALOGUE: FoodItem[] = [
  food("Bột quế"),
  food("Bột mì"),
  food("Bò xào hành"),
  food("Bò kho"),
  food("Quả bơ", 160, "bo-1"),
  food("Quả bơ", 160, "bo-2"),
  food("Bơ thực vật"),
  food("Gan bò"),
  food("Gan bò xào"),
  food("Gạo lứt"),
  food("Gạo tẻ"),
  food("Gạo nếp"),
  food("Gà rán"),
  food("Gà luộc"),
  food("Gà nướng"),
  food("Đùi gà"),
  food("Ức gà", 165),
  food("Cánh gà (chiên)"),
  food("Cam"),
  food("Cam sành"),
  food("Nước cam"),
  food("Cá hồi"),
  food("Sữa tươi", 61, "milk", "Vinamilk"),
];
const names = (list: FoodItem[]) => list.map((f) => f.nameVi);

describe("lib/search ranking with accents", () => {
  it('"bơ" puts Quả bơ above every Bột and Bò food', () => {
    const result = names(searchFoods(CATALOGUE, "bơ"));
    const bo = result.indexOf("Quả bơ");
    expect(bo).toBeGreaterThanOrEqual(0);
    for (const name of result.filter((n) => n.startsWith("Bột") || n.startsWith("Bò"))) {
      expect(result.indexOf(name), name).toBeGreaterThan(bo);
    }
  });

  it('"Bơ" gives the same order as "bơ"', () => {
    expect(names(searchFoods(CATALOGUE, "Bơ"))).toEqual(names(searchFoods(CATALOGUE, "bơ")));
  });

  it('"gà" keeps Gan bò and Gạo out of the top 5, and Ức gà is a whole-word hit', () => {
    const top = names(searchFoods(CATALOGUE, "gà")).slice(0, 5);
    expect(top).toContain("Ức gà");
    expect(top.filter((n) => n.startsWith("Gan bò") || n.startsWith("Gạo"))).toEqual([]);
  });

  it('"bo" without accents may put bò foods on top', () => {
    const top = names(searchFoods(CATALOGUE, "bo")).slice(0, 4);
    expect(top.some((n) => n.startsWith("Bò"))).toBe(true);
  });

  it('"cam" ranks Cam first, then the foods that contain the word', () => {
    const result = names(searchFoods(CATALOGUE, "cam"));
    expect(result[0]).toBe("Cam");
    expect(result.slice(0, 3)).toEqual(["Cam", "Cam sành", "Nước cam"]);
  });

  it('"ức gà" ranks Ức gà first', () => {
    expect(names(searchFoods(CATALOGUE, "ức gà"))[0]).toBe("Ức gà");
  });

  it("treats ( ) / and , as word separators", () => {
    expect(names(searchFoods(CATALOGUE, "gà"))).toContain("Cánh gà (chiên)");
    const list = [food("Gạo lứt"), food("Cánh gà (chiên)"), food("Thịt/gà, luộc")];
    expect(names(searchFoods(list, "gà"))[0]).not.toBe("Gạo lứt");
    expect(names(searchFoods(list, "gà")).slice(0, 2).sort()).toEqual(["Cánh gà (chiên)", "Thịt/gà, luộc"].sort());
  });

  it("keeps the fold-only matches below the accented ones, not hidden", () => {
    const result = names(searchFoods(CATALOGUE, "bơ"));
    expect(result).toContain("Bột quế");
    expect(result).toContain("Bò kho");
    expect(result.indexOf("Quả bơ")).toBeLessThan(result.indexOf("Bột quế"));
  });

  it("falls back to the brand last", () => {
    const result = searchFoods(CATALOGUE, "vinamilk");
    expect(names(result)).toEqual(["Sữa tươi"]);
  });

  it("breaks ties by the shorter name, then Vietnamese collation", () => {
    const list = [food("Cam sành lớn"), food("Cam sành"), food("Cam mật")];
    expect(names(searchFoods(list, "cam sành")).slice(0, 2)).toEqual(["Cam sành", "Cam sành lớn"]);
    expect(names(searchFoods([food("Cam xoàn"), food("Cam mật")], "cam"))).toEqual(["Cam mật", "Cam xoàn"]);
  });
});

describe("lib/search duplicates", () => {
  it("keeps one of two foods with the same name and the same energy", () => {
    const result = searchFoods(CATALOGUE, "quả bơ");
    expect(names(result).filter((n) => n === "Quả bơ")).toHaveLength(1);
    expect(searchFoods(CATALOGUE, "").filter((f) => f.nameVi === "Quả bơ")).toHaveLength(1);
  });

  it("keeps both when the energy differs", () => {
    const list = [food("Cơm", 130, "a"), food("Cơm", 180, "b")];
    expect(searchFoods(list, "cơm")).toHaveLength(2);
  });
});

describe("lib/search findSimilarFoods with accents", () => {
  it("puts the accented words first and the fold-only matches after them", () => {
    const similar = names(findSimilarFoods(CATALOGUE, "gà luộc", 4));
    expect(similar[0]).toBe("Gà luộc");
    expect(similar.slice(0, 4).every((n) => /gà/i.test(n))).toBe(true);
    expect(similar.some((n) => n.startsWith("Gan") || n.startsWith("Gạo"))).toBe(false);
  });
});
