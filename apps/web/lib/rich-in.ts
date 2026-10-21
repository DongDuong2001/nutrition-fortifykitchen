import type { FoodItem } from "./mock/foods";
import { getNutrientDefinition, type NutrientDefinition } from "./nutrients";

/** The nutrients with a "Giàu …" list in Khám phá, in display order. Ids are catalog ids. */
export const RICH_NUTRIENT_IDS = [
  "calcium",
  "iron",
  "potassium",
  "magnesium",
  "protein",
  "fiber",
  "vitamin_d",
  "vitamin_c",
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
    const grams = basis === "portion" ? (food.servings[0]?.grams ?? 100) : 100;
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
