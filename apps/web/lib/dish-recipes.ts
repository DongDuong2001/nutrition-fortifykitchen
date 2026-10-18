import { catalogVersion, type FoodItem } from "./mock/foods";
import { calculateMacroPreview, gramsServingLabel } from "./portion";

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

/** The slim recipes, loaded once. In demo mode the few demo ingredient foods come with them (lib/mock/dish-demo-foods). */
export function loadDishRecipes(): Promise<DishRecipes> {
  if (!loading) {
    loading = (async () => {
      const [{ default: recipes }] = await Promise.all([import("./data/dish-recipes.slim.json"), loadDemoFoods()]);
      return recipes as unknown as DishRecipes;
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
  const [{ DISH_DEMO_FOODS }, { addDemoFoods }] = await Promise.all([import("./mock/dish-demo-foods"), import("./mock/foods")]);
  addDemoFoods(DISH_DEMO_FOODS);
}

/** A dish is a food of the Món Việt category: only those open the recipes file at all. */
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

export interface AddOnEntry {
  food: FoodItem;
  grams: number;
  label: string;
}

/**
 * The entries the active add-ons log, each its own food, in the order of the chips, for the chosen portion: "+ Bún 100 g"
 * of a dish taken ×2 logs 200 g of Bún. Nothing for a portion that is not positive.
 */
export function addOnEntries(addOns: readonly DishAddOn[], active: ReadonlySet<string>, servings: number): AddOnEntry[] {
  if (servings <= 0) return [];
  return addOns
    .filter((a) => active.has(a.label))
    .map((a) => {
      const { grams } = scaledAddOn(a, servings);
      return { food: a.food, grams, label: gramsServingLabel(grams) };
    });
}
