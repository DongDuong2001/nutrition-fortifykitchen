import { hasEnergy } from "./diary-edits";
import type { FoodItem } from "./mock/foods";
import { scaleNutrients } from "./portion";

/** One food in the add tray with the portion it will be logged at. */
export interface TrayItem {
  food: FoodItem;
  grams: number;
  label: string;
}

export interface TrayTotals {
  count: number;
  /** null when the tray is empty or any item has unknown energy: an unknown is never added up as 0 */
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function defaultPortion(food: FoodItem): { label: string; grams: number } {
  return food.servings[0] ?? { label: "100 g", grams: 100 };
}

export function inTray(items: readonly TrayItem[], foodId: string): boolean {
  return items.some((i) => i.food.id === foodId);
}

/** The + circle: in at the food's first serving, or out when it is already there. */
export function toggleTray(items: readonly TrayItem[], food: FoodItem): TrayItem[] {
  if (inTray(items, food.id)) return removeFromTray(items, food.id);
  const { label, grams } = defaultPortion(food);
  return [...items, { food, grams, label }];
}

export function removeFromTray(items: readonly TrayItem[], foodId: string): TrayItem[] {
  return items.filter((i) => i.food.id !== foodId);
}

/** Lưu & chọn tiếp: the food with the chosen portion. A food already in the tray keeps its place and takes the new portion. */
export function putInTray(items: readonly TrayItem[], food: FoodItem, grams: number, label: string): TrayItem[] {
  if (inTray(items, food.id)) return setTrayPortion(items, food.id, grams, label);
  return [...items, { food, grams, label }];
}

export function setTrayPortion(items: readonly TrayItem[], foodId: string, grams: number, label: string): TrayItem[] {
  return items.map((i) => (i.food.id === foodId ? { ...i, grams, label } : i));
}

/** Known values only for the macros; kcal is null as soon as one item has no energy figure. */
export function trayTotals(items: readonly TrayItem[]): TrayTotals {
  if (items.length === 0) return { count: 0, kcal: null, protein: null, carbs: null, fat: null };
  const scaled = items.map((i) => scaleNutrients(i.food.nutrients, i.grams));
  const sum = (key: string): number | null => {
    const known = scaled.map((n) => n[key]).filter((v): v is number => typeof v === "number");
    return known.length === 0 ? null : round1(known.reduce((a, b) => a + b, 0));
  };
  const energyKnown = scaled.every((n) => typeof n.energy === "number");
  return {
    count: items.length,
    kcal: energyKnown ? Math.round(scaled.reduce((a, n) => a + (n.energy as number), 0)) : null,
    protein: sum("protein"),
    carbs: sum("carbs"),
    fat: sum("fat"),
  };
}

/** Every food can be logged (a number for energy) and there is at least one. */
export function canAddTray(items: readonly TrayItem[]): boolean {
  return items.length > 0 && items.every((i) => hasEnergy(i.food));
}
