import { describe, expect, it } from "vitest";
import { editFormOf, foodUses, usedNote } from "../own-foods";
import { customFoodPayload } from "../custom-food-fields";
import type { FoodItem } from "../catalog";
import type { DayTemplate } from "../day-templates";
import type { SavedMeal } from "../saved-meals";

// Job C: the rules of Sửa món (what the form starts with) and Xoá món (when a confirm is asked).

const food = (over: Partial<FoodItem> = {}): FoodItem =>
  ({
    id: "99999999-9999-4999-8999-999999999999",
    nameVi: "Bánh nhà làm",
    category: "cua_toi",
    source: "user",
    servings: [{ label: "150 g", grams: 150 }, { label: "100 g", grams: 100 }],
    nutrients: { energy: 100, calories: 100, protein: 10, carbs: 20, fat: 5, fiber: 2, sodium: 200, calcium: 40, vitamin_c: null },
    ...over,
  }) as FoodItem;

describe("editFormOf: Sửa món starts with what the person typed", () => {
  it("gives the name, the portion and every value per portion (the API scaled them to 100 g)", () => {
    const form = editFormOf(food());
    expect(form.nameVi).toBe("Bánh nhà làm");
    expect(form.servingSize).toBe("150");
    expect(form.servingUnit).toBe("g");
    expect(form.values).toMatchObject({ "cf-kcal": "150", "cf-pro": "15", "cf-carbs": "30", "cf-fat": "7,5", "cf-fiber": "3", "cf-na": "300" });
  });

  it("a value the food does not have stays blank (no data, never 0)", () => {
    const form = editFormOf(food());
    expect(form.values["cf-sugars"]).toBeUndefined();
    expect(form.values["cf-vitamin_c"]).toBeUndefined();
  });

  it("the vitamins and minerals it has come back as added fields, in the picker's order", () => {
    const form = editFormOf(food({ nutrients: { energy: 100, calcium: 40, iron: 2, vitamin_d: 1, vitamin_c: null } }));
    expect(form.added).toEqual(["calcium", "iron", "vitamin_d"]);
    expect(form.values["cf-calcium"]).toBe("60");
    expect(form.values["cf-iron"]).toBe("3");
  });

  it("reads the unit from the portion's label: ml, cái, and g when it says nothing usable", () => {
    expect(editFormOf(food({ servings: [{ label: "250 ml", grams: 250 }] })).servingUnit).toBe("ml");
    expect(editFormOf(food({ servings: [{ label: "2 cái", grams: 2 }] })).servingUnit).toBe("cái");
    expect(editFormOf(food({ servings: [{ label: "1 miếng", grams: 80 }] })).servingUnit).toBe("g");
    expect(editFormOf(food({ servings: [{ label: "1 miếng", grams: 80 }] })).servingSize).toBe("80");
  });

  it("typed back unchanged, the form sends the values the food was made with", () => {
    const form = editFormOf(food());
    const payload = customFoodPayload(form.values);
    expect(payload).toMatchObject({ calories: 150, protein: 15, carbs: 30, fat: 7.5 });
    expect(payload.micros).toMatchObject({ fiber: 3, sodium: 300, calcium: 60 });
  });
});

describe("foodUses and usedNote: the confirm of Xoá món", () => {
  const meal = (id: string, ...foodIds: string[]): SavedMeal => ({ id, name: id, createdAt: "", items: foodIds.map((foodId) => ({ foodId, servingLabel: "1 phần", grams: 100 })) });
  const template = (id: string, ...foodIds: string[]): DayTemplate => ({
    id,
    name: id,
    tag: "nghi",
    createdAt: "",
    meals: [{ slot: "breakfast", items: foodIds.slice(0, 1).map((foodId) => ({ foodId, servingLabel: "1 phần", grams: 100 })) }, { slot: "lunch", items: foodIds.slice(1).map((foodId) => ({ foodId, servingLabel: "1 phần", grams: 100 })) }],
  });

  it("counts the saved meals and templates that hold the food, once each", () => {
    expect(foodUses("f", [meal("a", "f", "f"), meal("b", "g")], [template("t", "f", "f"), template("u", "g", "h")])).toBe(2);
  });

  it("is 0 when nothing holds it: no confirm", () => {
    expect(foodUses("f", [meal("a", "g")], [template("t", "g")])).toBe(0);
  });

  it("the note says how many and that the diary keeps its numbers", () => {
    expect(usedNote(3)).toBe("3 mẫu / bữa đã lưu có món này · Món đã ghi trong nhật ký vẫn giữ số liệu cũ");
    expect(usedNote(1)).toBe("1 mẫu / bữa đã lưu có món này · Món đã ghi trong nhật ký vẫn giữ số liệu cũ");
  });
});
