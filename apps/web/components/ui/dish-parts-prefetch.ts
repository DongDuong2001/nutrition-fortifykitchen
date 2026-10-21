import type { FoodItem } from "@/lib/catalog";

type DishPartsModule = typeof import("@/components/ui/dish-parts");

let loaded: DishPartsModule["DishParts"] | null = null;
let loading: Promise<DishPartsModule> | null = null;

/** The Thành phần chunk, loaded once (the portion panel's lazy() and the row's press share it). */
export function loadDishPartsModule(): Promise<DishPartsModule> {
  if (!loading) {
    loading = import("@/components/ui/dish-parts").then(
      (m) => ((loaded = m.DishParts), m),
      (error) => {
        loading = null;
        throw error;
      }
    );
  }
  return loading;
}

/** The component once its chunk has loaded, else null: the panel then renders it directly, with no Suspense pause. */
export const loadedDishParts = () => loaded;

/**
 * cc-64 (2b): a press on a Món Việt row starts loading the Thành phần chunk and the recipes, so they are there when its
 * portion sheet opens (nothing pops in and pushes the add button under the finger). Dynamic imports only: nothing of it
 * joins the list's own first-load JS.
 */
export function prefetchDishParts(food: Pick<FoodItem, "category">): void {
  if (food.category !== "mon_viet") return;
  void loadDishPartsModule().catch(() => {});
  void import("@/lib/dish-recipes").then((m) => m.loadDishRecipes()).catch(() => {});
}
