import { COUNTED_NUTRIENT_KEYS } from "./day-totals";
import type { CreateFoodInput } from "./api-client";
import type { FoodItem } from "./catalog";
import { isUuid } from "./uuid";

/**
 * Recipes (dishes made from ingredients), cc-27b. Pure helpers, no React and no storage.
 * A recipe holds its ingredients with grams; its numbers come from the ingredient foods:
 * - the sum is each ingredient's per-100 g value scaled by its grams;
 * - a nutrient is unknown (null) if ANY ingredient with grams above 0 has it unknown, never a partial sum;
 * - one serving weighs (cooked weight, or the raw total when none is given) / servings;
 * - per 100 g is read from the cooked weight when given, else the raw total.
 * Millilitres count as grams (1 ml = 1 g) because the catalogue has no densities.
 */
export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 20;
export const RECIPE_ID_PREFIX = "recipe-";
/** Saved per account in localStorage. */
export const RECIPES_KEY = "h1t_recipes_v1";

export type IngredientUnit = "g" | "ml";

export interface RecipeIngredient {
  foodId: string;
  name: string;
  grams: number;
  unit: IngredientUnit;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
  /** The whole pot weighed after cooking; null = not given (the raw total stands in). */
  cookedGrams: number | null;
  createdAt: string;
  /** Live mode: the server food (POST /foods/custom) that holds this version's totals. Entries are logged with it. */
  serverFoodId?: string;
  /** The server foods of earlier versions: past entries still name them, so they stay on the server, out of the lists. */
  pastServerFoodIds?: string[];
  /** cc-67: a premade dish with its parts changed for one meal. Logged like any recipe, listed nowhere (lib/catalog). */
  oneOff?: boolean;
}

/** The per-100 g nutrients of an ingredient's food, or null when the food is not in the catalogue. */
export type IngredientLookup = (foodId: string) => Pick<FoodItem, "nutrients"> | null;

/** Energy and macros first, then the 22 counted micros: the keys a recipe computes. */
export const RECIPE_NUTRIENT_KEYS: readonly string[] = ["energy", "protein", "carbs", "fat", "fiber", ...COUNTED_NUTRIENT_KEYS];

export function isRecipeId(id: string): boolean {
  return id.startsWith(RECIPE_ID_PREFIX);
}

export function clampServings(value: number): number {
  if (!Number.isFinite(value)) return MIN_SERVINGS;
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(value)));
}

const round = (value: number, digits = 2) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

export function rawTotalGrams(ingredients: readonly Pick<RecipeIngredient, "grams">[]): number {
  return round(ingredients.reduce((sum, i) => sum + (i.grams > 0 ? i.grams : 0), 0));
}

/** The weight the numbers are shared over: the cooked weight when given (above 0), else the raw total. */
export function baseGrams(recipe: Pick<Recipe, "ingredients" | "cookedGrams">): number {
  return recipe.cookedGrams !== null && recipe.cookedGrams > 0 ? recipe.cookedGrams : rawTotalGrams(recipe.ingredients);
}

/** One serving, in grams: the base weight over the number of servings. */
export function servingGrams(recipe: Pick<Recipe, "ingredients" | "cookedGrams" | "servings">): number {
  return round(baseGrams(recipe) / clampServings(recipe.servings), 1);
}

/** The whole recipe's nutrients (the sum over its ingredients). Unknown when any counted ingredient lacks it. */
export function totalNutrients(
  ingredients: readonly Pick<RecipeIngredient, "foodId" | "grams">[],
  lookup: IngredientLookup
): Record<string, number | null> {
  const used = ingredients.filter((i) => i.grams > 0);
  const out: Record<string, number | null> = {};
  for (const key of RECIPE_NUTRIENT_KEYS) {
    if (used.length === 0) {
      out[key] = null;
      continue;
    }
    let total = 0;
    let known = true;
    for (const ingredient of used) {
      const per100 = lookup(ingredient.foodId)?.nutrients[key];
      if (typeof per100 !== "number") {
        known = false;
        break;
      }
      total += (per100 * ingredient.grams) / 100;
    }
    out[key] = known ? round(total) : null;
  }
  return out;
}

/** The nutrients of one serving. */
export function perServingNutrients(recipe: Recipe, lookup: IngredientLookup): Record<string, number | null> {
  const total = totalNutrients(recipe.ingredients, lookup);
  const divisor = clampServings(recipe.servings);
  return Object.fromEntries(Object.entries(total).map(([k, v]) => [k, v === null ? null : round(v / divisor)]));
}

