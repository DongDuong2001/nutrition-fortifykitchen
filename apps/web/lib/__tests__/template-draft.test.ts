import { afterEach, describe, expect, it } from "vitest";
import { MOCK_FOODS } from "../mock/foods";
import {
  NEW_TEMPLATE_NAME,
  addTemplateItems,
  applyTemplate,
  buildDayTemplate,
  removeTemplateItem,
  setTemplateItemPortion,
  templateItemCount,
  templateMealKcal,
  templateTotals,
  type DayTemplate,
  type DayTemplateMeal,
} from "../day-templates";
import {
  addToDraft,
  currentDraft,
  discardDraft,
  draftFor,
  draftOf,
  holdDraft,
  newTemplateDraft,
  releaseDraft,
  startDraft,
  updateDraft,
} from "../template-draft";

// Two catalogue foods with energy, for the totals
const [A, B] = MOCK_FOODS.filter((f) => (f.nutrients?.energy ?? 0) > 0);
const kcalOf = (food: typeof A, grams: number) => Math.round(((food.nutrients.energy as number) * grams) / 100);
const item = (food: typeof A, grams: number, servingLabel = `${grams} g`) => ({ foodId: food.id, servingLabel, grams });
const NOW = "2026-10-23T02:00:00.000Z";

afterEach(() => {
  const d = currentDraft();
  if (d) discardDraft(d.id);
});

describe("a day built from scratch (+ Tạo ngày ăn mẫu)", () => {
  it("starts blank: the new name, the given tag, no meal, nothing stored", () => {
    const d = newTemplateDraft({ id: "t1", name: NEW_TEMPLATE_NAME, tag: "nghi", now: NOW });
    expect(d).toEqual({ id: "t1", isNew: true, name: "Ngày ăn mẫu mới", tag: "nghi", meals: [], createdAt: NOW });
    expect(templateItemCount(d.meals)).toBe(0);
    // A blank day cannot be saved
    expect(buildDayTemplate({ id: d.id, name: d.name, tag: d.tag, fallbackName: NEW_TEMPLATE_NAME, meals: d.meals, createdAt: NOW })).toBeNull();
  });

  it("add: foods go to the end of their meal, a new meal takes its place in Hôm nay's order", () => {
    let meals: DayTemplateMeal[] = [];
    meals = addTemplateItems(meals, "dinner", [item(A, 100)]);
    meals = addTemplateItems(meals, "breakfast", [item(B, 50)]);
    meals = addTemplateItems(meals, "dinner", [item(B, 30), item(A, 20)]);
    expect(meals.map((m) => [m.slot, m.items.map((i) => i.grams)])).toEqual([
      ["breakfast", [50]],
      ["dinner", [100, 30, 20]],
    ]);
    expect(addTemplateItems(meals, "lunch", [])).toEqual(meals);
  });

  it("change a portion: the grams and the label of that one food; 0 g changes nothing", () => {
    const meals = addTemplateItems([], "lunch", [item(A, 100), item(B, 80)]);
    const changed = setTemplateItemPortion(meals, "lunch", 1, { grams: 150, servingLabel: "1 chén (150 g)" });
    expect(changed[0].items).toEqual([item(A, 100), { foodId: B.id, servingLabel: "1 chén (150 g)", grams: 150 }]);
    expect(setTemplateItemPortion(meals, "lunch", 1, { grams: 0, servingLabel: "0 g" })).toEqual(meals);
  });

  it("remove: one food out, and its meal goes when it is empty", () => {
    const meals = addTemplateItems(addTemplateItems([], "lunch", [item(A, 100)]), "snack", [item(B, 40), item(A, 10)]);
    expect(removeTemplateItem(meals, "snack", 0).map((m) => [m.slot, m.items.length])).toEqual([["lunch", 1], ["snack", 1]]);
    expect(removeTemplateItem(meals, "lunch", 0).map((m) => m.slot)).toEqual(["snack"]);
  });

  it("totals: each meal's kcal and the day's add up live from the foods and portions", () => {
    const meals = addTemplateItems(addTemplateItems([], "breakfast", [item(A, 100)]), "dinner", [item(B, 200)]);
    const t: DayTemplate = { id: "t", name: "x", tag: "khac", meals, createdAt: NOW };
    const perMeal = templateMealKcal(t, MOCK_FOODS);
    expect(perMeal.map((m) => m.slot)).toEqual(["breakfast", "dinner"]);
    expect(perMeal[0].kcal).toBeCloseTo(kcalOf(A, 100), 0);
    expect(templateTotals(t, MOCK_FOODS).itemCount).toBe(2);
    expect(templateTotals(t, MOCK_FOODS).kcal).toBeCloseTo(perMeal[0].kcal + perMeal[1].kcal, 0);
    const bigger = { ...t, meals: setTemplateItemPortion(meals, "dinner", 0, { grams: 400, servingLabel: "400 g" }) };
    expect(templateTotals(bigger, MOCK_FOODS).kcal).toBeGreaterThan(templateTotals(t, MOCK_FOODS).kcal);
  });

  it("save: the draft becomes a template with its name (or the new name when blank) and only the meals with food", () => {
    const meals = addTemplateItems([], "lunch", [item(A, 100)]);
    const saved = buildDayTemplate({ id: "t1", name: "  ", tag: "tap", fallbackName: NEW_TEMPLATE_NAME, meals, createdAt: NOW });
    expect(saved).toEqual({ id: "t1", name: "Ngày ăn mẫu mới", tag: "tap", meals, createdAt: NOW });
    // Áp dụng cho hôm nay works on it like on a saved day
    const { entries } = applyTemplate(saved!, MOCK_FOODS, { idPrefix: "dt", addedAt: NOW });
    expect(entries).toHaveLength(1);
    expect(entries[0].mealSlot).toBe("lunch");
  });
});

