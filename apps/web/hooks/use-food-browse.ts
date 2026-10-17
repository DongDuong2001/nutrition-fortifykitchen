"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browsableFoods, type FoodItem } from "@/lib/mock/foods";
import { findSimilarFoods } from "@/lib/search";
import {
  buildFoodList,
  chipCategories,
  categoryLabel,
  categoryOf,
  type FoodFilter,
} from "@/lib/food-categories";
import { useDiary } from "@/lib/diary-store";
import { isLiveMode } from "@/lib/api-mode";
import { apiClient } from "@/lib/api-client";

/**
 * Search, filter and list state for browsing foods. Shared by the add sheet and Khám phá, so both use
 * the same index, the same category chips and the same empty states.
 */
export function useFoodBrowse() {
  const { favouriteIds, isFavourite, demo } = useDiary();
  const [filter, setFilter] = useState<FoodFilter>("all");
  const [query, setQuery] = useState("");
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    if (isLiveMode() && !catalogLoaded) {
      apiClient.loadAllFoods().then(() => {
        setCatalogLoaded(true);
      }).catch(() => {});
    }
  }, [catalogLoaded]);

  // Filter and search combined. Grouped only for Tất cả with no query.
  // `demo` is a dependency because the catalogue read follows demo mode, which is known after mount
  const list = useMemo(
    () => buildFoodList(browsableFoods(), query, filter, favouriteIds),
    [query, filter, favouriteIds, demo, catalogLoaded]
  );
  const categories = useMemo(() => chipCategories(browsableFoods()), [demo, catalogLoaded]);
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
      return findSimilarFoods(browsableFoods(), query, 4);
    }
    return [];
  }, [list.foods, query]);

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
  };
}
