import { describe, expect, it } from "vitest";
import { MOCK_FOODS } from "../mock/foods";
import type { DayTemplate } from "../day-templates";
import { templateNutrition } from "../template-micros";

// Two plain foods, numbers per 100 g chosen so every sum below is done by hand
const base = MOCK_FOODS[0];
const rice = {
  ...base,
  id: "t-rice",
  nutrients: { energy: 100, protein: 10, carbs: 20, fat: 1, fiber: 2, calcium: 100, iron: 1, vitamin_c: 10, monounsaturated_fat: 0.5 },
};
const milk = {
  ...base,
  id: "t-milk",
  nutrients: { energy: 50, protein: 4, carbs: 5, fat: 2, fiber: 0, calcium: 120, iron: null, vitamin_c: null, monounsaturated_fat: null },
};
const foods = [rice, milk];

const item = (foodId: string, grams: number) => ({ foodId, servingLabel: `${grams} g`, grams });
const day = (...meals: DayTemplate["meals"]): DayTemplate => ({ id: "d", name: "Thử", tag: "khac", meals, createdAt: "2026-10-23T00:00:00.000Z" });

describe("templateNutrition: what the template's foods add up to", () => {
  it("sums the macros and the counted micros of every meal, scaled by the grams", () => {
    // 200 g rice (breakfast) + 100 g milk (lunch)
    const { values } = templateNutrition(day({ slot: "breakfast", items: [item("t-rice", 200)] }, { slot: "lunch", items: [item("t-milk", 100)] }), foods);
    expect(values.kcal).toBe(250);
    expect(values.protein).toBe(24);
    expect(values.carbs).toBe(45);
    expect(values.fat).toBe(4);
    expect(values.fiber).toBe(4);
    expect(values.nutrients.calcium).toBe(320);
  });

  it("a food with no value for a micro adds nothing to it, and the total stays unknown when no food has it", () => {
    const { values } = templateNutrition(day({ slot: "breakfast", items: [item("t-rice", 200), item("t-milk", 100)] }), foods);
    expect(values.nutrients.iron).toBe(2);
    expect(values.nutrients.vitamin_c).toBe(20);
    expect(values.nutrients.zinc).toBeNull();
  });

  it("the same food twice, or in two meals, counts twice", () => {
    const once = templateNutrition(day({ slot: "breakfast", items: [item("t-rice", 100)] }), foods).values;
    const twice = templateNutrition(day({ slot: "breakfast", items: [item("t-rice", 100)] }, { slot: "dinner", items: [item("t-rice", 100)] }), foods).values;
    expect(twice.nutrients.calcium).toBe((once.nutrients.calcium ?? 0) * 2);
  });

  it("extras (fat and fibre detail) are unknown when any food lacks them, as on Hôm nay", () => {
    const both = templateNutrition(day({ slot: "breakfast", items: [item("t-rice", 200), item("t-milk", 100)] }), foods).extras;
    expect(both.monounsaturated_fat).toBeNull();
    const riceOnly = templateNutrition(day({ slot: "breakfast", items: [item("t-rice", 200)] }), foods).extras;
    expect(riceOnly.monounsaturated_fat).toBe(1);
  });

  it("a food gone from the catalogue, or without energy, is left out like a copy leaves it out", () => {
    const unknown = { ...rice, id: "t-none", nutrients: { ...rice.nutrients, energy: null } };
    const { values } = templateNutrition(day({ slot: "lunch", items: [item("t-rice", 100), item("t-none", 100), item("gone", 100)] }), [...foods, unknown]);
    expect(values.kcal).toBe(100);
    expect(values.nutrients.calcium).toBe(100);
  });

  it("an empty template is all unknown, never 0", () => {
    const { values, extras } = templateNutrition(day(), foods);
    expect(values.kcal).toBeNull();
    expect(values.protein).toBeNull();
    expect(values.nutrients.calcium).toBeNull();
    expect(extras.omega3).toBeNull();
  });
});
