"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
import { MINH_HAO_LABEL, isFortifyKitchenFood } from "@/lib/fortify-kitchen";
import { useDiary } from "@/lib/diary-store";

/**
 * Search, filter and list state for browsing foods. Shared by the add sheet and Khám phá, so both use
 * the same index, the same category chips and the same empty states. `enabled` false (the add sheet's first frame): the
 * list and the chips are not worked out yet, so the sheet's first frame costs only its own frame.
 */
export function useFoodBrowse({
  oneRowPerFood = true,
  enabled = true,
  fortifyTab = false,
}: { oneRowPerFood?: boolean; enabled?: boolean; /** The Đồ ăn Minh Hào chip after Tất cả (the add sheet): only while the catalogue has such a row */ fortifyTab?: boolean } = {}) {
  const { favouriteIds, isFavourite } = useDiary();
  const { foods, version, pending: catalogPending, failed: catalogFailed, retry: retryCatalog } = useCatalogFoods();
  const [picked, setFilter] = useState<FoodFilter>("all");
  const hasFortify = useMemo(() => fortifyTab && enabled && foods.some(isFortifyKitchenFood), [fortifyTab, enabled, foods]);
  // The chip goes when the catalogue loses its rows (another account, a reload): the list falls back to Tất cả, never an empty tab
  const filter: FoodFilter = picked === "minh_hao" && !hasFortify ? "all" : picked;
  const [query, setQuery] = useState("");
  // The first letter alone waits 120 ms before the list follows it, so the list does not flash the matches of every single
  // letter passed on the way to a word; from the second letter the list follows at once (port of the behaviour of PR #29)
  const [firstLetter, setFirstLetter] = useState("");
  useEffect(() => {
    if (query.length !== 1) {
      setFirstLetter("");
      return;
    }
    const timer = setTimeout(() => setFirstLetter(query), 120);
    return () => clearTimeout(timer);
  }, [query]);
  // While one letter waits, the list stays as it was (the list of the query before it: backspace "ab" → "a" must not flash the
  // whole catalogue for 120 ms); from the second letter it follows at once
  const heldQuery = useRef("");
  const listQuery = query.length === 1 && firstLetter !== query ? heldQuery.current : query;
  heldQuery.current = listQuery;
  // cc-58: the field follows every keystroke, the list follows the query when the browser has a moment, so a key
  // never waits for a search of the whole catalogue
  const searched = useDeferredValue(listQuery);

  // Filter and search combined. Grouped only for Tất cả with no query.
  // `foods` follows the catalogue (the live load, a made food) and demo mode
  // cc-67: a moment after the first paint the one-row-per-food index is there; a list is not drawn before (no rows that change names)
  const waitingForRows = oneRowPerFood && !rowsReady();
  const list = useMemo(
    () => (waitingForRows || !enabled ? { grouped: false, foods: [], groups: [] } : buildFoodList(foods, searched, filter, favouriteIds, oneRowPerFood)),
    [searched, filter, favouriteIds, foods, oneRowPerFood, waitingForRows, enabled]
  );
  const categories = useMemo(() => (enabled ? chipCategories(foods) : []), [foods, enabled]);
  const categoryName = useCallback((food: FoodItem) => categoryLabel(categoryOf(food)), []);
  // A food is a favourite when any of its rows is (raw and cooked are one row of a list)
  const isFavouriteFood = useCallback((food: FoodItem) => twinIdsOf(food).some(isFavourite), [isFavourite]);

  // Filter row: Tất cả, Yêu thích, then only the categories that have foods
  const filterItems = useMemo(
    () => [
      { id: "all", label: "Tất cả", active: filter === "all", onClick: () => setFilter("all") },
      ...(hasFortify ? [{ id: "minh_hao", label: MINH_HAO_LABEL, active: filter === "minh_hao", onClick: () => setFilter("minh_hao") }] : []),
      { id: "favorite", label: "Yêu thích", active: filter === "favorite", onClick: () => setFilter("favorite") },
      ...categories.map((c) => ({
        id: c.key,
        label: c.label,
        active: filter === c.key,
        onClick: () => setFilter(c.key),
      })),
    ],
    [filter, categories, hasFortify]
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
