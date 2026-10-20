import type { FoodItem } from "./catalog";
import { scaleNutrients } from "./portion";
import { formatAmount } from "./format";
import { nutrientName } from "./nutrients";

/** Maps a food source code to a Vietnamese UI label, never returning a raw code. */
export function foodSourceLabel(source?: string | null): string {
  const key = (source ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (key.startsWith("usda")) return "USDA"; // usda, usda_sr_legacy, usda_foundation, usda_fndds
  switch (key) {
    case "label":
      return "Nhãn";
    case "community":
    case "recipe-calc":
      return "Ước tính";
    case "cnf":
      return "CNF (Canada)";
    case "vn-table":
    case "vn-fct":
    case "vn-nin":
      return "Bảng TPDD Việt Nam";
    case "literature":
      return "Tài liệu";
    case "custom":
    case "user":
      return "Của tôi";
    default:
      return "Khác";
  }
}

/** The second line of a food row: kcal per its first serving ("Chưa có kcal" when unknown), then carbs and potassium when known. */
export function foodMeta(food: FoodItem): string {
  const defaultServing = food.servings[0] || { label: "100 g", grams: 100 };
  const scaled = scaleNutrients(food.nutrients, defaultServing.grams);
  const energy = scaled.energy;
  const carbs = Math.round((scaled.carbs ?? 0) * 10) / 10;
  const potassium = scaled.potassium ? Math.round(scaled.potassium) : null;

  // An unknown energy is never 0 kcal
  const known = typeof energy === "number" && Number.isFinite(energy);
  const parts = [`${known ? `${formatAmount(Math.round(energy), "kcal")} kcal` : "Chưa có kcal"} / ${defaultServing.label}`];
  if (carbs > 0) parts.push(`${formatAmount(carbs, "g")} g tinh bột`);
  if (potassium) parts.push(`${formatAmount(potassium, "mg")} mg ${nutrientName("potassium")}`);
  return parts.join(" · ");
}

/** The portion and source of a food row: "60 g · USDA" (the portion label given, else the first serving). */
export function foodRowMeta(food: FoodItem, label?: string): string {
  const portion = label ?? food.servings[0]?.label ?? "100 g";
  return `${portion} · ${foodSourceLabel(food.source)}`;
}

/** kcal of a food row, "228 kcal", for the given grams or its first serving. Empty when energy is unknown. */
export function foodRowKcal(food: FoodItem, grams?: number): string | undefined {
  const energy = food.nutrients.energy;
  if (energy === null || energy === undefined) return undefined;
  const g = grams ?? food.servings[0]?.grams ?? 100;
  return `${formatAmount(Math.round((energy * g) / 100), "kcal")} kcal`;
}
