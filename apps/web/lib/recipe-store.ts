import { MOCK_FOODS } from "./mock/foods";
import { accountStorage } from "./storage-keys";
import {
  RECIPES_KEY,
  flattenRecipe,
  isRecipeId,
  parseRecipes,
  recipeToFood,
  upsertRecipe,
  type IngredientLookup,
  type Recipe,
} from "./recipe";

/**
 * Where the signed-in account's recipes live (localStorage, under the account's keys; demo mode has its own twin)
 * and how they reach the catalogue: each recipe is put into MOCK_FOODS as a food, replacing the earlier copy, so
 * search, the food page and the diary find it like any food. Client only.
 */
export function readRecipes(): Recipe[] {
  try {
    return parseRecipes(accountStorage()?.getItem(RECIPES_KEY) ?? null);
  } catch {
    return [];
  }
}

/** Whether the list reached storage. False when storage is full, blocked or missing. */
function writeRecipes(list: Recipe[]): boolean {
  try {
    const storage = accountStorage();
    if (!storage) return false;
    storage.setItem(RECIPES_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export const catalogueLookup: IngredientLookup = (foodId) => MOCK_FOODS.find((f) => f.id === foodId) ?? null;

/**
 * Puts the stored recipes into the catalogue as foods and drops recipe foods that are no longer stored. A recipe saved
 * before nested recipes were flattened is flattened here, so it still finds its inner recipes.
 */
export function syncRecipeFoods(recipes: Recipe[] = readRecipes()): void {
  for (let i = MOCK_FOODS.length - 1; i >= 0; i--) {
    if (isRecipeId(MOCK_FOODS[i].id)) MOCK_FOODS.splice(i, 1);
  }
  MOCK_FOODS.unshift(...recipes.map((r) => recipeToFood(flattenRecipe(r, recipes), catalogueLookup)));
}

export function getRecipe(id: string): Recipe | null {
  return readRecipes().find((r) => r.id === id) ?? null;
}

/**
 * Saves (adds or replaces) a recipe, with any recipe among its ingredients flattened to base ingredients, and
 * refreshes the catalogue. Returns false, changing nothing, when it could not be stored on this device.
 */
export function saveRecipe(recipe: Recipe): boolean {
  const list = readRecipes();
  const next = upsertRecipe(list, flattenRecipe(recipe, list));
  if (!writeRecipes(next)) return false;
  syncRecipeFoods(next);
  return true;
}
