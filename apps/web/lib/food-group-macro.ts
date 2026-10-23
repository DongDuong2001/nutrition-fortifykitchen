import type { FoodItem } from "./catalog";
import { categoryOf } from "./food-categories";
import { formatAmount } from "./format";
import { defaultServing, scaleNutrients } from "./portion";

/** The macro each of the three macro groups is about: Tinh bột → carbs, Đạm → protein, Chất béo → fat. Other groups show none (V3-SPEC §3.8). */
const GROUP_MACRO: Partial<Record<string, { nutrient: string; label: string }>> = {
  tinh_bot: { nutrient: "carbs", label: "tinh bột" },
  dam: { nutrient: "protein", label: "đạm" },
  beo: { nutrient: "fat", label: "chất béo" },
};

/**
 * The third line of a + sheet food row: the group's own macro for the food's first serving, "35 g tinh bột", "31 g đạm",
 * "13 g chất béo". Worked out from the food's real values; null (no line) for any other group, for a value the food does not
 * have, and for a value of zero. Never a made-up number.
 */
export function groupMacroLine(food: FoodItem): string | null {
  const macro = GROUP_MACRO[categoryOf(food)];
  if (!macro) return null;
  // The same serving the row's kcal are for (lib/food-meta foodServingMeta)
  const grams = defaultServing(food).grams;
  const value = scaleNutrients(food.nutrients, grams)[macro.nutrient];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return `${formatAmount(value, "g")} g ${macro.label}`;
}
