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

/** A food with a `category` and a source, as the supplement rules below need it. */
interface UnitFood {
  category?: string;
  source?: string | null;
  servings?: Array<{ label: string; grams: number }>;
}

const GRAM_OR_VOLUME_LABEL = /^\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)$/i;

/**
 * Supplements (Thực phẩm bổ sung) are logged by the unit on the pack: "1 viên", "1 giọt", "1 muỗng". Their grams are
 * nominal (1 g per unit), only there so the totals stay grams × per-100 g. Whose numbers come from the label never
 * show a gram figure.
 */
export function hidesGrams(food: UnitFood | null | undefined): boolean {
  return !!food && food.category === "bo_sung" && (food.source ?? "").trim().toLowerCase() === "label";
}

/**
 * A portion label times a quantity, in the natural form: 2 × "1 viên" is "2 viên", 3 × "1 muỗng" is "3 muỗng",
 * 1 × "2 viên (liều trên nhãn)" stays as it is. A label with no leading number reads "2 × muỗng canh".
 */
export function unitPortionText(label: string, qty: number): string {
  const text = label.trim();
  const q = Math.round(qty * 100) / 100;
  if (!(q > 0) || q === 1) return text;
  const lead = /^(\d+(?:[.,]\d+)?)\s+(.+)$/.exec(text);
  if (lead) return `${formatNumber(Number(lead[1].replace(",", ".")) * q)} ${lead[2]}`;
  return `${formatNumber(q)} × ${text}`;
}

/**
 * The amount of a supplement entry as shown (Hôm nay rows, the share image, the portion panel): the quantity of its
 * portion, never grams. `label` is the portion it was logged with, `grams` the nominal grams. Null when the food is
 * not a supplement, or the entry was logged in grams: the caller keeps its usual grams text.
 */
export function unitAmountText(food: UnitFood | null | undefined, label: string | null | undefined, grams: number | null): string | null {
  if (!food || food.category !== "bo_sung") return null;
  const text = (label ?? "").trim();
  if (!text || GRAM_OR_VOLUME_LABEL.test(text)) return null;
  const serving = food.servings?.find((s) => s.label === text);
  if (serving && serving.grams > 0 && grams !== null && grams > 0) return unitPortionText(serving.label, grams / serving.grams);
  return text;
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