/** The nutrients per 100 g, from the cooked weight when given. Unknown while there is no weight. */
export function per100Nutrients(recipe: Recipe, lookup: IngredientLookup): Record<string, number | null> {
  const total = totalNutrients(recipe.ingredients, lookup);
  const base = baseGrams(recipe);
  return Object.fromEntries(Object.entries(total).map(([k, v]) => [k, v === null || base <= 0 ? null : round((v / base) * 100)]));
}

/** How many of the 22 counted micros a nutrient map has a value for. */
export function countedKnown(nutrients: Record<string, number | null>): number {
  return COUNTED_NUTRIENT_KEYS.filter((k) => typeof nutrients[k] === "number").length;
}

/**
 * The recipe with every ingredient that is itself a recipe replaced by that recipe's base ingredients, so a saved
 * recipe never depends on another one still being around. `grams` of a recipe ingredient is that share of the
 * inner recipe's weight (its cooked weight when given), so the nutrients stay the same. Weight stays what the user
 * typed: when a recipe is flattened and no cooked weight was given, the typed raw total becomes the cooked weight.
 * An inner recipe that is missing, or that loops back to this one, is left as it is (its nutrients show as unknown).
 */
export function flattenRecipe(recipe: Recipe, all: readonly Recipe[], seen: readonly string[] = []): Recipe {
  const path = [...seen, recipe.id];
  let flattened = false;
  const ingredients = recipe.ingredients.flatMap((ingredient): RecipeIngredient[] => {
    const inner = isRecipeId(ingredient.foodId) ? all.find((r) => r.id === ingredient.foodId) : undefined;
    if (!inner || path.includes(inner.id)) return [ingredient];
    const flat = flattenRecipe(inner, all, path);
    const base = baseGrams(flat);
    if (base <= 0) return [ingredient];
    flattened = true;
    const factor = ingredient.grams / base;
    return flat.ingredients.map((x) => ({ ...x, grams: round(x.grams * factor, 3) }));
  });
  if (!flattened) return recipe;
  return { ...recipe, ingredients, cookedGrams: recipe.cookedGrams ?? rawTotalGrams(recipe.ingredients) };
}

/** The recipe as a food of the catalogue (per 100 g), so search, the food page and the diary treat it like any food. */
export function recipeToFood(recipe: Recipe, lookup: IngredientLookup): FoodItem {
  const grams = servingGrams(recipe);
  return {
    id: recipe.id,
    nameVi: recipe.name,
    category: "cua_toi",
    source: "user",
    servings: [
      { label: "1 phần", grams, display: `1 phần · ${grams} g` },
      { label: "½ phần", grams: round(grams / 2, 1), display: "½ phần" },
      { label: "100 g", grams: 100 },
    ],
    nutrients: per100Nutrients(recipe, lookup),
  };
}

export interface RecipeDraft {
  name: string;
  servings: number;
  ingredients: { foodId: string; name: string; amount: string; unit: IngredientUnit }[];
  cooked: string;
}

export type RecipeErrors = Partial<Record<"name" | "ingredients" | "cooked", string>> & { amounts: Record<number, string> };

/**
 * Vietnamese number text to a number; null when it is not one. The comma is the decimal mark ("1,5"), a dot between
 * groups of three is the thousands mark ("1.200" = 1200, "1.200,5" = 1200,5), and any other dot is a decimal
 * point ("1.5", "0.500" = 0,5).
 */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const grouped = /^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(trimmed);
  const plain = grouped ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed.replace(",", ".");
  if (!/^\d*\.?\d+$|^\d+\.$/.test(plain)) return null;
  const n = Number(plain);
  return Number.isFinite(n) ? n : null;
}

/** A cooked weight under this share of the raw total, or over the larger one, is probably a typo (still allowed). */
export const COOKED_RATIO_MIN = 0.2;
export const COOKED_RATIO_MAX = 3;

