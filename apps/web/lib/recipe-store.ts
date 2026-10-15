import { MOCK_FOODS } from "./mock/foods";
import { accountStorage } from "./storage-keys";
import {
  RECIPES_KEY,
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

function writeRecipes(list: Recipe[]): void {
  try {
    accountStorage()?.setItem(RECIPES_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the recipe lasts for this page view (it is in the catalogue)
  }
}

export const catalogueLookup: IngredientLookup = (foodId) => MOCK_FOODS.find((f) => f.id === foodId) ?? null;

/** Puts the stored recipes into the catalogue as foods and drops recipe foods that are no longer stored. */
export function syncRecipeFoods(recipes: Recipe[] = readRecipes()): void {
  for (let i = MOCK_FOODS.length - 1; i >= 0; i--) {
    if (isRecipeId(MOCK_FOODS[i].id)) MOCK_FOODS.splice(i, 1);
  }
  MOCK_FOODS.unshift(...recipes.map((r) => recipeToFood(r, catalogueLookup)));
}

export function getRecipe(id: string): Recipe | null {
  return readRecipes().find((r) => r.id === id) ?? null;
}

/** Saves (adds or replaces) a recipe and refreshes the catalogue. */
export function saveRecipe(recipe: Recipe): void {
  const list = upsertRecipe(readRecipes(), recipe);
  writeRecipes(list);
  syncRecipeFoods(list);
}
