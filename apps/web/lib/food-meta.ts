import type { FoodItem } from "./catalog";
import { defaultServing, scaleNutrients } from "./portion";
import { formatAmount } from "./format";
import { nutrientName } from "./nutrients";
import { sourceName } from "./source-names";

/** Maps a food source code to a Vietnamese UI label, never returning a raw code (the table in lib/source-names). */
export function foodSourceLabel(source?: string | null): string {
  return sourceName(source)?.label ?? "Khác";
}

/**
 * The brand a food page names before its source, or null when it only repeats the source's own name: a Fortify Kitchen row has the
 * brand "Fortify Kitchen" and the source "Fortify Kitchen", and the page says it once.
 */
export function brandToShow(food: Pick<FoodItem, "brand" | "source">): string | null {
  const brand = food.brand?.trim();
  if (!brand) return null;
  const same = (a: string, b: string) => a.trim().replace(/\s+/g, " ").toLowerCase() === b.trim().replace(/\s+/g, " ").toLowerCase();
  return same(brand, foodSourceLabel(food.source)) ? null : brand;
}

/** "84 kcal / 30 g": the energy of the food's default serving (lib/portion defaultServing: grams for a food weighed in grams), "Chưa có kcal" when unknown, never 0 kcal. The + sheet's second line; V3 shows no carbs or potassium here. */
export function foodServingMeta(food: FoodItem): string {
  const serving = defaultServing(food);
  const energy = scaleNutrients(food.nutrients, serving.grams).energy;
  const known = typeof energy === "number" && Number.isFinite(energy);
  return `${known ? `${formatAmount(Math.round(energy), "kcal")} kcal` : "Chưa có kcal"} / ${serving.label}`;
}

/** The second line of a food row: kcal per its default serving ("Chưa có kcal" when unknown), then carbs and potassium when known. */
export function foodMeta(food: FoodItem): string {
  const serving = defaultServing(food);
  const scaled = scaleNutrients(food.nutrients, serving.grams);
  const energy = scaled.energy;
  const carbs = Math.round((scaled.carbs ?? 0) * 10) / 10;
  const potassium = scaled.potassium ? Math.round(scaled.potassium) : null;

  // An unknown energy is never 0 kcal
  const known = typeof energy === "number" && Number.isFinite(energy);
  const parts = [`${known ? `${formatAmount(Math.round(energy), "kcal")} kcal` : "Chưa có kcal"} / ${serving.label}`];
  if (carbs > 0) parts.push(`${formatAmount(carbs, "g")} g tinh bột`);
  if (potassium) parts.push(`${formatAmount(potassium, "mg")} mg ${nutrientName("potassium")}`);
  return parts.join(" · ");
}

/** The portion and source of a food row: "60 g · USDA" (the portion label given, else the default serving). */
export function foodRowMeta(food: FoodItem, label?: string): string {
  const portion = label ?? defaultServing(food).label;
  return `${portion} · ${foodSourceLabel(food.source)}`;
}

/** kcal of a food row, "228 kcal", for the given grams or its default serving. Empty when energy is unknown. */
export function foodRowKcal(food: FoodItem, grams?: number): string | undefined {
  const energy = food.nutrients.energy;
  if (energy === null || energy === undefined) return undefined;
  const g = grams ?? defaultServing(food).grams;
  return `${formatAmount(Math.round((energy * g) / 100), "kcal")} kcal`;
}