/** The warning for a cooked weight far from the raw total (water cooks in, water cooks out, but not that much). Null when fine. */
export function cookedWarning(draft: Pick<RecipeDraft, "ingredients" | "cooked">): string | null {
  const cooked = draft.cooked.trim() === "" ? null : parseAmount(draft.cooked);
  if (cooked === null || cooked <= 0) return null;
  const raw = rawTotalGrams(draft.ingredients.map((i) => ({ grams: parseAmount(i.amount) ?? 0 })));
  if (raw <= 0) return null;
  const ratio = cooked / raw;
  if (ratio >= COOKED_RATIO_MIN && ratio <= COOKED_RATIO_MAX) return null;
  return "Khối lượng sau khi nấu khác nhiều so với tổng nguyên liệu. Kiểm tra lại trước khi lưu.";
}

/** The errors of a draft, each under its own field. `amounts` is keyed by the ingredient row. */
export function validateDraft(draft: RecipeDraft): RecipeErrors {
  const errors: RecipeErrors = { amounts: {} };
  if (draft.name.trim() === "") errors.name = "Nhập tên món";
  if (draft.ingredients.length === 0) errors.ingredients = "Thêm ít nhất một nguyên liệu";
  draft.ingredients.forEach((ingredient, index) => {
    const n = parseAmount(ingredient.amount);
    if (n === null || n <= 0) errors.amounts[index] = "Nhập khối lượng lớn hơn 0";
  });
  if (draft.cooked.trim() !== "") {
    const n = parseAmount(draft.cooked);
    if (n === null || n <= 0) errors.cooked = "Khối lượng sau khi nấu phải lớn hơn 0";
  }
  return errors;
}

export function hasErrors(errors: RecipeErrors): boolean {
  return Boolean(errors.name || errors.ingredients || errors.cooked || Object.keys(errors.amounts).length > 0);
}

/** A draft (already valid) as a recipe to save. */
export function draftToRecipe(draft: RecipeDraft, id: string, createdAt: string): Recipe {
  const cooked = draft.cooked.trim() === "" ? null : parseAmount(draft.cooked);
  return {
    id,
    name: draft.name.trim(),
    servings: clampServings(draft.servings),
    ingredients: draft.ingredients.map((i) => ({ foodId: i.foodId, name: i.name, grams: parseAmount(i.amount) ?? 0, unit: i.unit })),
    cookedGrams: cooked,
    createdAt,
  };
}

export function recipeToDraft(recipe: Recipe): RecipeDraft {
  const text = (n: number) => String(n).replace(".", ",");
  return {
    name: recipe.name,
    servings: recipe.servings,
    ingredients: recipe.ingredients.map((i) => ({ foodId: i.foodId, name: i.name, amount: text(i.grams), unit: i.unit })),
    cooked: recipe.cookedGrams === null ? "" : text(recipe.cookedGrams),
  };
}

/**
 * The draft of "Tùy chỉnh món này": a catalogue dish with a `recipe` becomes an editable recipe of the
 * user's own (named "<tên món> (của tôi)", one serving, its ingredients in grams, the cooked weight). Null when the
 * food has no recipe.
 */
export function recipeDraftFromFood(food: FoodItem): RecipeDraft | null {
  const recipe = food.recipe;
  if (!recipe || recipe.ingredients.length === 0) return null;
  const text = (n: number) => String(n).replace(".", ",");
  return {
    name: `${food.nameVi} (của tôi)`,
    servings: 1,
    ingredients: recipe.ingredients.map((i) => ({ foodId: i.foodId, name: i.name, amount: text(i.grams), unit: "g" as const })),
    cooked: recipe.cookedGrams === null ? "" : text(recipe.cookedGrams),
  };
}

/** What one ingredient adds to a serving, in grams of the ingredient. */
export function ingredientPerServing(ingredient: Pick<RecipeIngredient, "grams">, servings: number): number {
  return round(ingredient.grams / clampServings(servings), 1);
}

function isIngredient(value: unknown): value is RecipeIngredient {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.foodId === "string" &&
    typeof v.name === "string" &&
    typeof v.grams === "number" &&
    Number.isFinite(v.grams) &&
    v.grams > 0 &&
    (v.unit === "g" || v.unit === "ml")
  );
}

