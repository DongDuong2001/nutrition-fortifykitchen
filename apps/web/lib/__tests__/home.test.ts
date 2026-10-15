import { describe, it, expect } from "vitest";
import {
  entriesFromAdded,
  groupMeals,
  heroLabel,
  homeEntryFromAdded,
  missingMicros,
  modeEntries,
  pctOf,
  sumEntries,
  toggleFood,
  toggleMeal,
  valuesFromDay,
  targetOf,
  type HomeEntry,
  type HomeMode,
} from "../home";
import { COUNTED_NUTRIENT_KEYS } from "../day-totals";
import type { AddedDiaryEntry } from "../diary-edits";
import { SAMPLE_DAY } from "../mock/sample-day";

const full = (): Record<string, number | null> => Object.fromEntries(COUNTED_NUTRIENT_KEYS.map((k) => [k, 1]));

function entry(over: Partial<HomeEntry> & { id: string }): HomeEntry {
  return {
    name: "Cơm trắng",
    qty: "150 g",
    grams: 150,
    slot: "lunch",
    kcal: 200,
    protein: 4,
    carbs: 40,
    fat: 1,
    fiber: 1,
    nutrients: full(),
    quick: false,
    ...over,
  };
}

const NONE: HomeMode = { kind: "day" };

describe("groupMeals", () => {
  it("returns the four slots in order, empty ones included", () => {
    const meals = groupMeals([entry({ id: "a", slot: "dinner" })]);
    expect(meals.map((m) => m.slot)).toEqual(["breakfast", "lunch", "snack", "dinner"]);
    expect(meals.map((m) => m.label)).toEqual(["Sáng", "Trưa", "Bữa phụ", "Tối"]);
    expect(meals[3].entries).toHaveLength(1);
    expect(meals[0].entries).toHaveLength(0);
  });
  it("sums a meal's kcal and keeps the entry order", () => {
    const meals = groupMeals([entry({ id: "a", kcal: 100 }), entry({ id: "b", kcal: 50 })]);
    expect(meals[1].kcal).toBe(150);
    expect(meals[1].entries.map((e) => e.id)).toEqual(["a", "b"]);
  });
  it("adds Trước tập after Trưa only when it holds something", () => {
    expect(groupMeals([]).some((m) => m.slot === "pre_workout")).toBe(false);
    const meals = groupMeals([entry({ id: "p", slot: "pre_workout" })]);
    expect(meals.map((m) => m.slot)).toEqual(["breakfast", "lunch", "pre_workout", "snack", "dinner"]);
  });
});

describe("sumEntries", () => {
  it("adds known values; a value no entry knows stays null, never 0", () => {
    const a = entry({ id: "a", fiber: null, nutrients: { ...full(), calcium: null } });
    const b = entry({ id: "b", fiber: null, nutrients: { ...full(), calcium: null, iron: 2 } });
    const sum = sumEntries([a, b]);
    expect(sum.kcal).toBe(400);
    expect(sum.carbs).toBe(80);
    expect(sum.fiber).toBeNull();
    expect(sum.nutrients.calcium).toBeNull();
    expect(sum.nutrients.iron).toBe(3);
  });
  it("one known entry is enough", () => {
    const sum = sumEntries([entry({ id: "a", protein: null }), entry({ id: "b", protein: 6 })]);
    expect(sum.protein).toBe(6);
  });
});

describe("missingMicros", () => {
  it("is true when any of the 22 counted nutrients is null or absent", () => {
    expect(missingMicros(entry({ id: "a" }))).toBe(false);
    expect(missingMicros(entry({ id: "a", nutrients: { ...full(), zinc: null } }))).toBe(true);
    expect(missingMicros(entry({ id: "a", nutrients: {} }))).toBe(true);
  });
});

