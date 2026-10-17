import { formatAmount, formatNumber } from "./format";
import { parseDecimalInput } from "./quick-entry";

/** A gram amount as shown: "2,5 g", "1.000 g". */
export function gramsServingLabel(grams: number): string {
  return `${formatAmount(grams, "g")} g`;
}

/** The serving label for grams typed in: "2,5" or "2.5" becomes "2,5 g". If the input is empty or invalid, returns fallback. */
export function formatGramsServingLabel(raw: string, fallback: string): string {
  const n = parseDecimalInput(raw);
  if (n === null) return fallback;
  return gramsServingLabel(n);
}

/** Maximum grams allowed for a single food entry (5 kg). Prevents accidental overflow or typing mistakes. */
export const MAX_GRAMS_PER_PORTION = 5000;

/**
 * Parses user-entered grams supporting Vietnamese decimal comma ("2,5") or standard dot ("2.5").
 * Clamped to MAX_GRAMS_PER_PORTION.
 */
export function parseGramsInput(input: string): number {
  if (!input) return 0;
  const normalized = input.trim().replace(",", ".");
  const num = parseFloat(normalized);
  if (isNaN(num) || num <= 0) return 0;
  if (num > MAX_GRAMS_PER_PORTION) return MAX_GRAMS_PER_PORTION;
  return num;
}

/**
 * Scales a record of nutrients (defined per 100 g) to a specific gram amount.
 * Preserves null values as null (never converts unknown to 0).
 */
export function scaleNutrients(
  nutrientsPer100g: Record<string, number | null>,
  grams: number
): Record<string, number | null> {
  const factor = grams / 100;
  const result: Record<string, number | null> = {};

  for (const [key, val] of Object.entries(nutrientsPer100g)) {
    if (val === null || val === undefined) {
      result[key] = null;
    } else {
      result[key] = val * factor;
    }
  }

  return result;
}

export interface MacroPreview {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
}

/**
 * Calculates primary macros for live preview and quick display.
 */
export function calculateMacroPreview(
  nutrientsPer100g: Record<string, number | null>,
  grams: number
): MacroPreview {
  const scaled = scaleNutrients(nutrientsPer100g, grams);
  return {
    calories: Math.round(scaled.energy ?? 0),
    carbs: Math.round((scaled.carbs ?? 0) * 10) / 10,
    protein: Math.round((scaled.protein ?? 0) * 10) / 10,
    fat: Math.round((scaled.fat ?? 0) * 10) / 10,
    fiber: Math.round((scaled.fiber ?? 0) * 10) / 10,
  };
}
