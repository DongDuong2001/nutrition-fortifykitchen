import { describe, expect, it } from "vitest";
import { groupMacroLine } from "../food-group-macro";
import { foodServingMeta } from "../food-meta";
import type { FoodItem } from "../mock/foods";

const food = (over: Partial<FoodItem>): FoodItem => ({
  id: "f",
  nameVi: "Món",
  category: "tinh_bot",
  source: "USDA",
  servings: [{ label: "150 g", grams: 150 }],
  nutrients: { energy: 112, carbs: 23.33, protein: 2.4, fat: 0.8 },
  ...over,
});

describe("groupMacroLine", () => {
  it("Tinh bột: carbs of the first serving", () => {
    expect(groupMacroLine(food({}))).toBe("35 g tinh bột");
  });

  it("Đạm: protein of the default serving (the row's kcal are for the same), one decimal under 100 g", () => {
    expect(groupMacroLine(food({ category: "dam", servings: [{ label: "100 g", grams: 100 }], nutrients: { energy: 165, protein: 31.02 } }))).toBe("31 g đạm");
    expect(groupMacroLine(food({ category: "dam", servings: [{ label: "33 g", grams: 33 }], nutrients: { energy: 52, protein: 10.9 } }))).toBe("3,6 g đạm");
    // Grams everywhere (overnight 22→23/10): a unit first ("1 lòng trắng") reads per 100 g
    expect(groupMacroLine(food({ category: "dam", servings: [{ label: "1 lòng trắng", grams: 33 }], nutrients: { energy: 52, protein: 10.9 } }))).toBe("10,9 g đạm");
  });

  it("Chất béo: fat of the default serving (a gram one; 100 g for a food listed by the nắm)", () => {
    expect(groupMacroLine(food({ category: "beo", servings: [{ label: "1 nắm", grams: 30 }, { label: "30 g", grams: 30 }], nutrients: { energy: 579, fat: 43.8 } }))).toBe("13,1 g chất béo");
    expect(groupMacroLine(food({ category: "beo", servings: [{ label: "1 nắm", grams: 30 }], nutrients: { energy: 579, fat: 43.8 } }))).toBe("43,8 g chất béo");
  });

  it("no line for the other groups, and none when the food has no value (never invented)", () => {
    expect(groupMacroLine(food({ category: "rau" }))).toBeNull();
    expect(groupMacroLine(food({ category: "trai_cay" }))).toBeNull();
    expect(groupMacroLine(food({ category: "dam", nutrients: { energy: 100 } as FoodItem["nutrients"] }))).toBeNull();
    expect(groupMacroLine(food({ category: "dam", nutrients: { energy: 100, protein: null } }))).toBeNull();
    expect(groupMacroLine(food({ nutrients: { energy: 100, carbs: 0 } }))).toBeNull();
  });
});

describe("foodServingMeta", () => {
  it("kcal / first serving only", () => {
    expect(foodServingMeta(food({}))).toBe("168 kcal / 150 g");
    expect(foodServingMeta(food({ nutrients: { carbs: 1 } as FoodItem["nutrients"] }))).toBe("Chưa có kcal / 150 g");
  });
});
