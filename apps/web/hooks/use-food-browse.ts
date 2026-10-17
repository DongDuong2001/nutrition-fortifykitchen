"use client";

import { useCallback, useMemo, useState } from "react";
import type { FoodItem } from "@/lib/mock/foods";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { findSimilarFoods } from "@/lib/search";
import {
  buildFoodList,
  chipCategories,
  categoryLabel,
  categoryOf,
  type FoodFilter,
} from "@/lib/food-categories";
import { useDiary } from "@/lib/diary-store";

/**
 * Search, filter and list state for browsing foods. Shared by the add sheet and Khám phá, so both use
 * the same index, the same category chips and the same empty states.
 */
export function useFoodBrowse() {
  const { favouriteIds, isFavourite } = useDiary();
  const { foods, version, pending: catalogPending, failed: catalogFailed, retry: retryCatalog } = useCatalogFoods();
  const [filter, setFilter] = useState<FoodFilter>("all");
  const [query, setQuery] = useState("");

  // Filter and search combined. Grouped only for Tất cả with no query.
  // `foods` follows the catalogue (the live load, a made food) and demo mode
  const list = useMemo(() => buildFoodList(foods, query, filter, favouriteIds), [query, filter, favouriteIds, foods]);
  const categories = useMemo(() => chipCategories(foods), [foods]);
  const categoryName = useCallback((food: FoodItem) => categoryLabel(categoryOf(food)), []);
  const isFavouriteFood = useCallback((food: FoodItem) => isFavourite(food.id), [isFavourite]);

  // Filter row: Tất cả, Yêu thích, then only the categories that have foods
  const filterItems = useMemo(
    () => [
      { id: "all", label: "Tất cả", active: filter === "all", onClick: () => setFilter("all") },
      { id: "favorite", label: "Yêu thích", active: filter === "favorite", onClick: () => setFilter("favorite") },
      ...categories.map((c) => ({
        id: c.key,
        label: c.label,
        active: filter === c.key,
        onClick: () => setFilter(c.key),
      })),
    ],
    [filter, categories]
  );

  // Fuzzy suggestions when results are empty
  const similarFoods = useMemo(() => {
    if (list.foods.length === 0 && query.trim()) {
      return findSimilarFoods(foods, query, 4);
    }
    return [];
  }, [list.foods, query, foods]);

  // No saved favourite: the Yêu thích filter, no query, nothing in the list
  const noFavourites = filter === "favorite" && !query.trim() && list.foods.length === 0;

  return {
    query,
    setQuery,
    filter,
    setFilter,
    list,
    filterItems,
    categoryName,
    isFavouriteFood,
    similarFoods,
    noFavourites,
    /** The catalogue the list is built from changed: put it in the deps of anything read from MOCK_FOODS. */
    catalogVersion: version,
    /** The live catalogue is not here yet: show "Đang tải món…", not an empty state. */
    catalogPending,
    /** The live load brought nothing: offer Thử lại (retryCatalog). */
    catalogFailed,
    retryCatalog,
  };
}
