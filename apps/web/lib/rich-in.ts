import type { FoodItem } from "./catalog";
import { getNutrientDefinition, type NutrientDefinition } from "./nutrients";
import type { UpperLimit } from "./rda";
import { upperLimitNote } from "./upper-limits";

/**
 * The nutrients with a "Giàu …" list in Khám phá, in display order: minerals, then vitamins, then đạm and chất xơ. Ids are catalog
 * ids. A nutrient is here only when the catalogue backs it (feat/rich-more-nutrients, 23/10: at least 10 foods with a value, and
 * a list that ranks sensibly per 100 g and per portion; the 21/10 catalogue has 200 or more foods for each). Sodium is left out:
 * "giàu natri" is not a goal.
 */
export const RICH_NUTRIENT_IDS = [
  "calcium",
  "iron",
  "potassium",
  "magnesium",
  "zinc",
  "selenium",
  "phosphorus",
  "vitamin_d",
  "vitamin_c",
  "vitamin_a",
  "b12",
  "folate",
  "vitamin_e",
  "vitamin_k",
  "b6",
  "protein",
  "fiber",
] as const;

export type RichNutrientId = (typeof RICH_NUTRIENT_IDS)[number];

export function isRichNutrientId(id: string): id is RichNutrientId {
  return (RICH_NUTRIENT_IDS as readonly string[]).includes(id);
}

/** The nutrient name inside a sentence: English mineral and vitamin names as they are ("Calcium", "Vitamin D"), a Vietnamese name lowercased ("đạm"). */
export function richName(def: NutrientDefinition): string {
  return def.group === "minerals" || def.group === "vitamins" ? def.name : def.name.toLowerCase();
}

export type RichBasis = "per100" | "portion";

/** Which tab of a "Giàu …" list: every food but the supplements, or the supplements (category bo_sung) alone. */
export type RichKind = "food" | "supplement";

export interface RichInRow {
  food: FoodItem;
  /** Amount of the nutrient in `basis`, in the catalog unit. */
  amount: number;
  unit: string;
  /** Share of the daily target minimum, whole percent. Null when the target is unknown. */
  pct: number | null;
  /** What the amount refers to: "100 g" or the grams of the first serving. */
  basis: string;
}

/**
 * Foods of one kind ranked by one nutrient, highest first. Foods with no value (null) or none (0) are left out.
 * "portion" scales to each food's first serving. Ties keep the catalogue order.
 */
export function richInFoods(
  foods: FoodItem[],
  nutrientId: string,
  basis: RichBasis,
  targetMin: number | null,
  kind: RichKind
): RichInRow[] {
  const unit = getNutrientDefinition(nutrientId)?.unit ?? "mg";
  const rows: RichInRow[] = [];
  for (const food of foods) {
    if ((food.category === "bo_sung") !== (kind === "supplement")) continue;
    const per100 = food.nutrients[nutrientId];
    if (per100 === null || per100 === undefined || per100 <= 0) continue;
    const grams = basis === "portion" ? portionGrams(food) : 100;
    const amount = (per100 * grams) / 100;
    rows.push({
      food,
      amount,
      unit,
      pct: targetMin !== null && targetMin > 0 ? Math.round((amount / targetMin) * 100) : null,
      basis: `${grams} g`,
    });
  }
  return rows.sort((a, b) => b.amount - a.amount);
}

/** The grams of a food's portion on these lists: its first serving, 100 g when it has none. */
const portionGrams = (food: FoodItem): number => food.servings[0]?.grams ?? 100;

/**
 * A3 (23/10): the line under a Giàu … row when one portion of the food is above the nutrient's Tolerable Upper Intake Level,
 * the same line as Đủ 22 vi chất ("Vượt mức an toàn (400 µg)"); null otherwise. A UL for supplements only counts a
 * supplement, never ordinary food (lib/upper-limits).
 */
export function richUpperLimitLine(food: FoodItem, nutrientId: string, ul: UpperLimit | undefined): string | null {
  const per100 = food.nutrients[nutrientId];
  if (per100 === null || per100 === undefined) return null;
  const portion = (per100 * portionGrams(food)) / 100;
  const unit = getNutrientDefinition(nutrientId)?.unit ?? "mg";
  return upperLimitNote({ ul, unit, total: portion, supplement: food.category === "bo_sung" ? portion : 0 })?.line ?? null;
}