describe("the draft store (editor ↔ the + sheet's template mode)", () => {
  it("the + sheet adds to the draft of its template, never to another, and the editor sees it", () => {
    startDraft(newTemplateDraft({ id: "t1", name: NEW_TEMPLATE_NAME, tag: "khac", now: NOW }));
    expect(addToDraft("t1", "breakfast", [item(A, 60)])).toBe(true);
    expect(addToDraft("other", "breakfast", [item(A, 60)])).toBe(false);
    expect(addToDraft("t1", "breakfast", [])).toBe(false);
    expect(draftFor("t1")?.meals).toEqual([{ slot: "breakfast", items: [item(A, 60)] }]);
    updateDraft("t1", { name: "Ngày tập chân" });
    expect(draftFor("t1")?.name).toBe("Ngày tập chân");
  });

  it("discard: leaving the editor drops the draft, unless it went to the + sheet (held once)", () => {
    startDraft(newTemplateDraft({ id: "t1", name: NEW_TEMPLATE_NAME, tag: "khac", now: NOW }));
    holdDraft("t1");
    expect(releaseDraft("t1")).toBe(false);
    expect(draftFor("t1")).not.toBeNull();
    expect(releaseDraft("t1")).toBe(true);
    expect(draftFor("t1")).toBeNull();
    // Nothing was ever stored: a draft is not a template
    expect(currentDraft()).toBeNull();
  });

  it("a saved template's draft is a copy: changing it leaves the template as it was", () => {
    const t: DayTemplate = { id: "s1", name: "Nghỉ", tag: "nghi", meals: addTemplateItems([], "lunch", [item(A, 100)]), createdAt: NOW };
    const d = draftOf(t);
    expect(d.isNew).toBe(false);
    startDraft(d);
    addToDraft("s1", "lunch", [item(B, 50)]);
    expect(t.meals[0].items).toHaveLength(1);
    expect(draftFor("s1")?.meals[0].items).toHaveLength(2);
  });
});
