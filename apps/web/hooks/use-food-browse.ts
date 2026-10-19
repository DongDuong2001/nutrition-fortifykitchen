"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { FoodItem } from "@/lib/mock/foods";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { findSimilarFoods } from "@/lib/search";
import { dedupeTwins, rowsReady, twinIdsOf } from "@/lib/food-rows";
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
export function useFoodBrowse({ oneRowPerFood = true }: { oneRowPerFood?: boolean } = {}) {
  const { favouriteIds, isFavourite } = useDiary();
  const { foods, version, pending: catalogPending, failed: catalogFailed, retry: retryCatalog } = useCatalogFoods();
  const [filter, setFilter] = useState<FoodFilter>("all");
  const [query, setQuery] = useState("");
  // cc-58: the field follows every keystroke, the list follows the query when the browser has a moment, so a key
  // never waits for a search of the whole catalogue
  const searched = useDeferredValue(query);

  // Filter and search combined. Grouped only for Tất cả with no query.
  // `foods` follows the catalogue (the live load, a made food) and demo mode
  // cc-67: a moment after the first paint the one-row-per-food index is there; a list is not drawn before (no rows that change names)
  const waitingForRows = oneRowPerFood && !rowsReady();
  const list = useMemo(
    () => (waitingForRows ? { grouped: false, foods: [], groups: [] } : buildFoodList(foods, searched, filter, favouriteIds, oneRowPerFood)),
    [searched, filter, favouriteIds, foods, oneRowPerFood, waitingForRows]
  );
  const categories = useMemo(() => chipCategories(foods), [foods]);
  const categoryName = useCallback((food: FoodItem) => categoryLabel(categoryOf(food)), []);
  // A food is a favourite when any of its rows is (raw and cooked are one row of a list)
  const isFavouriteFood = useCallback((food: FoodItem) => twinIdsOf(food).some(isFavourite), [isFavourite]);

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
    if (list.foods.length === 0 && searched.trim()) {
      return dedupeTwins(findSimilarFoods(foods, searched, 8), (f) => f).slice(0, 4);
    }
    return [];
  }, [list.foods, searched, foods]);

  // No saved favourite: the Yêu thích filter, no query, nothing in the list
  const noFavourites = filter === "favorite" && !searched.trim() && list.foods.length === 0;

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
    /** The live catalogue is not here yet (or the one-row-per-food index, a moment after the first paint): show "Đang tải món…", not an empty state. */
    catalogPending: catalogPending || waitingForRows,
    /** The live load brought nothing: offer Thử lại (retryCatalog). */
    catalogFailed,
    retryCatalog,
  };
}
