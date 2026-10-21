import type { FoodItem } from "./catalog";
import { canLog, entryNumbers, type AddedDiaryEntry } from "./diary-edits";
import { sumKcal } from "./kcal";
import { getMealSlotNameVi, type MealSlot } from "./meal-slot";
import type { KeyValueStorage } from "./favourites";

/** One food of a saved meal: the food, the portion label it was logged with and the grams. */
export interface SavedMealItem {
  foodId: string;
  servingLabel: string;
  grams: number;
}

/** Bữa ăn của tôi: a named set of foods with portions, logged in one tap. */
export interface SavedMeal {
  id: string;
  name: string;
  items: SavedMealItem[];
  createdAt: string;
}

/** Saved in localStorage like favourites, so saved meals last past the session. */
import { SAVED_MEALS_KEY } from "./storage-keys";
export { SAVED_MEALS_KEY };

/** "Bữa sáng 13/10": the meal name and the day it was saved from. */
export function defaultMealName(slot: MealSlot, iso: string): string {
  const [, month, day] = iso.split("-");
  return `${getMealSlotNameVi(slot)} ${day}/${month}`;
}

/** A trimmed name (the fallback when blank) with at least one item. An empty meal cannot be saved: null. */
export function buildSavedMeal(input: {
  id: string;
  name: string;
  fallbackName: string;
  items: SavedMealItem[];
  createdAt: string;
}): SavedMeal | null {
  if (input.items.length === 0) return null;
  const name = input.name.trim() || input.fallbackName;
  return { id: input.id, name, items: input.items, createdAt: input.createdAt };
}

/** A blank name changes nothing. */
export function renameSavedMeal(list: SavedMeal[], id: string, name: string): SavedMeal[] {
  const trimmed = name.trim();
  if (!trimmed) return list;
  return list.map((m) => (m.id === id ? { ...m, name: trimmed } : m));
}

export function removeSavedMeal(list: SavedMeal[], id: string): SavedMeal[] {
  return list.filter((m) => m.id !== id);
}

function isItem(value: unknown): value is SavedMealItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.foodId === "string" &&
    typeof v.servingLabel === "string" &&
    typeof v.grams === "number" &&
    Number.isFinite(v.grams) &&
    v.grams > 0
  );
}

/** Reads the saved list. Bad JSON gives an empty list, and a meal with a bad field or no items is dropped. */
export function parseSavedMeals(raw: string | null): SavedMeal[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m): m is SavedMeal => {
      if (typeof m !== "object" || m === null) return false;
      const v = m as Record<string, unknown>;
      return (
        typeof v.id === "string" &&
        typeof v.name === "string" &&
        typeof v.createdAt === "string" &&
        Array.isArray(v.items) &&
        v.items.length > 0 &&
        v.items.every(isItem)
      );
    });
  } catch {
    return [];
  }
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readSavedMeals(storage: KeyValueStorage | null = browserStorage()): SavedMeal[] {
  try {
    return parseSavedMeals(storage?.getItem(SAVED_MEALS_KEY) ?? null);
  } catch {
    return [];
  }
}

/** Storage can be full or blocked. Saved meals then last only for this page view. */
export function writeSavedMeals(list: SavedMeal[], storage: KeyValueStorage | null = browserStorage()): void {
  try {
    storage?.setItem(SAVED_MEALS_KEY, JSON.stringify(list));
  } catch {
    // Ignore quota and access errors
  }
}

/** The entries one tap adds: one per food that still exists, in the saved order, in the chosen meal. */
export function savedMealEntries(
  meal: SavedMeal,
  foods: FoodItem[],
  slot: MealSlot,
  idPrefix: string,
  addedAt: string
): AddedDiaryEntry[] {
  return meal.items.flatMap((item, i) => {
    const food = foods.find((f) => f.id === item.foodId);
    // A food with unknown energy is left out: its kcal would be logged as 0
    if (!food || !canLog(food)) return [];
    return [
      {
        id: `${idPrefix}-${i}`,
        foodId: food.id,
        foodName: food.nameVi,
        grams: item.grams,
        displayQty: item.servingLabel,
        mealSlot: slot,
        ...entryNumbers(food, item.grams),
        addedAt,
      },
    ];
  });
}

/** How many foods of the meal are in the catalogue but have no known energy: a tap leaves them out and says so. */
export function savedMealSkipped(meal: SavedMeal, foods: FoodItem[]): number {
  return meal.items.filter((item) => {
    const food = foods.find((f) => f.id === item.foodId);
    return food !== undefined && !canLog(food);
  }).length;
}

/** How many foods a tap adds and their kcal, for the row meta. A meal of only unknown-energy foods still counts as one row. */
export function savedMealTotals(meal: SavedMeal, foods: FoodItem[]): { itemCount: number; kcal: number } {
  const entries = savedMealEntries(meal, foods, "breakfast", "t", "");
  return { itemCount: entries.length + savedMealSkipped(meal, foods), kcal: sumKcal(entries.map((e) => e.calories)) ?? 0 };
}

/** The foods of a diary meal as saved-meal items. A quick kcal entry has no food and is left out. */
export function itemsFromEntries(entries: AddedDiaryEntry[]): SavedMealItem[] {
  return entries
    .filter((e) => e.kind !== "quick")
    .map((e) => ({ foodId: e.foodId, servingLabel: e.displayQty, grams: e.grams }));
}
