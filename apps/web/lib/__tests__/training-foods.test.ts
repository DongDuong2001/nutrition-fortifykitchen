import { describe, expect, it } from "vitest";
import type { FoodItem } from "../mock/foods";
import { carbsIn, findCoachFood, gramsForCarbs, lonsForCarbs, mixPrefill, resolveChoices, unitServing } from "../training-foods";

const food = (id: string, nameVi: string, over: Partial<FoodItem> = {}): FoodItem => ({
  id,
  nameVi,
  category: "an_vat",
  source: "USDA",
  servings: [{ label: "100 g", grams: 100 }],
  nutrients: { energy: 100 },
  ...over,
});

// The live rows (food-research/h1t-foods-units-import.json and the live /foods list): (source, source_id) as the API sends them
const live = (id: string, nameVi: string, source: string, sourceId: string, over: Partial<FoodItem> = {}) =>
  food(id, nameVi, { source: source as FoodItem["source"], sourceId, ...over });

const RED_BULL = live("rb", "Red Bull (nước tăng lực)", "label", "Red Bull S.r.l. 25 cl can label (Italy)", {
  brand: "Red Bull",
  servings: [{ label: "1 lon (250 ml)", grams: 260 }, { label: "100 g", grams: 100 }],
  nutrients: { energy: 46, carbs: 11 },
});
const MAT_MIA_LABEL = live("mm", "Mật mía Golden Barrel (blackstrap)", "label", "Golden Barrel Blackstrap Molasses (label panel image not retrievable)", {
  brand: "Golden Barrel",
  nutrients: { energy: 290, carbs: 75 },
});
const LIVE = [
  live("cl", "Chà là", "usda_foundation", "food-cha-la"),
  live("cd", "Bột củ dền", "usda_foundation", "food-bot-cu-den", { brand: "Dalahouse" }),
  live("mu", "Muối ăn", "usda_sr_legacy", "FDC 173468"),
  RED_BULL,
  MAT_MIA_LABEL,
  // Look-alikes the source id must win over
  live("m2", "Mật mía", "usda_foundation", "food-mat-mia", { brand: "Golden Barrel" }),
  live("cl2", "Chà là Medjool", "usda_sr_legacy", "FDC 168191"),
];

