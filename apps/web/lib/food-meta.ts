import type { FoodItem } from "./mock/foods";
import { scaleNutrients } from "./portion";
import { formatAmount } from "./format";

/** The second line of a food row: kcal per its first serving, then carbs and potassium when known. */
export function foodMeta(food: FoodItem): string {
  const defaultServing = food.servings[0] || { label: "100 g", grams: 100 };
  const scaled = scaleNutrients(food.nutrients, defaultServing.grams);
  const cals = Math.round(scaled.energy ?? 0);
  const carbs = Math.round((scaled.carbs ?? 0) * 10) / 10;
  const kali = scaled.potassium ? Math.round(scaled.potassium) : null;

  const parts = [`${formatAmount(cals, "kcal")} kcal / ${defaultServing.label}`];
  if (carbs > 0) parts.push(`${formatAmount(carbs, "g")} g carb`);
  if (kali) parts.push(`${formatAmount(kali, "mg")} mg kali`);
  return parts.join(" · ");
}
