import { COUNTED_NUTRIENT_KEYS } from "./day-totals";
import type { AddedDiaryEntry } from "./diary-edits";
import type { MealSlot } from "./meal-slot";

export const QUICK_NAME = "Ghi nhanh";

/** A number typed with a Vietnamese comma ("2,5") or a dot. Blank, text and negatives give null; 0 stays 0. */
export function parseDecimalInput(input: string): number | null {
  const text = input.trim().replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export interface QuickEntryInput {
  name: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
}

export type QuickEntryResult =
  | { ok: true; entry: AddedDiaryEntry }
  | { ok: false; field: "kcal" | "protein" | "carbs" | "fat"; message: string };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Every counted micronutrient unknown: null, never 0. */
function unknownNutrients(): Record<string, number | null> {
  return Object.fromEntries(COUNTED_NUTRIENT_KEYS.map((key) => [key, null]));
}

/**
 * "Chỉ ghi kcal": kcal above zero is required, the name is optional (Ghi nhanh), the macros are optional
 * (blank is 0 g). No food, so no micronutrient value.
 */
export function quickEntryFrom(input: QuickEntryInput, slot: MealSlot, id: string, addedAt: string): QuickEntryResult {
  const kcal = parseDecimalInput(input.kcal);
  // Stored as whole kcal, so "0,4" would become 0: it must round to at least 1
  if (kcal === null || Math.round(kcal) < 1) return { ok: false, field: "kcal", message: "Nhập kcal lớn hơn 0" };

  const macros: Record<"protein" | "carbs" | "fat", number> = { protein: 0, carbs: 0, fat: 0 };
  for (const field of ["protein", "carbs", "fat"] as const) {
    const text = input[field];
    if (!text.trim()) continue;
    const value = parseDecimalInput(text);
    if (value === null) return { ok: false, field, message: "Nhập một số từ 0 trở lên" };
    macros[field] = round1(value);
  }

  const name = input.name.trim() || QUICK_NAME;
  return {
    ok: true,
    entry: {
      id,
      kind: "quick",
      foodId: "quick",
      foodName: name,
      grams: 0,
      displayQty: QUICK_NAME,
      mealSlot: slot,
      calories: Math.round(kcal),
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: 0,
      nutrients: unknownNutrients(),
      addedAt,
    },
  };
}
