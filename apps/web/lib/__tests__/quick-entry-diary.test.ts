import { describe, it, expect } from "vitest";
import { SAMPLE_DAY } from "../mock/sample-day";
import { computeCompositeDayData } from "../diary-store";
import { findEntry, mealPortions, updateEntryIn, type AddedDiaryEntry, type DiaryEdits } from "../diary-edits";
import { quickEntryFrom } from "../quick-entry";

function quick(name = "", kcal = "400"): AddedDiaryEntry {
  const r = quickEntryFrom({ name, kcal, protein: "20", carbs: "", fat: "" }, "dinner", "q-1", "2026-10-13T12:00:00.000Z");
  if (!r.ok) throw new Error("expected ok");
  return r.entry;
}

const withEntry = (entry: AddedDiaryEntry): DiaryEdits => ({ added: [entry], sample: {}, undo: null });

describe("a quick kcal entry in the day", () => {
  it("adds its kcal and macros to the day and shows in its meal", () => {
    const base = computeCompositeDayData(SAMPLE_DAY, []);
    const day = computeCompositeDayData(SAMPLE_DAY, [quick("Bánh mì")]);
    expect(day.calories.consumed).toBe((base.calories.consumed ?? 0) + 400);
    const dinner = day.meals.find((m) => m.slot === "dinner");
    expect(dinner?.items.at(-1)).toMatchObject({ name: "Bánh mì", qty: "Thêm nhanh", kcal: 400 });
    const protein = (d: typeof day) => d.macros.find((m) => m.key === "protein")?.consumed ?? 0;
    expect(protein(day)).toBe(protein(base) + 20);
  });

  it("leaves every Vi chất amount as it was (unknown stays unknown, never 0)", () => {
    const base = computeCompositeDayData(SAMPLE_DAY, []);
    const day = computeCompositeDayData(SAMPLE_DAY, [quick()]);
    expect(day.nutrients).toEqual(base.nutrients);
    expect(day.minerals.map((m) => m.consumed)).toEqual(base.minerals.map((m) => m.consumed));
    expect(day.vitamins.map((v) => v.consumed)).toEqual(base.vitamins.map((v) => v.consumed));
    expect(day.microsSummary).toEqual(base.microsSummary);
  });
});

describe("mealPortions", () => {
  const EMPTY: DiaryEdits = { added: [], sample: {}, undo: null };

  it("lists the sample foods of a meal with their portions", () => {
    const names = mealPortions(EMPTY, "breakfast").map((p) => [p.foodId, p.servingLabel, p.grams]);
    expect(names).toEqual([
      ["food-yen-mach", "60 g", 60],
      ["food-yogurt-kefir", "200 ml", 200],
      ["food-chuoi", "118 g", 118],
    ]);
  });

  it("follows edits: a deleted item is gone, a moved item changes meal, an edited portion shows", () => {
    const edits: DiaryEdits = {
      added: [],
      sample: { "item-1": { deleted: true }, "item-2": { mealSlot: "dinner" }, "item-3": { grams: 50, servingLabel: "50 g" } },
      undo: null,
    };
    expect(mealPortions(edits, "breakfast")).toEqual([{ foodId: "food-chuoi", servingLabel: "50 g", grams: 50 }]);
    expect(mealPortions(edits, "dinner").map((p) => p.foodId)).toEqual(["food-yogurt-kefir"]);
  });
});

describe("editing a quick entry", () => {
  it("has no portion, and exposes its macros", () => {
    const view = findEntry(withEntry(quick("A")), "q-1");
    expect(view).toMatchObject({ name: "A", canChangePortion: false, portionNote: null, kcal: 400 });
    expect(view?.quick).toEqual({ protein: 20, carbs: null, fat: null });
  });

  it("changes name, kcal and macros, and the meal", () => {
    const edits = updateEntryIn(withEntry(quick("A")), "q-1", {
      mealSlot: "lunch",
      quick: { name: " B ", calories: 250, protein: 5, carbs: 30, fat: 2 },
    });
    expect(edits.added[0]).toMatchObject({ foodName: "B", calories: 250, protein: 5, carbs: 30, fat: 2, mealSlot: "lunch" });
    expect(Object.values(edits.added[0].nutrients).every((v) => v === null)).toBe(true);
  });

  it("is left out of the foods a saved meal takes from a meal", () => {
    expect(mealPortions(withEntry(quick()), "dinner").some((p) => p.foodId === "quick")).toBe(false);
  });
});

describe("a quick entry with every macro unknown", () => {
  it("adds kcal to the day and moves no macro bar", () => {
    const r = quickEntryFrom({ name: "", kcal: "300", protein: "", carbs: "", fat: "" }, "dinner", "q-2", "2026-10-13T12:00:00.000Z");
    if (!r.ok) throw new Error("expected ok");
    const base = computeCompositeDayData(SAMPLE_DAY, []);
    const day = computeCompositeDayData(SAMPLE_DAY, [r.entry]);
    expect(day.calories.consumed).toBe((base.calories.consumed ?? 0) + 300);
    expect(day.macros.map((m) => m.consumed)).toEqual(base.macros.map((m) => m.consumed));
    expect(day.meals.find((m) => m.slot === "dinner")?.items.at(-1)?.detail).toBe("Đạm — · Tinh bột — · Chất béo —");
  });
});