describe("mode", () => {
  it("toggles a food on and off, and a meal replaces a food", () => {
    let mode = toggleFood(NONE, "a");
    expect(mode).toEqual({ kind: "food", id: "a" });
    expect(toggleFood(mode, "a")).toEqual(NONE);
    expect(toggleFood(mode, "b")).toEqual({ kind: "food", id: "b" });
    mode = toggleMeal(mode, "lunch");
    expect(mode).toEqual({ kind: "meal", slot: "lunch" });
    expect(toggleMeal(mode, "lunch")).toEqual(NONE);
    expect(toggleFood(mode, "a")).toEqual({ kind: "food", id: "a" });
  });
  it("modeEntries picks the entries the mode shows", () => {
    const all = [entry({ id: "a" }), entry({ id: "b", slot: "dinner" })];
    expect(modeEntries(NONE, all)).toHaveLength(2);
    expect(modeEntries({ kind: "food", id: "b" }, all).map((e) => e.id)).toEqual(["b"]);
    expect(modeEntries({ kind: "meal", slot: "lunch" }, all).map((e) => e.id)).toEqual(["a"]);
    expect(modeEntries({ kind: "food", id: "gone" }, all)).toEqual([]);
  });
});

describe("heroLabel", () => {
  const all = [entry({ id: "a", name: "Cá hồi nướng", grams: 120 }), entry({ id: "b", slot: "dinner" })];
  const meals = groupMeals(all);
  it("day: count of foods", () => {
    expect(heroLabel(NONE, all, meals)).toBe("CẢ NGÀY · 2 MÓN");
  });
  it("food: name and grams in capitals", () => {
    expect(heroLabel({ kind: "food", id: "a" }, all, meals)).toBe("CÁ HỒI NƯỚNG · 120 G");
  });
  it("food without grams: the name alone", () => {
    const quick = [entry({ id: "q", name: "Phở", grams: null })];
    expect(heroLabel({ kind: "food", id: "q" }, quick, groupMeals(quick))).toBe("PHỞ");
  });
  it("meal: full meal name and count", () => {
    expect(heroLabel({ kind: "meal", slot: "lunch" }, all, meals)).toBe("BỮA TRƯA · 1 MÓN");
    expect(heroLabel({ kind: "meal", slot: "dinner" }, all, meals)).toBe("BỮA TỐI · 1 MÓN");
  });
});

describe("pctOf", () => {
  it("rounds against the target and is null when either side is unknown", () => {
    expect(pctOf(1041, 2000)).toBe(52);
    expect(pctOf(null, 2000)).toBeNull();
    expect(pctOf(10, null)).toBeNull();
    expect(pctOf(10, 0)).toBeNull();
  });
});

describe("homeEntryFromAdded", () => {
  const added: AddedDiaryEntry = {
    id: "x",
    foodId: "f",
    foodName: "Khoai lang luộc",
    grams: 200,
    displayQty: "200 g",
    mealSlot: "snack",
    calories: 180,
    protein: 3,
    carbs: 40,
    fat: 0.2,
    fiber: 6,
    nutrients: { ...full(), iron: null },
    addedAt: "2026-10-14T12:00:00.000Z",
  };
  it("carries the numbers of the entry", () => {
    const e = homeEntryFromAdded(added);
    expect(e).toMatchObject({ id: "x", name: "Khoai lang luộc", grams: 200, slot: "snack", kcal: 180, quick: false });
    expect(missingMicros(e)).toBe(true);
  });
  it("a quick kcal entry has no grams", () => {
    const e = homeEntryFromAdded({ ...added, kind: "quick", grams: 0 });
    expect(e.quick).toBe(true);
    expect(e.grams).toBeNull();
  });
  it("entriesFromAdded keeps the order", () => {
    expect(entriesFromAdded([added, { ...added, id: "y" }]).map((e) => e.id)).toEqual(["x", "y"]);
  });
});

describe("valuesFromDay and targetOf", () => {
  it("reads kcal, macros and nutrients from the day, and the targets from its stats", () => {
    const v = valuesFromDay(SAMPLE_DAY);
    expect(v.kcal).toBe(SAMPLE_DAY.calories.consumed);
    expect(v.nutrients.sodium).toBe(SAMPLE_DAY.minerals.find((m) => m.key === "sodium")?.consumed ?? null);
    expect(targetOf(SAMPLE_DAY, "protein")).toBe(SAMPLE_DAY.macros.find((m) => m.key === "protein")?.targetMin);
    expect(targetOf(SAMPLE_DAY, "nope")).toBeNull();
  });
});
