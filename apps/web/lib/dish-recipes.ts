import { EDITED_DISH_SUFFIX, catalogFoodById, catalogVersion, type FoodItem } from "./catalog";
import { calculateMacroPreview } from "./portion";
import { RECIPE_ID_PREFIX, rawTotalGrams, sameServerFood, totalNutrients, type Recipe, type RecipeIngredient } from "./recipe";
import { readRecipes, saveRecipe, syncRecipeFoods } from "./recipe-store";
import { generateUuid } from "./uuid";

/**
 * cc-54: what is inside a premade Vietnamese dish (the "Thành phần" of the portion sheet), and the add-ons a person can
 * put with it for that meal. The recipes are the food research's dish-recipes.json, slimmed by scripts/slim-dishes.mjs
 * into lib/data/dish-recipes.slim.json: dish key → [serving grams, [[ingredient key, grams, role, name, add-on label,
 * add-on grams], ...]]. Keys are "source|source_id". The file is loaded only when a dish's portion sheet opens, so it
 * never lands in a shared chunk.
 *
 * A dish and its ingredients are found in the catalogue by (source, source_id), never by name. An ingredient the
 * catalogue does not have is shown without kcal (its name, from the file, only labels the row) and cannot be an add-on.
 */

export type DishRow = readonly [key: string, grams: number, role: string, name: string, addOnLabel: string | null, addOnGrams: number | null];
export type DishEntry = readonly [servingGrams: number, rows: readonly DishRow[]];
export type DishRecipes = Readonly<Record<string, DishEntry>>;

let loading: Promise<DishRecipes> | null = null;
let loaded: DishRecipes | null = null;

/** The recipes if they have already loaded (a dish row's pointerdown starts the load), else null. */
export const peekDishRecipes = (): DishRecipes | null => loaded;

/** Whether the loaded recipes have one for this food; null while they have not loaded. */
export function recipeKnown(food: Pick<FoodItem, "id" | "source" | "sourceId" | "sourceRef">): boolean | null {
  if (!loaded) return null;
  return keysOfFood(food).some((key) => key in loaded!);
}

