import type { FoodItem } from "./mock/foods";
import { searchFoods } from "./search";

/** Web-side only for now. Dong adds a `category` column to foods with the same keys (see OPEN_QUESTIONS). */
export type FoodCategory =
  | "tinh_bot"
  | "dam"
  | "beo"
  | "sua"
  | "rau"
  | "trai_cay"
  | "mon_viet"
  | "an_vat"
  | "bo_sung"
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
  { key: "rau", label: "Rau củ" },
  { key: "trai_cay", label: "Trái cây" },
  { key: "mon_viet", label: "Món Việt" },
  { key: "an_vat", label: "Đồ ngọt & ăn vặt" },
  { key: "bo_sung", label: "Thực phẩm bổ sung" },
  { key: "cua_toi", label: "Món của tôi" },
];

/** "all" = Tất cả, "favorite" = Yêu thích (no favourites are stored yet, so it lists everything). */
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

/** Foods without a category (for example, from the API) count as Món của tôi. */
export function categoryOf(food: FoodItem): FoodCategory {
  return food.category ?? "cua_toi";
}

export function isCategoryFilter(filter: FoodFilter): filter is FoodCategory {
  return FOOD_CATEGORIES.some((c) => c.key === filter);
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
 * Applies the category filter first, then the search, so both combine.
 * Grouped only for Tất cả with no query.
 */
export function buildFoodList(foods: FoodItem[], query: string, filter: FoodFilter): FoodList {
  const category = isCategoryFilter(filter) ? filter : null;
  const scope = category ? foods.filter((f) => categoryOf(f) === category) : foods;
  const ranked = searchFoods(scope, query);
  const grouped = !query.trim() && !category;
  return { grouped, foods: ranked, groups: grouped ? groupFoodsByCategory(ranked) : [] };
}
