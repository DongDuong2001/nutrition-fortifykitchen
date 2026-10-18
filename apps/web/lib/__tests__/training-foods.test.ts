import { describe, expect, it } from "vitest";
import type { FoodItem } from "../mock/foods";
import { findCoachFood, resolveChoices } from "../training-foods";

const food = (id: string, nameVi: string, brand?: string): FoodItem => ({
  id,
  nameVi,
  brand,
  category: "an_vat",
  source: "USDA",
  servings: [{ label: "100 g", grams: 100 }],
  nutrients: { energy: 100 },
});

const CATALOGUE = [
  food("a", "Chà là"),
  food("b", "Bột củ dền", "Dalahouse"),
  food("c", "Bột củ dền", "Hãng khác"),
  food("d", "Muối ăn"),
  food("e", "Mật mía", "Golden Barrel"),
  food("f", "Chà là sấy dẻo"),
];

describe("coach foods (lib/training-foods.ts)", () => {
  it("finds each coach food by its exact name, and by brand where the coach names one", () => {
    expect(findCoachFood("cha-la", CATALOGUE)?.id).toBe("a");
    expect(findCoachFood("cu-den", CATALOGUE)?.id).toBe("b");
    expect(findCoachFood("muoi", CATALOGUE)?.id).toBe("d");
    expect(findCoachFood("mat-mia", CATALOGUE)?.id).toBe("e");
  });

  it("ignores case, spaces and Unicode form, never a look-alike", () => {
    expect(findCoachFood("redbull", [food("r", "Red Bull")])?.id).toBe("r");
    expect(findCoachFood("cha-la", [food("x", "CHÀ LÀ".normalize("NFD"))])?.id).toBe("x");
    expect(findCoachFood("cha-la", [food("f", "Chà là sấy dẻo")])).toBeNull();
    expect(findCoachFood("cu-den", [food("c", "Bột củ dền", "Hãng khác")])).toBeNull();
    expect(findCoachFood("mat-mia", [food("m", "Mật mía")])).toBeNull();
  });

  it("a food missing from the catalogue is null (the item stays tick-only)", () => {
    expect(findCoachFood("redbull", CATALOGUE)).toBeNull();
  });

  it("resolves the fast-carb choices: one food each, a missing food or a mix cannot be logged", () => {
    const choices = resolveChoices(["redbull", "redbull-mat-mia", "mat-mia"], CATALOGUE);
    expect(choices.map((c) => [c.key, c.label, c.food?.id ?? null])).toEqual([
      ["redbull", "Redbull", null],
      ["redbull-mat-mia", "Redbull + mật mía", null],
      ["mat-mia", "Mật mía Golden Barrel", "e"],
    ]);
    expect(choices[0].missing).toEqual(["Redbull"]);
    expect(choices[1].missing).toEqual(["Redbull"]);
    expect(choices[2].missing).toEqual([]);
  });

  it("a mix of two foods that are both there still has no single food until its split is known", () => {
    const [mix] = resolveChoices(["redbull-mat-mia"], [...CATALOGUE, food("r", "Redbull")]);
    expect(mix.food).toBeNull();
    expect(mix.missing).toEqual([]);
  });
});
