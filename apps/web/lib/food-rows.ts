import type { FoodItem } from "./mock/foods";
import { catalogChanged } from "./mock/foods";
import { searchFoods } from "./search";

/**
 * cc-67: one list row per food (lib/food-twins). The index, its names and its search are a chunk of their own that loads
 * after the first paint, so no page's first-load JS carries them (the budget is +2 kB a route). Until it is there a list
 * shows every row under its own name, and lib/hooks/use-food-browse waits for it before it shows a list at all. Hydration
 * never sees it (loadFoodRows is called from an effect).
 */
type Rows = typeof import("./food-twins");
let rows: Rows | null = null;
let loading: Promise<void> | null = null;

/** Loads the one-row-per-food index (once) and tells every list to draw again. Call from an effect. */
export function loadFoodRows(): Promise<void> {
  loading ??= import("./food-twins").then((loaded) => {
    rows = loaded;
    catalogChanged();
  });
  return loading;
}

/** The index is loaded: a list can show one row per food. */
export const rowsReady = (): boolean => rows !== null;

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
