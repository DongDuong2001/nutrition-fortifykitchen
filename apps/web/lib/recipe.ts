import { COUNTED_NUTRIENT_KEYS } from "./day-totals";
import type { FoodItem } from "./mock/foods";

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

/** Vietnamese decimal text ("1,5" or "1.5") to a number; null when it is not one. */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "" || !/^\d*\.?\d+$|^\d+\.$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
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
