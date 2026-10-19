import { MOCK_FOODS, catalogChanged, setHiddenFoodIds } from "./mock/foods";
import { accountStorage, browserLocal, keyedStorage, type KeyValueStore } from "./storage-keys";
import { apiClient, isLiveMode, repointOutboxFood, syncOfflineOutbox } from "./api-client";
import { currentAccountId } from "./auth-actions";
import { isDemo } from "./demo";
import { isUuid } from "./uuid";
import {
  RECIPES_KEY,
  carryServerFood,
  flattenRecipe,
  isRecipeId,
  loggedFoodId,
  parseRecipes,
  recipeFoodInput,
  recipeToFood,
  sameServerFood,
  upsertRecipe,
  type IngredientLookup,
  type Recipe,
} from "./recipe";

/**
 * Where the signed-in account's recipes live (localStorage, under the account's keys; demo mode has its own twin)
 * and how they reach the catalogue: each recipe is put into MOCK_FOODS as a food, replacing the earlier copy, so
 * search, the food page and the diary find it like any food. Client only.
 * Live mode: each version is also a server food (POST /foods/custom, per-100 g totals only; the ingredients stay on
 * the device), and entries are logged with it. `account` pins a read or write to one account; default the signed-in one.
 */
function recipeStorage(account?: string | null): KeyValueStore | null {
  if (account === undefined) return accountStorage();
  const local = browserLocal();
  return local ? keyedStorage(local, isDemo(), account) : null;
}

export function readRecipes(account?: string | null): Recipe[] {
  try {
    return parseRecipes(recipeStorage(account)?.getItem(RECIPES_KEY) ?? null);
  } catch {
    return [];
  }
}

/** Whether the list reached storage. False when storage is full, blocked or missing. */
function writeRecipes(list: Recipe[], account?: string | null): boolean {
  try {
    const storage = recipeStorage(account);
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
 * before nested recipes were flattened is flattened here, so it still finds its inner recipes. Their server foods stay
 * out of the lists (the recipe stands for them).
 */
export function syncRecipeFoods(recipes: Recipe[] = readRecipes()): void {
  for (let i = MOCK_FOODS.length - 1; i >= 0; i--) {
    if (isRecipeId(MOCK_FOODS[i].id)) MOCK_FOODS.splice(i, 1);
  }
  MOCK_FOODS.unshift(...recipes.map((r) => recipeToFood(flattenRecipe(r, recipes), catalogueLookup)));
  setHiddenFoodIds(recipes.flatMap((r) => [...(r.oneOff ? [r.id] : []), ...(r.serverFoodId ? [r.serverFoodId] : []), ...(r.pastServerFoodIds ?? [])]));
  catalogChanged();
}

export function getRecipe(id: string): Recipe | null {
  return readRecipes().find((r) => r.id === id) ?? null;
}

/** The food an entry of `foodId` is logged with: a recipe's server food once it has one. */
export function serverFoodIdOf(foodId: string): string {
  return loggedFoodId(foodId, readRecipes());
}

/** Live mode, signed in, not the demo: recipes go to the server. */
function syncAccount(): string | null {
  const account = currentAccountId();
  return isLiveMode() && !isDemo() && account ? account : null;
}

/**
 * Saves (adds or replaces) a recipe, with any recipe among its ingredients flattened to base ingredients, and
 * refreshes the catalogue. Returns false, changing nothing, when it could not be stored on this device. In live mode
 * the version is then created on the server too (uploadRecipe); until that answers it is logged on this device only.
 */
export function saveRecipe(recipe: Recipe): boolean {
  const account = syncAccount();
  const list = readRecipes();
  const next = upsertRecipe(list, carryServerFood(flattenRecipe(recipe, list), list.find((r) => r.id === recipe.id)));
  if (!writeRecipes(next)) return false;
  syncRecipeFoods(next);
  if (account) void uploadRecipe(recipe.id, account);
  return true;
}

const uploading = new Set<string>();

/**
 * Creates the recipe's server food once (POST /foods/custom) and stores its id on the recipe, in `account`'s storage
 * even when another account signed in meanwhile. Queued writes that named the local id then name the server food and
 * are sent; entries on screen follow through syncRecipeFoods (diary-store). A failure changes nothing: the recipe
 * stays on the device and the next app open tries again. True when the recipe has its server food.
 */
export async function uploadRecipe(id: string, account: string): Promise<boolean> {
  const key = `${account}\n${id}`;
  const all = readRecipes(account);
  const recipe = all.find((r) => r.id === id);
  if (!recipe) return false;
  if (recipe.serverFoodId && isUuid(recipe.serverFoodId)) return true;
  const input = recipeFoodInput(flattenRecipe(recipe, all), catalogueLookup);
  if (!input || uploading.has(key) || currentAccountId() !== account) return false;
  uploading.add(key);
  let edited = false;
  try {
    let serverId: string;
    try {
      serverId = (await apiClient.createFood(input)).id;
    } catch {
      return false;
    }
    if (!isUuid(serverId)) return false;
    const list = readRecipes(account);
    const now = list.find((r) => r.id === id);
    if (!now) return false;
    // Edited while the request was out: this food belongs to the version before, and the edit is sent next
    edited = !sameServerFood(now, recipe);
    const updated: Recipe = edited
      ? { ...now, pastServerFoodIds: [...(now.pastServerFoodIds ?? []), serverId] }
      : { ...now, serverFoodId: serverId };
    if (!writeRecipes(upsertRecipe(list, updated), account)) {
      edited = false;
      return false;
    }
    if (!edited) repointOutboxFood(id, serverId, account);
    if (currentAccountId() === account) {
      syncRecipeFoods();
      if (!edited) void syncOfflineOutbox();
    }
    return !edited;
  } finally {
    uploading.delete(key);
    if (edited) void uploadRecipe(id, account);
  }
}

/** App open (live mode, signed in): every recipe of `account` without a server food is created there, one at a time. */
export async function uploadPendingRecipes(account: string): Promise<void> {
  for (const recipe of readRecipes(account)) {
    if (currentAccountId() !== account) return;
    if (!recipe.serverFoodId) await uploadRecipe(recipe.id, account);
  }
}
