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
 * portion sheet opens (nothing pops in and pushes the add button under the finger). Any other row loads the recipes only (about 6 kB
 * gzipped, once) and, when they have one for that food, the chunk after them: Thành phần is not a Món Việt thing but a recipe thing.
 * Dynamic imports only: nothing of it joins the list's own first-load JS.
 */
export function prefetchDishParts(food: Pick<FoodItem, "category" | "id" | "source" | "sourceId" | "sourceRef">): void {
  const dish = food.category === "mon_viet";
  if (dish) void loadDishPartsModule().catch(() => {});
  void import("@/lib/dish-recipes")
    .then(async (m) => {
      await m.loadDishRecipes();
      if (!dish && m.recipeKnown(food)) await loadDishPartsModule();
    })
    .catch(() => {});
}
