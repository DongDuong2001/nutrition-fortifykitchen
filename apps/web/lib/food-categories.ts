import type { FoodItem } from "./mock/foods";
import { resolveFavourites } from "./favourites";
import { searchFoods, searchRows } from "./search";

/** Web-side only for now. Dong adds a `category` column to foods with the same keys (see OPEN_QUESTIONS). */
export type FoodCategory =
  | "tinh_bot"
  | "dam"
  | "beo"
  | "sua"
  | "do_uong"
  | "rau"
  | "trai_cay"
  | "mon_viet"
  | "an_vat"
  | "bo_sung"
  | "gia_vi"
  | "cua_toi";

export interface FoodCategoryDef {
  key: FoodCategory;
  label: string;
}

/** Display order of the categories. Labels live only here. */
export const FOOD_CATEGORIES: FoodCategoryDef[] = [
  { key: "tinh_bot", label: "Tinh bột" },
  { key: "dam", label: "Đạm" },
  { key: "beo", label: "Chất béo & hạt" },
  { key: "sua", label: "Sữa & chế phẩm" },
  { key: "do_uong", label: "Đồ uống" },
  { key: "rau", label: "Rau củ" },
  { key: "trai_cay", label: "Trái cây" },
  { key: "mon_viet", label: "Món Việt" },
  { key: "an_vat", label: "Đồ ngọt & ăn vặt" },
  { key: "bo_sung", label: "Thực phẩm bổ sung" },
  { key: "gia_vi", label: "Gia vị" },
  { key: "cua_toi", label: "Món của tôi" },
];

/** "all" = Tất cả, "favorite" = Yêu thích (the saved favourite ids, see lib/favourites.ts). */
export type FoodFilter = "all" | "favorite" | FoodCategory;

export interface FoodGroup {
  key: FoodCategory;
  label: string;
  foods: FoodItem[];
}

export interface FoodList {
  /** True for Tất cả with no query: the list is shown in category groups. */
  grouped: boolean;
  /** Ranked foods for the flat list (also set when grouped). */
  foods: FoodItem[];
  groups: FoodGroup[];
}

export function categoryLabel(key: FoodCategory): string {
  return FOOD_CATEGORIES.find((c) => c.key === key)?.label ?? "";
}

/** True for a key of FOOD_CATEGORIES. */
export function isKnownCategory(key: unknown): key is FoodCategory {
  return typeof key === "string" && FOOD_CATEGORIES.some((c) => c.key === key);
}

/** Foods without a category, or with one this app does not know (for example, from the API), count as Món của tôi: they never vanish from a list. */
export function categoryOf(food: FoodItem): FoodCategory {
  return isKnownCategory(food.category) ? food.category : "cua_toi";
}

/** One definition of Món của tôi: the category, or a food the user made. */
export function isOwnFood(food: FoodItem): boolean {
  // A food with an unknown (non-empty) category is listed under Món của tôi but is not the user's own
  return food.category === "cua_toi" || !food.category || food.source === "user";
}

export function isCategoryFilter(filter: FoodFilter): filter is FoodCategory {
  return isKnownCategory(filter);
}

/** Groups in display order. Empty categories are dropped. */
export function groupFoodsByCategory(foods: FoodItem[]): FoodGroup[] {
  return FOOD_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    foods: foods.filter((f) => categoryOf(f) === c.key),
  })).filter((g) => g.foods.length > 0);
}

/** The filter chips to show: only categories that have foods, in display order. */
export function categoriesWithFoods(foods: FoodItem[]): FoodCategoryDef[] {
  return groupFoodsByCategory(foods).map(({ key, label }) => ({ key, label }));
}

/**
 * The filter chips of the add sheet: the categories that have foods, plus Đồ uống, which always shows. No drink
 * has a sourced value yet (lib/data-sources), so its list is empty and says how to add one.
 */
export function chipCategories(foods: FoodItem[]): FoodCategoryDef[] {
  const withFoods = new Set(categoriesWithFoods(foods).map((c) => c.key));
  return FOOD_CATEGORIES.filter((c) => withFoods.has(c.key) || c.key === "do_uong").map(({ key, label }) => ({ key, label }));
}

/**
 * Applies the filter first, then the search, so both combine.
 * Favourites are a flat list in saved order, ranked by the search when there is a query.
 * Grouped only for Tất cả with no query.
 */
export function buildFoodList(foods: FoodItem[], query: string, filter: FoodFilter, favouriteIds: string[] = [], oneRowPerFood = true): FoodList {
  // cc-67: raw and cooked twins are one row unless the caller picks a state itself (the recipe's ingredient picker)
  const find = oneRowPerFood ? searchRows : searchFoods;
  if (filter === "favorite") {
    return { grouped: false, foods: find(resolveFavourites(favouriteIds, foods), query), groups: [] };
  }
  const category = isCategoryFilter(filter) ? filter : null;
  const scope = category ? foods.filter((f) => categoryOf(f) === category) : foods;
  const ranked = find(scope, query);
  const grouped = !query.trim() && !category;
  return { grouped, foods: ranked, groups: grouped ? groupFoodsByCategory(ranked) : [] };
}
