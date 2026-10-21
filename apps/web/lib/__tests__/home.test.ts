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
  pctLabel,
  portionLabel,
  unknownKcalNote,
  type HomeEntry,
  type HomeMode,
} from "../home";
import { COUNTED_NUTRIENT_KEYS } from "../day-totals";
import type { AddedDiaryEntry } from "../diary-edits";
import { SAMPLE_DAY } from "../mock/sample-day";
import { MOCK_FOODS, addCatalogFood, setCatalogFoods, type FoodItem } from "../mock/foods";
import { mapApiFoodToFoodItem } from "../api-client";
import { entryNumbers } from "../diary-edits";
import { blankDay } from "../day-history";
import { computeCompositeDayData } from "../diary-store";
import { SAMPLE_ITEMS, type SampleEdits } from "../diary-edits";

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
    expect(heroLabel(NONE, all, meals)).toBe("Cả ngày · 2 món");
  });
  it("food: name and grams as typed", () => {
    expect(heroLabel({ kind: "food", id: "a" }, all, meals)).toBe("Cá hồi nướng · 120 g");
  });
  it("food without grams: the name alone", () => {
    const quick = [entry({ id: "q", name: "Phở", grams: null })];
    expect(heroLabel({ kind: "food", id: "q" }, quick, groupMeals(quick))).toBe("Phở");
  });
  it("meal: full meal name and count", () => {
    expect(heroLabel({ kind: "meal", slot: "lunch" }, all, meals)).toBe("Bữa trưa · 1 món");
    expect(heroLabel({ kind: "meal", slot: "dinner" }, all, meals)).toBe("Bữa tối · 1 món");
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

describe("pctLabel", () => {
  it("shows a dash for unknown, <1% for a value above 0 that rounds to 0, else the rounded percent", () => {
    expect(pctLabel(null, 2000)).toBe("—");
    expect(pctLabel(10, null)).toBe("—");
    expect(pctLabel(0, 2000)).toBe("0%");
    expect(pctLabel(3, 2000)).toBe("<1%");
    expect(pctLabel(10, 2000)).toBe("1%");
    expect(pctLabel(1041, 2000)).toBe("52%");
    expect(pctLabel(1999, 2000)).toBe("100%");
  });
});

describe("the day the store builds equals the sum of its entries", () => {
  const foods = MOCK_FOODS.slice(0, 5);
  const added: AddedDiaryEntry[] = foods.map((f, i) => ({
    id: `t-${i}`,
    foodId: f.id,
    foodName: f.nameVi,
    grams: 80 + i * 20,
    displayQty: `${80 + i * 20} g`,
    mealSlot: (["breakfast", "lunch", "snack", "dinner", "lunch"] as const)[i],
    addedAt: "2026-10-15T01:00:00.000Z",
    ...entryNumbers(f, 80 + i * 20),
  }));
  it("kcal, macros and the 22 counted nutrients match", () => {
    const day = computeCompositeDayData(blankDay(SAMPLE_DAY), added, {});
    const fromDay = valuesFromDay(day);
    const fromEntries = sumEntries(entriesFromAdded(added));
    expect(fromDay.kcal).toBe(fromEntries.kcal);
    for (const key of ["protein", "carbs", "fat", "fiber"] as const) expect(fromDay[key]).toBeCloseTo(fromEntries[key] ?? 0, 0);
    for (const key of COUNTED_NUTRIENT_KEYS) {
      expect(fromDay.nutrients[key] ?? null, key).toEqual(fromEntries.nutrients[key] === null ? null : expect.closeTo(fromEntries.nutrients[key] as number, 0));
    }
  });
});

describe("portionLabel: a food logged in ml or l keeps its portion as logged (cc2-32)", () => {
  it("shows ml and l as logged, even when the entry also carries grams", () => {
    expect(portionLabel({ qty: "200 ml", grams: 200 })).toBe("200 ml");
    expect(portionLabel({ qty: "1,5 l", grams: 1500 })).toBe("1,5 l");
    expect(portionLabel({ qty: "330 ML", grams: 330 })).toBe("330 ML");
  });

  it("keeps grams for everything else, and the typed portion when there are no grams", () => {
    expect(portionLabel({ qty: "1 quả", grams: 60 })).toBe("60 g");
    expect(portionLabel({ qty: "150 g", grams: 150 })).toBe("150 g");
    expect(portionLabel({ qty: "1 chén", grams: null })).toBe("1 chén");
    expect(portionLabel({ qty: "1.200 g", grams: 1200 })).toBe("1.200 g");
  });

  it("does not take a unit that only ends in l or ml for a volume", () => {
    expect(portionLabel({ qty: "1 lon", grams: 330 })).toBe("330 g");
    expect(portionLabel({ qty: "2 muỗng canh", grams: 30 })).toBe("30 g");
  });

  it("is what the food-mode hero label shows", () => {
    const kefir = entry({ id: "k", name: "Yogurt kefir", qty: "200 ml", grams: 200 });
    expect(heroLabel({ kind: "food", id: "k" }, [kefir], groupMeals([kefir]))).toBe("Yogurt kefir · 200 ml");
  });
});

describe("a day edited down never goes below 0 (cc2-32)", () => {
  const everyStat = (day: ReturnType<typeof computeCompositeDayData>) => [...day.macros, ...day.minerals, ...day.vitamins];
  const deleteAll: SampleEdits = Object.fromEntries(SAMPLE_ITEMS.map((i) => [i.item.id, { deleted: true }]));

  it("with every sample item deleted nothing is negative, and no nutrient without a source reads 0", () => {
    const day = computeCompositeDayData(SAMPLE_DAY, [], deleteAll);
    expect(day.calories.consumed).toBe(0);
    for (const stat of everyStat(day)) {
      expect(stat.consumed === null || stat.consumed >= 0, `${stat.key} consumed`).toBe(true);
      expect(stat.percentage === null || stat.percentage >= 0, `${stat.key} percentage`).toBe(true);
      expect(stat.displayValue.includes("-"), `${stat.key} displayValue ${stat.displayValue}`).toBe(false);
    }
    // nothing remains to carry a value: unknown, not 0
    for (const stat of everyStat(day)) expect(stat.consumed, stat.key).toBeNull();
    for (const key of Object.keys(day.nutrients ?? {})) expect(day.nutrients?.[key] ?? null, key).toBeNull();
    const values = valuesFromDay(day);
    expect(values.kcal).toBe(0);
    for (const v of [values.protein, values.carbs, values.fat, values.fiber, ...Object.values(values.nutrients)]) {
      expect(v === null || v >= 0).toBe(true);
    }
  });

  it("deleting any one sample item never makes an amount negative", () => {
    for (const info of SAMPLE_ITEMS) {
      const day = computeCompositeDayData(SAMPLE_DAY, [], { [info.item.id]: { deleted: true } });
      for (const stat of everyStat(day)) {
        expect(stat.consumed === null || stat.consumed >= 0, `${info.item.id} → ${stat.key}`).toBe(true);
        expect(stat.percentage === null || stat.percentage >= 0, `${info.item.id} → ${stat.key} %`).toBe(true);
      }
    }
  });

  it("a kcal-only entry on an emptied day carries kcal and nothing else", () => {
    const quick: AddedDiaryEntry = {
      id: "q1",
      kind: "quick",
      foodId: "quick",
      foodName: "Phở",
      grams: 0,
      displayQty: "1 tô",
      mealSlot: "lunch",
      addedAt: "2026-10-15T01:00:00.000Z",
      calories: 450,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
      nutrients: {},
    } as unknown as AddedDiaryEntry;
    const day = computeCompositeDayData(SAMPLE_DAY, [quick], deleteAll);
    expect(day.calories.consumed).toBe(450);
    for (const stat of everyStat(day)) expect(stat.consumed, stat.key).toBeNull();
  });
});

describe("unknown kcal (an entry the server stored with NULL)", () => {
  const known = entry({ id: "k", kcal: 200 });
  const unknown = entry({ id: "u", kcal: null });
  const homeAdded = (id: string): AddedDiaryEntry => ({
    id,
    foodId: "f",
    foodName: "Cơm",
    grams: 100,
    displayQty: "100 g",
    mealSlot: "lunch",
    calories: 0,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
    nutrients: {},
    addedAt: "2026-10-14T12:00:00.000Z",
  });

  it("a meal and the day skip the unknown ones", () => {
    expect(groupMeals([known, unknown]).find((m) => m.slot === "lunch")?.kcal).toBe(200);
    expect(sumEntries([known, unknown]).kcal).toBe(200);
  });

  it("a meal and the day with no kcal at all are unknown (null), an empty meal stays 0", () => {
    const meals = groupMeals([unknown]);
    expect(meals.find((m) => m.slot === "lunch")?.kcal).toBeNull();
    expect(meals.find((m) => m.slot === "breakfast")?.kcal).toBe(0);
    expect(sumEntries([unknown]).kcal).toBeNull();
  });

  it("the store's day has a null kcal total and a null meal total when every entry is unknown", () => {
    const added = [{ ...homeAdded("u1"), calories: null }];
    const day = computeCompositeDayData(blankDay(SAMPLE_DAY), added, {});
    expect(day.calories.consumed).toBeNull();
    expect(day.meals.find((m) => m.slot === "lunch")?.kcal).toBeNull();
    expect(valuesFromDay(day).kcal).toBeNull();
    const withKnown = computeCompositeDayData(blankDay(SAMPLE_DAY), [...added, { ...homeAdded("k1"), calories: 300 }], {});
    expect(withKnown.calories.consumed).toBe(300);
  });
});

describe("unknownKcalNote", () => {
  it("counts the foods whose kcal is unknown", () => {
    const entries = [entry({ id: "a" }), entry({ id: "b", kcal: null }), entry({ id: "c", kcal: null })];
    expect(unknownKcalNote(entries)).toBe("2 món chưa rõ kcal");
    expect(unknownKcalNote([entry({ id: "a", kcal: null })])).toBe("1 món chưa rõ kcal");
  });

  it("is null when every food has a kcal value, or there is no food", () => {
    expect(unknownKcalNote([entry({ id: "a" }), entry({ id: "b", kcal: 0 })])).toBeNull();
    expect(unknownKcalNote([])).toBeNull();
  });

  it("an all-unknown day has no total, so the hero percent is a dash", () => {
    const entries = [entry({ id: "a", kcal: null })];
    const shown = sumEntries(entries);
    expect(shown.kcal).toBeNull();
    expect(pctLabel(shown.kcal, 1950)).toBe("—");
    expect(unknownKcalNote(entries)).toBe("1 món chưa rõ kcal");
  });
});

describe("portionLabel: a supplement shows its unit quantity, never grams", () => {
  const food = {
    id: "food-test-canxi",
    nameVi: "Canxi thử",
    category: "bo_sung",
    source: "label",
    servings: [{ label: "1 viên", grams: 1 }, { label: "2 viên (liều trên nhãn)", grams: 2 }],
    nutrients: { energy: 0 },
  } as unknown as FoodItem;
  addCatalogFood(food);

  it("2 × 1 viên reads 2 viên", () => {
    expect(portionLabel({ foodId: food.id, qty: "1 viên", grams: 2 })).toBe("2 viên");
    expect(portionLabel({ foodId: food.id, qty: "1 viên", grams: 1 })).toBe("1 viên");
  });

  it("shows the label dose as its amount; the (…) part is the line under the name (fix/dish-portion-label)", () => {
    expect(portionLabel({ foodId: food.id, qty: "2 viên (liều trên nhãn)", grams: 2 })).toBe("2 viên");
  });

  it("is the hero label too", () => {
    const entry = { id: "e1", foodId: food.id, name: food.nameVi, qty: "1 viên", grams: 2 } as unknown as HomeEntry;
    expect(heroLabel({ kind: "food", id: "e1" }, [entry], [])).toBe("Canxi thử · 2 viên");
  });

  it("other foods still show grams", () => {
    expect(portionLabel({ foodId: "food-unknown", qty: "1 quả", grams: 60 })).toBe("60 g");
  });
});

describe("a supplement of the live catalogue (the foods the database sent)", () => {
  const live = mapApiFoodToFoodItem({
    id: "33333333-3333-4333-8333-333333333333",
    name_vi: "Vitamin D3 thử",
    category: "bo_sung",
    source: "label",
    servings: [{ label: "1 viên", grams: 1 }],
    nutrients: { energy: 0 },
  });
  setCatalogFoods([live]);

  const added = (displayQty: string, grams: number): AddedDiaryEntry =>
    ({ id: "e-live", foodId: live.id, foodName: live.nameVi, grams, displayQty, mealSlot: "breakfast", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, nutrients: {}, addedAt: "2026-10-18T00:00:00.000Z" }) as unknown as AddedDiaryEntry;

  it("a logged entry shows 2 viên, not 2 g", () => {
    expect(portionLabel(homeEntryFromAdded(added("2 viên", 2)))).toBe("2 viên");
  });

  it("an entry read back from the server (serving_label 2 viên, grams 2) still shows 2 viên", () => {
    const refetched = added("2 viên", 2);
    expect(homeEntryFromAdded(refetched).qty).toBe("2 viên");
    expect(portionLabel(homeEntryFromAdded(refetched))).toBe("2 viên");
  });

  it("an old entry with no label (read back as 2 g) falls back to grams", () => {
    expect(portionLabel(homeEntryFromAdded(added("2 g", 2)))).toBe("2 g");
  });
});

describe("pctLabel above 999 (cc-63, B6)", () => {
  it("reads 999+% so a supplement at 20.833% fits its column", () => {
    expect(pctLabel(999, 100)).toBe("999%");
    expect(pctLabel(1000, 100)).toBe("999+%");
    expect(pctLabel(20833, 100)).toBe("999+%");
    expect(pctLabel(Number.NaN, 100)).toBe("—");
    expect(pctLabel(100, Number.POSITIVE_INFINITY)).toBe("—");
  });
});