/** Reads the saved list. Bad JSON gives an empty list; a recipe with a bad field or no ingredients is dropped. */
export function parseRecipes(raw: string | null): Recipe[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is Recipe => {
      if (typeof r !== "object" || r === null) return false;
      const v = r as Record<string, unknown>;
      return (
        typeof v.id === "string" &&
        isRecipeId(v.id) &&
        typeof v.name === "string" &&
        v.name.trim() !== "" &&
        typeof v.servings === "number" &&
        v.servings >= MIN_SERVINGS &&
        v.servings <= MAX_SERVINGS &&
        typeof v.createdAt === "string" &&
        (v.cookedGrams === null || (typeof v.cookedGrams === "number" && v.cookedGrams > 0)) &&
        Array.isArray(v.ingredients) &&
        v.ingredients.length > 0 &&
        v.ingredients.every(isIngredient)
      );
    });
  } catch {
    return [];
  }
}

/** Adds a recipe, or replaces the one with the same id (an edit keeps its place). */
export function upsertRecipe(list: Recipe[], recipe: Recipe): Recipe[] {
  return list.some((r) => r.id === recipe.id) ? list.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...list];
}

/** Whether two versions of a recipe give the same server food (name and numbers); the ingredient names do not count. */
export function sameServerFood(a: Recipe, b: Recipe): boolean {
  const numbers = (r: Recipe) =>
    JSON.stringify([r.name, r.servings, r.cookedGrams, r.ingredients.map((i) => [i.foodId, i.grams, i.unit])]);
  return numbers(a) === numbers(b);
}

/**
 * A saved version with the server foods of the one before. An edit that changes the name or the numbers gets a new
 * server food: the old one moves to pastServerFoodIds and stays on the server, because past entries name it.
 */
export function carryServerFood(next: Recipe, before: Recipe | undefined): Recipe {
  const plain: Recipe = { ...next };
  delete plain.serverFoodId;
  delete plain.pastServerFoodIds;
  if (!before) return plain;
  const past = before.pastServerFoodIds ?? [];
  if (before.serverFoodId && sameServerFood(plain, before)) return { ...plain, serverFoodId: before.serverFoodId, ...(past.length ? { pastServerFoodIds: past } : {}) };
  const all = before.serverFoodId ? [...past, before.serverFoodId] : past;
  return all.length ? { ...plain, pastServerFoodIds: all } : plain;
}

/**
 * The recipe as POST /foods/custom takes it: one serving ("phần") of the serving's grams, with that serving's values.
 * The server divides by serving_size and multiplies by 100, so it stores exactly the recipe's per-100 g values.
 * Every computed nutrient is sent, unknown ones as null. Null when the recipe cannot be sent yet: an ingredient is not
 * in the catalogue (it would make every value unknown), or it has no weight.
 */
export function recipeFoodInput(recipe: Recipe, lookup: IngredientLookup): CreateFoodInput | null {
  const grams = servingGrams(recipe);
  if (!(grams > 0) || recipe.ingredients.some((i) => lookup(i.foodId) === null)) return null;
  const per100 = per100Nutrients(recipe, lookup);
  const serving = (key: string) => {
    const v = per100[key];
    return typeof v === "number" ? (v * grams) / 100 : null;
  };
  const macros = ["energy", "protein", "carbs", "fat"];
  return {
    nameVi: recipe.name,
    servingUnit: "phần",
    servingSize: grams,
    calories: serving("energy"),
    protein: serving("protein"),
    carbs: serving("carbs"),
    fat: serving("fat"),
    micros: Object.fromEntries(RECIPE_NUTRIENT_KEYS.filter((k) => !macros.includes(k)).map((k) => [k, serving(k)])),
    // cc-67: the food of an edited dish is made for one meal; the API lists it nowhere. Foods made before this flag are
    // still hidden by their id and name (lib/recipe-store, lib/catalog)
    ...(recipe.oneOff ? { oneOff: true } : {}),
  };
}

/** The food an entry of `foodId` is logged with: a recipe's server food once it has one, else the id as it is. */
export function loggedFoodId(foodId: string, recipes: readonly Recipe[]): string {
  if (!isRecipeId(foodId)) return foodId;
  const server = recipes.find((r) => r.id === foodId)?.serverFoodId;
  return server && isUuid(server) ? server : foodId;
}

/** Entries named by a recipe's local id, pointed at its server food. The same array when nothing changes. */
export function withServerFoods<T extends { foodId: string; kind?: string }>(entries: T[], recipes: readonly Recipe[]): T[] {
  let changed = false;
  const next = entries.map((e) => {
    const foodId = e.kind === "quick" ? e.foodId : loggedFoodId(e.foodId, recipes);
    if (foodId === e.foodId) return e;
    changed = true;
    return { ...e, foodId };
  });
  return changed ? next : entries;
}