describe("coach foods (lib/training-foods.ts)", () => {
  it("finds each live coach food by (source, source_id)", () => {
    expect(findCoachFood("cha-la", LIVE)?.id).toBe("cl");
    expect(findCoachFood("cu-den", LIVE)?.id).toBe("cd");
    expect(findCoachFood("muoi", LIVE)?.id).toBe("mu");
    expect(findCoachFood("redbull", LIVE)?.id).toBe("rb");
    expect(findCoachFood("mat-mia", LIVE)?.id).toBe("mm");
  });

  it("the source id wins over a food of the same name", () => {
    expect(findCoachFood("mat-mia", [live("m2", "Mật mía", "usda_foundation", "food-mat-mia", { brand: "Golden Barrel" }), MAT_MIA_LABEL])?.id).toBe("mm");
  });

  it("falls back to the exact name (and brand) where no row has the source id: the demo catalogue", () => {
    const demo = [food("food-cha-la", "Chà là"), food("food-bot-cu-den", "Bột củ dền", { brand: "Dalahouse" }), food("ing-muoi", "Muối ăn"), food("food-mat-mia", "Mật mía", { brand: "Golden Barrel" }), food("food-red-bull", "Red Bull (nước tăng lực)")];
    expect(findCoachFood("cha-la", demo)?.id).toBe("food-cha-la");
    expect(findCoachFood("cu-den", demo)?.id).toBe("food-bot-cu-den");
    expect(findCoachFood("muoi", demo)?.id).toBe("ing-muoi");
    expect(findCoachFood("mat-mia", demo)?.id).toBe("food-mat-mia");
    expect(findCoachFood("redbull", demo)?.id).toBe("food-red-bull");
  });

  it("the demo catalogue's plain Red Bull row (brand Red Bull) resolves too", () => {
    expect(findCoachFood("redbull", [food("food-red-bull", "Red Bull", { brand: "Red Bull" })])?.id).toBe("food-red-bull");
    expect(findCoachFood("redbull", [food("x", "Red Bull")])).toBeNull();
  });

  it("ignores case, spaces and Unicode form in the fallback, never a look-alike", () => {
    expect(findCoachFood("cha-la", [food("x", "CHÀ LÀ".normalize("NFD"))])?.id).toBe("x");
    expect(findCoachFood("cha-la", [food("f", "Chà là sấy dẻo")])).toBeNull();
    expect(findCoachFood("cu-den", [food("c", "Bột củ dền", { brand: "Hãng khác" })])).toBeNull();
    expect(findCoachFood("mat-mia", [food("m", "Mật mía")])).toBeNull();
  });

  it("a food in neither form is null (the item stays tick-only)", () => {
    expect(findCoachFood("redbull", [food("a", "Chà là")])).toBeNull();
  });

  it("resolves the fast-carb choices: Red Bull, the mix of both, mật mía", () => {
    const choices = resolveChoices(["redbull", "redbull-mat-mia", "mat-mia"], LIVE);
    expect(choices.map((c) => [c.key, c.label, c.foods.map((f) => f.id)])).toEqual([
      ["redbull", "Red Bull", ["rb"]],
      ["redbull-mat-mia", "Red Bull + mật mía", ["rb", "mm"]],
      ["mat-mia", "Mật mía Golden Barrel", ["mm"]],
    ]);
    expect(choices.every((c) => c.missing.length === 0)).toBe(true);
  });

  it("a choice with a missing food has no foods and names what is missing", () => {
    const [rb, mix] = resolveChoices(["redbull", "redbull-mat-mia"], [MAT_MIA_LABEL]);
    expect(rb).toMatchObject({ foods: [], missing: ["Red Bull"] });
    expect(mix).toMatchObject({ foods: [], missing: ["Red Bull"] });
  });
});

// Hao 18/10: Tinh bột nhanh 30–45 g means grams of carbs; the food amount is worked out from its carbs
describe("fast carbs as grams of carbs", () => {
  it("carbs in an amount of a food", () => {
    expect(carbsIn(MAT_MIA_LABEL, 40)).toBe(30);
    expect(carbsIn(RED_BULL, 260)).toBeCloseTo(28.6);
    expect(carbsIn(food("x", "x"), 50)).toBe(0);
  });

  it("mật mía (75 g carbs per 100 g): Bé 30 g carbs ≈ 40 g, Bự 45 g ≈ 60 g", () => {
    expect(gramsForCarbs(MAT_MIA_LABEL, 30)).toBe(40);
    expect(gramsForCarbs(MAT_MIA_LABEL, 45)).toBe(60);
  });

  it("a food with no carb figure gives no amount", () => {
    expect(gramsForCarbs(food("x", "x"), 30)).toBeNull();
  });

  it("Red Bull by the can in half steps: 28,6 g carbs a can, so Bé 1 lon and Bự 1,5 lon", () => {
    expect(unitServing(RED_BULL)).toEqual({ label: "1 lon (250 ml)", grams: 260 });
    expect(lonsForCarbs(RED_BULL, 30)).toBe(1);
    expect(lonsForCarbs(RED_BULL, 45)).toBe(1.5);
    expect(lonsForCarbs(RED_BULL, 5)).toBe(0.5);
  });

  it("the mix starts at 1 lon and mật mía tops up to the target", () => {
    expect(mixPrefill(RED_BULL, MAT_MIA_LABEL, 45)).toEqual({ lons: 1, grams: 22 });
    expect(mixPrefill(RED_BULL, MAT_MIA_LABEL, 30)).toEqual({ lons: 1, grams: 2 });
    const total = carbsIn(RED_BULL, 260) + carbsIn(MAT_MIA_LABEL, 22);
    expect(Math.round(total)).toBe(45);
    // A target one can already covers needs no mật mía
    expect(mixPrefill(RED_BULL, MAT_MIA_LABEL, 20)).toEqual({ lons: 1, grams: 0 });
  });
});