/** The slim recipes, loaded once. In demo mode the few demo ingredient foods come with them (lib/mock/dish-demo-foods). */
export function loadDishRecipes(): Promise<DishRecipes> {
  if (!loading) {
    loading = (async () => {
      const [{ default: recipes }] = await Promise.all([import("./data/dish-recipes.slim.json"), loadDemoFoods()]);
      loaded = recipes as unknown as DishRecipes;
      return loaded;
    })().catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

async function loadDemoFoods(): Promise<void> {
  const { demoActive } = await import("./demo");
  if (!demoActive()) return;
  const [{ DISH_DEMO_FOODS }, { addDemoFoods }] = await Promise.all([import("./mock/dish-demo-foods"), import("./catalog")]);
  addDemoFoods(DISH_DEMO_FOODS);
}

/** A dish is a food of the Món Việt category: only those open the recipes file at all (components/ui/portion-panel checks the same). */
export const isDishFood = (food: Pick<FoodItem, "category">): boolean => food.category === "mon_viet";

// The mock catalogue (demo and mock mode) names its sources the way the sheet shows them, and its ids are the source ids
const MOCK_SOURCE_KEYS: Record<string, string> = { "VN FCT": "vn_table" };
const SR_LEGACY = "SR Legacy";

/** The (source, source_id) keys a catalogue food answers to: the API's own, and for a sample food the ones its source implies. */
export function keysOfFood(food: Pick<FoodItem, "id" | "source" | "sourceId" | "sourceRef">): string[] {
  const keys: string[] = [];
  if (food.sourceId) keys.push(`${food.source}|${food.sourceId}`);
  const alias = MOCK_SOURCE_KEYS[food.source];
  if (alias && !food.sourceId) keys.push(`${alias}|${food.id}`);
  if (food.sourceRef?.db === SR_LEGACY && food.sourceRef.id.startsWith("FDC ")) keys.push(`usda_sr_legacy|${food.sourceRef.id}`);
  return keys;
}

export type FoodsByKey = ReadonlyMap<string, FoodItem>;

let indexed: { foods: readonly FoodItem[]; version: number; index: FoodsByKey } | null = null;

/** The catalogue indexed by (source, source_id), kept until the catalogue changes. */
export function foodsByKey(foods: readonly FoodItem[]): FoodsByKey {
  const version = catalogVersion();
  if (indexed && indexed.foods === foods && indexed.version === version && indexed.index.size > 0) return indexed.index;
  const index = new Map<string, FoodItem>();
  for (const food of foods) for (const key of keysOfFood(food)) if (!index.has(key)) index.set(key, food);
  indexed = { foods, version, index };
  return index;
}

export interface DishPart {
  key: string;
  name: string;
  role: string;
  /** Grams in one serving of the dish (the recipe's own) */
  grams: number;
  /** The catalogue food, or null when the catalogue does not have it */
  food: FoodItem | null;
}

export interface DishAddOn {
  /** "+ Bún" */
  label: string;
  /** Grams for one serving of the dish */
  grams: number;
  food: FoodItem;
}

export interface DishView {
  /** The grams the parts add up to for one serving: the recipe's own serving grams */
  servingGrams: number;
  parts: DishPart[];
  addOns: DishAddOn[];
  /** Ingredient keys the catalogue does not have */
  unresolved: string[];
}

/** The parts and add-ons of a dish, or null when the dish has no recipe. */
export function dishViewOf(dish: Pick<FoodItem, "id" | "source" | "sourceId" | "sourceRef">, recipes: DishRecipes, byKey: FoodsByKey): DishView | null {
  let entry: DishEntry | undefined;
  for (const key of keysOfFood(dish)) {
    entry = recipes[key];
    if (entry) break;
  }
  if (!entry) return null;
  const [servingGrams, rows] = entry;
  const parts: DishPart[] = [];
  const addOns: DishAddOn[] = [];
  const unresolved: string[] = [];
  for (const [key, grams, role, name, addOnLabel, addOnGrams] of rows) {
    const food = byKey.get(key) ?? null;
    if (!food) unresolved.push(key);
    parts.push({ key, name: food?.nameVi ?? name, role, grams, food });
    if (food && addOnLabel && addOnGrams) addOns.push({ label: addOnLabel, grams: addOnGrams, food });
  }
  return { servingGrams, parts, addOns, unresolved };
}

/** How many servings of the recipe the chosen portion is: 300 g of a 600 g dish is 0.5, two bowls is 2. */
export function servingsOf(portionGrams: number, servingGrams: number): number {
  return servingGrams > 0 && portionGrams > 0 ? portionGrams / servingGrams : 0;
}

const tenth = (n: number) => Math.round(n * 10) / 10;

/** A part scaled to the portion: its grams and kcal (null when the food is not in the catalogue or has no energy). */
export function scaledPart(part: DishPart, servings: number): { grams: number; kcal: number | null } {
  const grams = tenth(part.grams * servings);
  const kcal = part.food ? calculateMacroPreview(part.food.nutrients, grams).calories : null;
  return { grams, kcal };
}

/** What a chip adds, scaled to the portion: the add-on's grams for this many servings. */
export function scaledAddOn(addOn: DishAddOn, servings: number): { grams: number; kcal: number | null } {
  const grams = tenth(addOn.grams * servings);
  return { grams, kcal: calculateMacroPreview(addOn.food.nutrients, grams).calories };
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* cc-67: the parts of a dish can be changed for one meal (Hao 19/10). Each part keeps its grams for ONE serving, so    */
/* the portion above still scales them all, the edited ones too.                                                       */
/* ---------------------------------------------------------------------------------------------------------------- */

/** A row of the Thành phần being edited */
export interface EditPart {
  key: string;
  name: string;
  /** The catalogue food, or null (a part with no data cannot be changed: its nutrients are unknown) */
  food: FoodItem | null;
  /** The recipe's grams for one serving (0 for an add-on) */
  base: number;
  /** The grams for one serving now: what the portion scales */
  perServing: number;
  /** Put in by an add-on chip */
  added?: boolean;
}

export const EDIT_STEP_GRAMS = 10;
export const addOnKey = (addOn: Pick<DishAddOn, "label">) => `add|${addOn.label}`;

/**
 * The parts to show: the recipe's, with the grams the user typed (`grams`, per serving, by part key), then the add-ons
 * that are on (`added`, by chip label) with their own grams unless typed. Keyed state, not a copy of the rows, so a
 * catalogue that arrives late (an ingredient's data) fills the rows without losing what was typed.
 */
export function editParts(view: DishView, grams: Readonly<Record<string, number>>, added: readonly string[]): EditPart[] {
  const own = (key: string, perServing: number) => grams[key] ?? perServing;
  const rows: EditPart[] = view.parts.map((p) => ({ key: p.key, name: p.name, food: p.food, base: p.grams, perServing: own(p.key, p.grams) }));
  for (const addOn of view.addOns) {
    if (added.includes(addOn.label)) rows.push({ key: addOnKey(addOn), name: addOn.food.nameVi, food: addOn.food, base: 0, perServing: own(addOnKey(addOn), addOn.grams), added: true });
  }
  return rows;
}

/** Grams of a part for this portion. */
export const partGrams = (part: EditPart, servings: number): number => tenth(part.perServing * servings);

/** Whether the parts differ from the recipe: a part changed, taken out, or put in. */
export const isEdited = (parts: readonly EditPart[]): boolean => parts.some((p) => Math.abs(p.perServing - p.base) > 1e-6);

/** Every part of the dish has data, so its numbers can be added up: otherwise the parts are shown but not changed. */
export const canEditParts = (parts: readonly EditPart[]): boolean => parts.length > 0 && parts.every((p) => p.food !== null);

/** What the edited dish adds up to for this portion: the weight, and the numbers per 100 g (null where a part lacks it). */
export function editTotals(parts: readonly EditPart[], servings: number): { grams: number; per100: Record<string, number | null>; ingredients: RecipeIngredient[] } {
  const ingredients = parts.flatMap((p): RecipeIngredient[] => (p.food && partGrams(p, servings) > 0 ? [{ foodId: p.food.id, name: p.name, grams: partGrams(p, servings), unit: "g" }] : []));
  const grams = rawTotalGrams(ingredients);
  const total = totalNutrients(ingredients, (id) => parts.find((p) => p.food?.id === id)?.food ?? null);
  const per100 = Object.fromEntries(Object.entries(total).map(([k, v]) => [k, v === null || grams <= 0 ? null : Math.round((v / grams) * 10000) / 100]));
  return { grams, per100, ingredients };
}

/** What the portion sheet knows of an edited dish. */
export interface DishEdit {
  /** The parts differ from the recipe */
  edited: boolean;
  /** The grams the parts add up to: what is logged */
  grams: number;
  /** The numbers of the edited dish per 100 g */
  per100: Record<string, number | null>;
  /** Makes the dish's one-off food (listed nowhere, like a recipe it reaches the server when it can) and returns it; null when it could not be stored on this device */
  save: () => FoodItem | null;
}

/**
 * The one-off food of an edited dish: a recipe of its parts named "Phở bò · đã chỉnh" that no list shows. Logged like any
 * recipe: offline the entry waits on this device until its server food exists (lib/recipe-store, lib/diary-store), and the
 * same edit twice is one food.
 */
export function saveEditedDish(dish: Pick<FoodItem, "nameVi">, ingredients: RecipeIngredient[]): FoodItem | null {
  if (ingredients.length === 0) return null;
  const made: Recipe = { id: `${RECIPE_ID_PREFIX}${generateUuid()}`, name: `${dish.nameVi}${EDITED_DISH_SUFFIX}`, servings: 1, cookedGrams: null, createdAt: new Date().toISOString(), ingredients, oneOff: true };
  const same = readRecipes().find((r) => r.oneOff && sameServerFood(r, made));
  const recipe = same ?? made;
  if (!same && !saveRecipe(recipe)) return null;
  // A saved one was put in the catalogue when the app opened, before this dish's ingredients were there: work it out again
  if (same) syncRecipeFoods();
  return catalogFoodById(recipe.id) ?? null;
}
