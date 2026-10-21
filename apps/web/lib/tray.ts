import { isAmount } from "./amount";
import { canLog } from "./diary-edits";
import type { FoodItem } from "./catalog";
import { defaultPortionOf, hidesGrams, scaleNutrients } from "./portion";

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

export function inTray(items: readonly TrayItem[], foodId: string): boolean {
  return items.some((i) => i.food.id === foodId);
}

/** The + circle: in at the food's default portion (lib/portion defaultPortionOf), or out when it is already there. */
export function toggleTray(items: readonly TrayItem[], food: FoodItem): TrayItem[] {
  if (inTray(items, food.id)) return removeFromTray(items, food.id);
  const { label, grams } = defaultPortionOf(food);
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

/**
 * One item changed: its grams and label, or its food (a raw / cooked pair swapped in, cc-53b). A pair already in the
 * tray takes the item's portion and the item goes, so a food is never in it twice.
 */
export function patchTrayItem(items: readonly TrayItem[], foodId: string, patch: Partial<TrayItem>): TrayItem[] {
  const to = patch.food?.id;
  if (to && to !== foodId && inTray(items, to)) {
    const item = items.find((i) => i.food.id === foodId);
    return item ? setTrayPortion(removeFromTray(items, foodId), to, patch.grams ?? item.grams, patch.label ?? item.label) : [...items];
  }
  return items.map((i) => (i.food.id === foodId ? { ...i, ...patch } : i));
}

export function setTrayPortion(items: readonly TrayItem[], foodId: string, grams: number, label: string): TrayItem[] {
  return items.map((i) => (i.food.id === foodId ? { ...i, grams, label } : i));
}

/**
 * Known values only for the macros; kcal is null as soon as one item has no energy figure, except a supplement logged
 * by the unit, whose label states none: it adds 0 (labelZeros).
 */
export function trayTotals(items: readonly TrayItem[]): TrayTotals {
  if (items.length === 0) return { count: 0, kcal: null, protein: null, carbs: null, fat: null };
  const scaled = items.map((i) => scaleNutrients(i.food.nutrients, i.grams));
  const sum = (key: string): number | null => {
    const known = scaled.map((n) => n[key]).filter(isAmount);
    return known.length === 0 ? null : round1(known.reduce((a, b) => a + b, 0));
  };
  const energyKnown = items.every((i, at) => isAmount(scaled[at].energy) || hidesGrams(i.food));
  return {
    count: items.length,
    kcal: energyKnown ? Math.round(scaled.reduce((a, n) => a + (isAmount(n.energy) ? n.energy : 0), 0)) : null,
    protein: sum("protein"),
    carbs: sum("carbs"),
    fat: sum("fat"),
  };
}

/** Every food can be logged (canLog) at more than 0 g, and there is at least one. */
export function canAddTray(items: readonly TrayItem[]): boolean {
  return items.length > 0 && items.every((i) => i.grams > 0 && canLog(i.food));
}

/**
 * Keys for the cards of Khay · xem lại that stay with the card: a Sống ↔ Chín swap changes the card's food (and its
 * id) but it is the same card, so it must not remount and lose focus. A key is the card's first food id; a second
 * card for the same id gets `#2`.
 */
export interface StableKeys {
  keyFor(foodId: string): string;
  /** The card showing `from` now shows `to`. */
  renamed(from: string, to: string): void;
  /** Forgets the cards that left (call with the ids now in the tray, before keyFor). */
  keep(foodIds: readonly string[]): void;
}

export function createStableKeys(): StableKeys {
  const keys = new Map<string, string>();
  const keyFor = (foodId: string): string => {
    const known = keys.get(foodId);
    if (known !== undefined) return known;
    const used = new Set(keys.values());
    let key = foodId;
    for (let n = 2; used.has(key); n++) key = `${foodId}#${n}`;
    keys.set(foodId, key);
    return key;
  };
  return {
    keyFor,
    renamed(from, to) {
      const key = keyFor(from);
      keys.delete(from);
      keys.set(to, key);
    },
    keep(foodIds) {
      const now = new Set(foodIds);
      for (const id of [...keys.keys()]) if (!now.has(id)) keys.delete(id);
    },
  };
}
