import type { FoodItem } from "./catalog";
import { sourceKey } from "./source-names";

/**
 * "Đồ ăn của Minh Hào" (Hao 21/10): the catalogue's own Fortify Kitchen foods, which /add lists under one chip and Khám phá
 * under one carousel. They are plain foods (a weighed portion each): never a dish, so no Thành phần and no parts.
 */

export const MINH_HAO_LABEL = "Đồ ăn của Minh Hào";
/** The Khám phá list screen: /explore/minh-hao (the [category] route, which knows this one slug besides the categories) */
export const MINH_HAO_SLUG = "minh-hao";

const BRAND_KEY = "fortify kitchen";

/** A row of Fortify Kitchen: source `fortify_kitchen`, or (for safety) the brand "Fortify Kitchen" under another source. */
export function isFortifyKitchenFood(food: Pick<FoodItem, "source" | "brand">): boolean {
  return sourceKey(food.source) === "fortify-kitchen" || (food.brand ?? "").trim().replace(/\s+/g, " ").toLowerCase() === BRAND_KEY;
}

/** The Fortify Kitchen rows of a list, in catalogue order. */
export const fortifyKitchenFoods = (foods: readonly FoodItem[]): FoodItem[] => foods.filter(isFortifyKitchenFood);
