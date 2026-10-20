import { COUNTED_NUTRIENT_KEYS } from "./day-totals";
import type { AddedDiaryEntry } from "./diary-edits";
import type { MealSlot } from "./meal-slot";
import { formatAmount } from "./format";
import { parseNumberInput } from "./parse-number";

export const QUICK_NAME = "Thêm nhanh";

/** A number typed with a Vietnamese comma ("2,5") or a dot. Blank, text ("12abc", "1e3") and negatives give null; 0 stays 0. */
export function parseDecimalInput(input: string): number | null {
  return parseNumberInput(input);
}

/** The most kcal one quick entry takes, and the longest name. */
export const MAX_QUICK_KCAL = 9999;
export const MAX_QUICK_NAME = 80;

export interface QuickEntryInput {
  name: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
}

export type QuickEntryResult =
  | { ok: true; entry: AddedDiaryEntry & { calories: number } }
  | { ok: false; field: "kcal" | "protein" | "carbs" | "fat"; message: string };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Every counted micronutrient unknown: null, never 0. */
function unknownNutrients(): Record<string, number | null> {
  return Object.fromEntries(COUNTED_NUTRIENT_KEYS.map((key) => [key, null]));
}

/**
 * "Chỉ thêm kcal": kcal above zero is required, the name is optional (Thêm nhanh), the macros are optional
 * (a blank one is unknown: null, never 0; a typed 0 stays 0). No food, so no micronutrient value and no fibre.
 */
/** What is wrong with one field, or null (cc-62: the sheet checks a field when it loses focus, and all of them on submit). */
export function quickFieldError(field: "kcal" | "protein" | "carbs" | "fat", text: string): string | null {
  if (field === "kcal") {
    const kcal = parseDecimalInput(text);
    // Stored as whole kcal, so "0,4" would become 0: it must round to at least 1
    if (kcal === null || Math.round(kcal) < 1) return "Nhập kcal lớn hơn 0";
    if (kcal > MAX_QUICK_KCAL) return "Tối đa 9.999 kcal";
    return null;
  }
  return text.trim() && parseDecimalInput(text) === null ? "Nhập một số từ 0 trở lên" : null;
}

export function quickEntryFrom(input: QuickEntryInput, slot: MealSlot, id: string, addedAt: string): QuickEntryResult {
  for (const field of ["kcal", "protein", "carbs", "fat"] as const) {
    const message = quickFieldError(field, input[field]);
    if (message) return { ok: false, field, message };
  }
  const kcal = parseDecimalInput(input.kcal) as number;

  const macros: Record<"protein" | "carbs" | "fat", number | null> = { protein: null, carbs: null, fat: null };
  for (const field of ["protein", "carbs", "fat"] as const) {
    const text = input[field];
    if (text.trim()) macros[field] = round1(parseDecimalInput(text) as number);
  }

  const name = Array.from(input.name.trim()).slice(0, MAX_QUICK_NAME).join("") || QUICK_NAME;
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
      fiber: null,
      nutrients: unknownNutrients(),
      addedAt,
    },
  };
}

/** The macros of a quick entry for its row: "Đạm 12,5 g · Tinh bột — · Chất béo —". Unknown is "—", never 0 g. */
export function quickDetail(entry: Pick<AddedDiaryEntry, "protein" | "carbs" | "fat">): string {
  const show = (value: number | null) => (value === null ? "—" : `${formatAmount(value, "g")} g`);
  return `Đạm ${show(entry.protein)} · Tinh bột ${show(entry.carbs)} · Chất béo ${show(entry.fat)}`;
}
