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

export const GRAM_OR_VOLUME_LABEL = /^\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)$/i;

/** True when a serving label represents a discrete unit count (quả, trái, viên, cái, hộp, ly, chén, etc.) rather than grams/volume. */
export function isUnitServingLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  const trimmed = label.trim();
  return Boolean(trimmed) && !GRAM_OR_VOLUME_LABEL.test(trimmed);
}

/**
 * Supplements (Thực phẩm bổ sung) are logged by the unit on the pack: "1 viên", "1 giọt", "1 muỗng". Their grams are
 * nominal (1 g per unit), only there so the totals stay grams × per-100 g. Whose numbers come from the label never
 * show a gram figure, unless one of its portions is a real weight or volume ("100 g" of a whey powder): that one keeps
 * the gram field.
 */
export function hidesGrams(food: UnitFood | null | undefined): boolean {
  return (
    !!food &&
    food.category === "bo_sung" &&
    (food.source ?? "").trim().toLowerCase() === "label" &&
    !(food.servings ?? []).some((s) => GRAM_OR_VOLUME_LABEL.test(s.label.trim()))
  );
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
 * The amount of an entry as shown (Hôm nay rows, the share image, the portion panel): the quantity of its
 * portion, never grams when a unit serving (quả, trái, viên, chén, tô...) is used.
 * Null when the entry was logged in grams/volume: the caller keeps its usual grams text.
 */
export function unitAmountText(food: UnitFood | null | undefined, label: string | null | undefined, grams: number | null): string | null {
  if (!food || food.category !== "bo_sung") return null;
  const text = (label ?? "").trim();
  if (!text || GRAM_OR_VOLUME_LABEL.test(text)) return null;
  const serving = food.servings?.find((s) => s.label === text);
  if (serving && serving.grams > 0 && grams !== null && grams > 0) return unitPortionText(serving.label, grams / serving.grams);
  return text;
}

/** The most units of a portion one entry takes (the ×N stepper). */
export const MAX_UNIT_COUNT = 10;

export interface UnitPortion {
  grams: number;
  label: string;
}

/** N units of a serving: the grams are N × the serving's grams, the label is the collapsed "N viên" or "N quả". */
export function unitPortion(serving: { label: string; grams: number }, count: number): UnitPortion {
  const n = Math.min(MAX_UNIT_COUNT, Math.max(1, Math.round(count) || 1));
  return { grams: serving.grams * n, label: unitPortionText(serving.label, n) };
}

/**
 * Which serving and how many of it a label and grams stand for: "2 quả" at 110 g is 2 × "1 quả"; a serving's own
 * label is 1 × it. A label that matches nothing falls back to the first serving with the count its grams give.
 */
export function unitCountOf(
  servings: ReadonlyArray<{ label: string; grams: number }>,
  label: string,
  grams: number
): { serving: { label: string; grams: number }; count: number } | null {
  if (servings.length === 0) return null;
  // First, check if there is a base 1-unit serving that produces this label and grams
  for (const serving of servings) {
    for (let n = 1; n <= MAX_UNIT_COUNT; n++) {
      if (Math.abs(serving.grams * n - grams) < 1e-6 && unitPortionText(serving.label, n) === label) {
        return { serving, count: n };
      }
    }
  }
  const own = servings.find((s) => s.label === label);
  if (own) {
    const n = own.grams > 0 && grams > 0 ? Math.round(grams / own.grams) : 1;
    return { serving: own, count: Math.min(MAX_UNIT_COUNT, Math.max(1, n)) };
  }
  for (const serving of servings) {
    if (!GRAM_OR_VOLUME_LABEL.test(serving.label) && serving.grams > 0 && grams > 0) {
      const n = Math.round(grams / serving.grams);
      if (n >= 1 && n <= MAX_UNIT_COUNT) {
        return { serving, count: n };
      }
    }
  }
  const first = servings[0];
  return { serving: first, count: Math.min(MAX_UNIT_COUNT, Math.max(1, Math.round(grams / (first.grams || 1)) || 1)) };
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
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  fiber: number | null;
}

/** A macro of the preview card: "2,1 g", or "—" when unknown (never "0 g"). */
export function macroGramsText(grams: number | null): string {
  return grams === null ? "—" : `${formatAmount(grams, "g")} g`;
}

/**
 * Calculates primary macros for live preview and quick display. An unknown value stays null (shown as "—"), never 0.
 */
export function calculateMacroPreview(
  nutrientsPer100g: Record<string, number | null>,
  grams: number
): MacroPreview {
  const scaled = scaleNutrients(nutrientsPer100g, grams);
  const tenth = (v: number | null | undefined) => (typeof v === "number" ? Math.round(v * 10) / 10 : null);
  return {
    calories: typeof scaled.energy === "number" ? Math.round(scaled.energy) : null,
    carbs: tenth(scaled.carbs),
    protein: tenth(scaled.protein),
    fat: tenth(scaled.fat),
    fiber: tenth(scaled.fiber),
  };
}
