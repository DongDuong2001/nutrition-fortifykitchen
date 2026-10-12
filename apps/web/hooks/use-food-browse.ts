"use client";

import { useCallback, useMemo, useState } from "react";
import { MOCK_FOODS, type FoodItem } from "@/lib/mock/foods";
import { findSimilarFoods } from "@/lib/search";
import {
  buildFoodList,
  categoriesWithFoods,
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
  const [filter, setFilter] = useState<FoodFilter>("all");
  const [query, setQuery] = useState("");

  // Filter and search combined. Grouped only for Tất cả with no query.
  const list = useMemo(() => buildFoodList(MOCK_FOODS, query, filter, favouriteIds), [query, filter, favouriteIds]);
  const categories = useMemo(() => categoriesWithFoods(MOCK_FOODS), []);
  const categoryName = useCallback((food: FoodItem) => categoryLabel(categoryOf(food)), []);
  const isFavouriteFood = useCallback((food: FoodItem) => isFavourite(food.id), [isFavourite]);

  // Filter row: Tất cả, Yêu thích, then only the categories that have foods
  const filterItems = [
    { id: "all", label: "Tất cả", active: filter === "all", onClick: () => setFilter("all") },
    { id: "favorite", label: "Yêu thích", active: filter === "favorite", onClick: () => setFilter("favorite") },
    ...categories.map((c) => ({
      id: c.key,
      label: c.label,
      active: filter === c.key,
      onClick: () => setFilter(c.key),
    })),
  ];

  // Fuzzy suggestions when results are empty
  const similarFoods = useMemo(() => {
    if (list.foods.length === 0 && query.trim()) {
      return findSimilarFoods(MOCK_FOODS, query, 4);
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
