import { describe, expect, it } from "vitest";
import type { FoodItem } from "../catalog";
import { isChanh, weighedFruit } from "../catalog";
import { MOCK_FOODS } from "../mock/foods";
import { YESTERDAY_ITEMS } from "../mock/yesterday";
import { defaultPortionOf, defaultServing, portionModeOf } from "../portion";

// Hao, overnight 22→23/10: grams everywhere except eggs and chanh / chanh dây (by the quả); the foods logged by their unit
// (supplements, dishes, cans) keep it.
const food = (over: Partial<FoodItem>): FoodItem => ({
  id: "x",
  nameVi: "Khoai lang luộc",
  category: "tinh_bot",
  source: "USDA",
  servings: [{ label: "1 củ", grams: 150 }, { label: "100 g", grams: 100 }],
  nutrients: { energy: 76 },
  ...over,
}) as FoodItem;

describe("defaultServing (what a list shows a food by)", () => {
  it("a food weighed in grams shows its gram serving, whatever unit its data lists first", () => {
    expect(defaultServing(food({}))).toEqual({ label: "100 g", grams: 100 });
    expect(defaultServing(food({ servings: [{ label: "1 nắm (~30 g)", grams: 30 }, { label: "30 g", grams: 30 }] }))).toEqual({ label: "30 g", grams: 30 });
    expect(defaultServing(food({ category: "rau", nameVi: "Rau muống", servings: [{ label: "1 dĩa luộc", grams: 200 }] }))).toEqual({ label: "100 g", grams: 100 });
    expect(defaultServing(food({ category: "do_uong", nameVi: "Trà đá", servings: [{ label: "1 ly lớn (300 ml)", grams: 300 }] }))).toEqual({ label: "100 ml", grams: 100 });
  });

  it("eggs keep the quả; supplements, dishes and cans keep their unit", () => {
    const egg = MOCK_FOODS.find((f) => f.id === "food-trung-ga")!;
    expect(defaultServing(egg).label).toMatch(/^1 quả/);
    expect(defaultServing(food({ category: "bo_sung", nameVi: "Whey", servings: [{ label: "1 muỗng (30 g)", grams: 30 }, { label: "100 g", grams: 100 }] })).label).toBe("1 muỗng (30 g)");
    expect(defaultServing(food({ category: "mon_viet", nameVi: "Phở bò", servings: [{ label: "1 tô", grams: 600 }, { label: "100 g", grams: 100 }] })).label).toBe("1 tô");
    expect(defaultServing(food({ category: "do_uong", nameVi: "Bia", servings: [{ label: "1 lon (330 ml)", grams: 330 }, { label: "100 ml", grams: 100 }] })).label).toBe("1 lon (330 ml)");
  });

  it("matches what the portion panel opens with, for every demo food weighed in grams", () => {
    for (const f of MOCK_FOODS.filter((x) => portionModeOf(x) === "grams")) {
      expect(defaultServing(f).grams, f.id).toBe(defaultPortionOf(f).grams);
    }
  });

  it("no demo food weighed in grams is shown by a count any more", () => {
    const counted = MOCK_FOODS.filter((f) => portionModeOf(f) === "grams" && !/^\d+(?:[.,]\d+)?\s*(?:g|ml)$/i.test(defaultServing(f).label));
    expect(counted.map((f) => `${f.nameVi} · ${defaultServing(f).label}`)).toEqual([]);
  });

  it("the demo's yesterday logs grams for the foods weighed in grams (Gần đây showed Khoai lang · 1 củ)", () => {
    for (const item of YESTERDAY_ITEMS) {
      const f = MOCK_FOODS.find((x) => x.id === item.foodId)!;
      if (portionModeOf(f) === "grams") expect(item.qty, item.foodId).toMatch(new RegExp(`^${item.grams} (?:g|ml)$`));
    }
  });
});

describe("chanh and chanh dây go by the quả", () => {
  const chanh = { id: "c", nameVi: "Chanh ta", category: "trai_cay", source: "VN FCT", servings: [{ label: "100 g", grams: 100 }, { label: "1 quả", grams: 45 }, { label: "1 lát", grams: 7 }], nutrients: { energy: 29 } } as FoodItem;
  const day = { ...chanh, nameVi: "Chanh dây", servings: [{ label: "100 g", grams: 100 }, { label: "1 quả (ruột + hạt)", grams: 18 }] } as FoodItem;

  it("the fruit rule keeps their quả, first, and still drops the other counts", () => {
    expect(weighedFruit(chanh).servings.map((s) => s.label)).toEqual(["1 quả", "100 g"]);
    expect(weighedFruit(day).servings.map((s) => s.label)).toEqual(["1 quả (ruột + hạt)", "100 g"]);
    const orange = { ...chanh, nameVi: "Cam sành" } as FoodItem;
    expect(weighedFruit(orange).servings.map((s) => s.label)).toEqual(["100 g"]);
  });

  it("they open on 1 quả and lists show them by it", () => {
    for (const f of [weighedFruit(chanh), weighedFruit(day)]) {
      expect(portionModeOf(f)).toBe("units");
      expect(defaultPortionOf(f).label).toMatch(/^1 quả/);
      expect(defaultServing(f).label).toMatch(/^1 quả/);
    }
  });

  it("only chanh is chanh", () => {
    expect(["Chanh", "Chanh dây", "chanh ta", "Chanh vàng"].every(isChanh)).toBe(true);
    expect(["Chanhs", "Nước chanh", "Cam", ""].some(isChanh)).toBe(false);
  });
});
