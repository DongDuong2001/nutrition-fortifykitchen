import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MOCK_FOODS, addCatalogFood, type FoodItem } from "../mock/foods";
import { SAMPLE_DAY } from "../mock/sample-day";
import { blankDay } from "../day-history";
import { computeCompositeDayData } from "../diary-store";
import { totalsFromDay, totalsFromEntries } from "../day-totals";
import { canAddTray, trayTotals } from "../tray";
import {
  LABEL_NO_ENERGY_NOTE,
  NO_ENERGY_MESSAGE,
  canLog,
  energyNotice,
  entryNumbers,
  labelZeros,
  type AddedDiaryEntry,
} from "../diary-edits";

// The live catalogue row of CanPrev Magnesium Bis-Glycinate 80 Ultra Gentle: bo_sung, source label, "1 viên" = 1 g,
// magnesium 8000 mg per 100 g (80 mg per capsule), no energy and no macros
const capsule = {
  id: "11111111-2222-4333-8444-555555555555",
  nameVi: "CanPrev Magnesium Bis-Glycinate 80 Ultra Gentle",
  category: "bo_sung",
  source: "label",
  servings: [{ label: "1 viên", grams: 1 }],
  nutrients: { magnesium: 8000 },
} as unknown as FoodItem;

const banana = MOCK_FOODS.find((f) => f.id === "food-chuoi")!;
const noEnergyFood = { ...banana, id: "food-no-energy", nutrients: { ...banana.nutrients, energy: null } } as FoodItem;

function entry(food: FoodItem, grams: number, id: string): AddedDiaryEntry {
  return {
    id,
    foodId: food.id,
    foodName: food.nameVi,
    grams,
    displayQty: food.servings[0].label,
    mealSlot: "breakfast",
    ...entryNumbers(food, grams),
    addedAt: "2026-10-18T07:00:00.000Z",
  };
}

/** The same capsule entry as the server sends it back: its kcal and macros are NULL. */
function fromServer(e: AddedDiaryEntry): AddedDiaryEntry {
  return { ...e, calories: null, protein: null, carbs: null, fat: null, fiber: null, synced: true };
}

beforeAll(() => addCatalogFood(capsule));
afterAll(() => {
  const at = MOCK_FOODS.findIndex((f) => f.id === capsule.id);
  if (at >= 0) MOCK_FOODS.splice(at, 1);
});

describe("a supplement logged by the unit whose label states no energy", () => {
  it("can be logged; any other food with unknown energy still cannot", () => {
    expect(canLog(capsule)).toBe(true);
    expect(canLog(banana)).toBe(true);
    expect(canLog(noEnergyFood)).toBe(false);
  });

  it("shows the short label note instead of the warning", () => {
    expect(energyNotice(capsule)).toBe(LABEL_NO_ENERGY_NOTE);
    expect(energyNotice(capsule)).not.toBe(NO_ENERGY_MESSAGE);
    expect(energyNotice(noEnergyFood)).toBe(NO_ENERGY_MESSAGE);
    expect(energyNotice(banana)).toBeNull();
  });

  it("a day of 2 viên and one normal food reads the normal food's kcal, not a dash", () => {
    const normal = entry(banana, 100, "e-1");
    const pill = fromServer(entry(capsule, 2, "e-2"));
    const day = computeCompositeDayData(blankDay(SAMPLE_DAY), [normal, pill]);
    expect(day.calories.consumed).toBe(normal.calories);
    expect(totalsFromDay(day).protein).toBe(Math.round(normal.protein!));
    // Its minerals count as usual
    // 2 viên: its magnesium counts as usual, 2 × 80 mg on top of the banana's
    expect(day.minerals.find((m) => m.key === "magnesium")?.consumed).toBe(160 + (normal.nutrients.magnesium as number));
  });

  it("a day of the capsule alone is 0 kcal, not unknown", () => {
    const day = computeCompositeDayData(blankDay(SAMPLE_DAY), [fromServer(entry(capsule, 2, "e-3"))]);
    expect(day.calories.consumed).toBe(0);
    expect(totalsFromEntries("2026-10-17", [fromServer(entry(capsule, 1, "e-4"))]).calories).toBe(0);
  });

  it("only the supplement's unknowns count as 0: another food's NULL kcal stays unknown", () => {
    const other = { ...fromServer(entry(banana, 100, "e-5")) };
    expect(labelZeros(other).calories).toBeNull();
    expect(labelZeros(fromServer(entry(capsule, 1, "e-6"))).calories).toBe(0);
    expect(labelZeros(fromServer(entry(capsule, 1, "e-7"))).fiber).toBeNull();
  });

  it("a tray with the capsule can be added, and its kcal is the other food's", () => {
    const items = [
      { food: banana, grams: 100, label: "100 g" },
      { food: capsule, grams: 1, label: "1 viên" },
    ];
    expect(canAddTray(items)).toBe(true);
    expect(trayTotals(items).kcal).toBe(Math.round(banana.nutrients.energy as number));
    expect(canAddTray([{ food: noEnergyFood, grams: 100, label: "100 g" }])).toBe(false);
  });
});
