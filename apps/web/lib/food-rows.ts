import { useEffect, useSyncExternalStore } from "react";
import type { FoodItem } from "./mock/foods";
import { catalogChanged } from "./mock/foods";
import { searchFoods } from "./search";
import type { CookSwitch } from "./yield";

/**
 * cc-67: one list row per food (lib/food-twins). The index, its names and its search, and the raw / cooked data they and the
 * Sống | Chín switch stand on (lib/yield, the cc-53c pairs), are a chunk of their own that loads after the first paint, so
 * no page's first-load JS carries them (the budget is +2 kB a route). Until it is there a list shows every row under its
 * own name, hooks/use-food-browse waits for it before it shows a list at all, and a portion sheet has no switch (and no
 * add) yet. Hydration never sees it (loadFoodRows is called from an effect).
 */
type Rows = typeof import("./food-twins");
let rows: Rows | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Loads the one-row-per-food index (once) and tells every list to draw again. Call from an effect. */
export function loadFoodRows(): Promise<void> {
  loading ??= import("./food-twins").then((loaded) => {
    rows = loaded;
    listeners.forEach((listener) => listener());
    catalogChanged();
  });
  return loading;
}

/** The index is loaded: a list can show one row per food. */
export const rowsReady = (): boolean => rows !== null;

/** `rowsReady`, for a component that must draw again when it arrives. The server never loads it and a page opened by a link
 * hydrates before its effects run, so hydration sees false like the server. Asking for it starts the load. */
export function useRowsReady(): boolean {
  useEffect(() => {
    void loadFoodRows();
  }, []);
  return useSyncExternalStore((listener) => (listeners.add(listener), () => void listeners.delete(listener)), rowsReady, rowsReady);
}

/** The Sống | Chín switch of a food (lib/yield cookSwitchFor); none until the index is loaded. */
export const cookSwitchFor = (food: FoodItem, catalog: readonly FoodItem[], canSwap: boolean): CookSwitch | null => rows?.cookSwitchFor(food, catalog, canSwap) ?? null;

/** A list's name for a food: without its state and without bỏ vỏ, cả vỏ, thịt quả. */
export const rowName = (food: Pick<FoodItem, "id" | "nameVi">): string => rows?.rowName(food) ?? food.nameVi;

/** Every row id of the food a list row stands for. */
export const twinIdsOf = (food: Pick<FoodItem, "id">): readonly string[] => rows?.twinIdsOf(food) ?? [food.id];

/** Items about foods, each food once (the first item keeps its place and its row). */
export const dedupeTwins = <T>(items: readonly T[], foodOf: (item: T) => FoodItem): T[] => rows?.dedupeTwins(items, foodOf) ?? [...items];

/** The list with raw and cooked twins as one row. */
export const collapseTwins = (foods: readonly FoodItem[]): FoodItem[] => rows?.collapseTwins(foods) ?? [...foods];

/** Search with one row per food. */
export const searchRows = (foods: FoodItem[], query: string): FoodItem[] => rows?.searchRows(foods, query) ?? searchFoods(foods, query);
