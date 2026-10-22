import { describe, expect, it } from "vitest";
import { foodMeta, foodRowKcal, foodRowMeta, foodSourceLabel } from "../food-meta";
import type { FoodItem } from "../mock/foods";

const BASE_FOOD: FoodItem = {
  id: "food-test",
  nameVi: "Chà là",
  category: "trai_cay",
  source: "USDA",
  servings: [
    { label: "30 g", grams: 30 },
    { label: "100 g", grams: 100 },
  ],
  nutrients: {
    energy: 280,
    carbs: 73.33,
    potassium: 656.67,
  },
};

describe("foodSourceLabel", () => {
  it("maps known source codes to Vietnamese labels and never returns a raw code", () => {
    expect(foodSourceLabel("usda")).toBe("USDA");
    expect(foodSourceLabel("USDA")).toBe("USDA");
    expect(foodSourceLabel("cnf")).toBe("CNF (Canada)");
    expect(foodSourceLabel("CNF")).toBe("CNF (Canada)");
    expect(foodSourceLabel("vn-fct")).toBe("Bảng TPDD Việt Nam");
    expect(foodSourceLabel("VN FCT")).toBe("Bảng TPDD Việt Nam");
    expect(foodSourceLabel("vn_fct")).toBe("Bảng TPDD Việt Nam");
    expect(foodSourceLabel("vn-table")).toBe("Bảng TPDD Việt Nam");
    expect(foodSourceLabel("vn_table")).toBe("Bảng TPDD Việt Nam");
    expect(foodSourceLabel("vn-nin")).toBe("Bảng TPDD Việt Nam");
    expect(foodSourceLabel("VN_NIN")).toBe("Bảng TPDD Việt Nam");
    expect(foodSourceLabel("literature")).toBe("Tài liệu");
    expect(foodSourceLabel("asean")).toBe("ASEAN");
    expect(foodSourceLabel("custom")).toBe("Của tôi");
    expect(foodSourceLabel("user")).toBe("Của tôi");
    expect(foodSourceLabel("usda_sr_legacy")).toBe("USDA");
    expect(foodSourceLabel("usda_foundation")).toBe("USDA");
    expect(foodSourceLabel("usda_fndds")).toBe("USDA");
    expect(foodSourceLabel("label")).toBe("Nhãn");
    expect(foodSourceLabel("Label")).toBe("Nhãn");
    expect(foodSourceLabel("community")).toBe("Ước tính");
    expect(foodSourceLabel("other")).toBe("Khác");
    expect(foodSourceLabel("")).toBe("Khác");
    expect(foodSourceLabel(undefined)).toBe("Khác");
  });
});

describe("foodMeta", () => {
  it("formats kcal, tinh bột (never carb) and kali for the first serving", () => {
    expect(foodMeta(BASE_FOOD)).toBe("84 kcal / 30 g · 22 g tinh bột · 197 mg Potassium");
    expect(foodMeta(BASE_FOOD).toLowerCase()).not.toContain("carb");
  });

  it("omits tinh bột and kali when zero or missing", () => {
    const plain: FoodItem = {
      ...BASE_FOOD,
      nutrients: { energy: 150, carbs: 0, potassium: null },
    };
    expect(foodMeta(plain)).toBe("45 kcal / 30 g");
  });

  it("says Chưa có kcal when the energy is unknown, never 0 kcal (cc-63, B2)", () => {
    for (const energy of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      const unknown = { ...BASE_FOOD, nutrients: { carbs: 0, energy } as FoodItem["nutrients"] };
      expect(foodMeta(unknown)).toBe("Chưa có kcal / 30 g");
    }
    // Grams everywhere (overnight 22→23/10): a food weighed in grams and listed by the chén reads per 100 g
    expect(foodMeta({ ...BASE_FOOD, servings: [{ label: "1 chén", grams: 150 }], nutrients: { carbs: 0 } as FoodItem["nutrients"] })).toBe("Chưa có kcal / 100 g");
  });

  it("keeps a real 0 kcal as 0 kcal", () => {
    expect(foodMeta({ ...BASE_FOOD, nutrients: { energy: 0, carbs: 0 } })).toBe("0 kcal / 30 g");
  });
});

describe("foodRowMeta", () => {
  it("combines the portion label with the mapped source label", () => {
    expect(foodRowMeta({ ...BASE_FOOD, source: "USDA" })).toBe("30 g · USDA");
    expect(foodRowMeta({ ...BASE_FOOD, source: "usda" as FoodItem["source"] }, "60 g")).toBe("60 g · USDA");
    expect(foodRowMeta({ ...BASE_FOOD, source: "cnf" as FoodItem["source"] })).toBe("30 g · CNF (Canada)");
    expect(foodRowMeta({ ...BASE_FOOD, source: "vn-fct" as FoodItem["source"] })).toBe("30 g · Bảng TPDD Việt Nam");
    expect(foodRowMeta({ ...BASE_FOOD, source: "VN FCT" })).toBe("30 g · Bảng TPDD Việt Nam");
    expect(foodRowMeta({ ...BASE_FOOD, source: "custom" as FoodItem["source"] })).toBe("30 g · Của tôi");
    expect(foodRowMeta({ ...BASE_FOOD, source: "user" })).toBe("30 g · Của tôi");
    expect(foodRowMeta({ ...BASE_FOOD, source: "unknown-db" as FoodItem["source"] })).toBe("30 g · Khác");
  });
});

describe("foodRowKcal", () => {
  it("scales kcal for the given grams or first serving and returns undefined when energy is null", () => {
    expect(foodRowKcal(BASE_FOOD)).toBe("84 kcal");
    expect(foodRowKcal(BASE_FOOD, 100)).toBe("280 kcal");
    expect(foodRowKcal({ ...BASE_FOOD, nutrients: { energy: null } })).toBeUndefined();
  });
});
