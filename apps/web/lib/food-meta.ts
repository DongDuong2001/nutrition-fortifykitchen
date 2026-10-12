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

/** The portion and source of a food row: "60 g · USDA" (the portion label given, else the first serving). */
export function foodRowMeta(food: FoodItem, label?: string): string {
  const portion = label ?? food.servings[0]?.label ?? "100 g";
  return `${portion} · ${food.source === "user" ? "Của tôi" : food.source}`;
}

/** kcal of a food row, "228 kcal", for the given grams or its first serving. Empty when energy is unknown. */
export function foodRowKcal(food: FoodItem, grams?: number): string | undefined {
  const energy = food.nutrients.energy;
  if (energy === null || energy === undefined) return undefined;
  const g = grams ?? food.servings[0]?.grams ?? 100;
  return `${formatAmount(Math.round((energy * g) / 100), "kcal")} kcal`;
}
