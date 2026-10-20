import type { FoodCategory } from "./food-categories";
import { isLiveMode } from "./api-mode";
import { demoActive } from "./demo";
// The sample foods of demo and mock mode. A live build (NEXT_PUBLIC_API_MODE=live) gets lib/mock/live/sample-foods.ts
// in its place (next.config.ts), so not one sample food ships to the browser there.
import { SAMPLE_FOODS } from "./mock/sample-foods";

/**
 * The catalogue in use (perf/live-bundle, moved out of lib/mock/foods.ts): the food types, the one list every screen
 * reads, its id look-up and the tiny store that tells screens it changed. In demo and mock mode it starts with the
 * sample foods; in live mode with nothing, then the database's foods (setCatalogFoods) and the user's own.
 */

export interface FoodServing {
  label: string;
  grams: number;
  /** The chip text when it should not be built from label and grams ("½ phần"). */
  display?: string;
}

export interface FoodItem {
  id: string;
  nameVi: string;
  category: FoodCategory;
  brand?: string;
  source: "USDA" | "VN FCT" | "user" | "label";
  /** Live foods: the row's id in its source database (the API's source_id, with `source` as the API sends it) */
  sourceId?: string;
  servings: FoodServing[];
  tipVi?: string;
  nutrients: Record<string, number | null>; // per 100g
  /** Sample food of the demo day: found in lists and search only in demo mode (see browsableFoods). */
  demoOnly?: boolean;
  /** How close the numbers are to this very food. Missing, like "unknown", reads as Chưa rõ nguồn: never as exact. */
  match?: FoodMatch;
  /** Where the numbers come from: the database, the id of the original food there and a link to it. */
  sourceRef?: FoodSourceRef;
  /** A dish made from ingredients (grams of each, the cooked weight): its food page offers "Tùy chỉnh thành món của tôi". */
  recipe?: FoodRecipe;
  /** cc-53b: whether the numbers are for the food raw or cooked, when the name does not say (lib/yield ownCookState) */
  cookState?: "raw" | "cooked";
}

export interface FoodRecipe {
  ingredients: Array<{ foodId: string; name: string; grams: number }>;
  /** Weight of the whole pot after cooking, when known */
  cookedGrams: number | null;
}

/**
 * exact: this food. close: the same food, cooked or made another way. proxy: a similar food stands in for it.
 * unknown: nobody has checked yet, so no claim is made.
 */
export type FoodMatch = "exact" | "close" | "proxy" | "unknown";

export interface FoodSourceRef {
  db: string;
  id: string;
  url?: string;
  /** True only once someone has opened the source and confirmed it is this food. Every ref starts false. */
  verified?: boolean;
}

// A serving by weight or volume stays ("100 g", "3 oz", "200 ml"); a count ("1 quả", "1 chén") goes
const BY_WEIGHT = /^[\d.,/ ]+\s*(?:g|kg|oz|ml|l)(?=$|[\s(])/i;

/**
 * cc-67 (Hao 19/10): fruit goes by grams of the edible part, so no trái, quả, múi or chén serving stays (the numbers are per
 * 100 g of flesh already). The other foods with a peel, shell or bone lose theirs in the database
 * (docs/data/edible-part-portions-2026-10-19.json, scripts/edible-part.ts).
 */
export function weighedFruit<T extends { category?: string; servings: FoodServing[] }>(food: T): T {
  if (food.category !== "trai_cay") return food;
  const kept = food.servings.filter((s) => BY_WEIGHT.test(s.label));
  if (kept.length === food.servings.length) return food;
  return { ...food, servings: kept.length > 0 ? kept : [{ label: "100 g", grams: 100 }] };
}

// perf/live-bundle: the list is worked out once per catalogue change and shared by every screen that reads it
// (it was filtered, then copied, once per hook). Callers read it and never change it in place.
let browsable: { version: number; size: number; demo: boolean; live: boolean; hidden: ReadonlySet<string>; foods: FoodItem[] } | null = null;

/**
 * The catalogue as lists and search read it. Foods that only exist for the demo day are left out unless demo mode
 * is on. Look-ups by id (a saved entry, a recent, a favourite) use catalogFoodById and still find them. The same
 * array until the catalogue changes: read it, never change it.
 */
export function browsableFoods(): FoodItem[] {
  const demo = demoActive();
  const live = isLiveMode();
  const b = browsable;
  if (b && b.version === catalogVersionNumber && b.size === CATALOG_FOODS.length && b.demo === demo && b.live === live && b.hidden === hiddenFoodIds) {
    return b.foods;
  }
  const foods = listBrowsable(demo, live);
  browsable = { version: catalogVersionNumber, size: CATALOG_FOODS.length, demo, live, hidden: hiddenFoodIds, foods };
  return foods;
}

function listBrowsable(demo: boolean, live: boolean): FoodItem[] {
  // Live mode lists the database's foods (and the user's own) only: the sample foods never mix in, not even before
  // the database catalogue has arrived. A recipe's server food is listed as the recipe, never a second time. A dish
  // the user changed for one meal (cc-67) is a one-off recipe: its local and server food ids are hidden. Another device has
  // no recipe record of it, so a server food named "… · đã chỉnh" is hidden too, unless this device made it as the user's
  // own food (then it lists).
  const listed = (f: FoodItem) => !hiddenFoodIds.has(f.id) && !(f.nameVi.endsWith(EDITED_DISH_SUFFIX) && !madeHere.has(f.id));
  if (live) return CATALOG_FOODS.filter((f) => !SAMPLE_FOOD_IDS.has(f.id) && listed(f));
  return (demo ? CATALOG_FOODS : CATALOG_FOODS.filter((f) => !f.demoOnly)).filter(listed);
}

/** The name of a premade dish whose parts were changed for one meal: "Phở bò · đã chỉnh" (lib/dish-recipes). */
export const EDITED_DISH_SUFFIX = " · đã chỉnh";

let hiddenFoodIds: ReadonlySet<string> = new Set();
/** The foods this device made through "Tạo món" in this session: the user's own, whatever their name */
const madeHere = new Set<string>();

/** The server foods that hold a recipe's totals (lib/recipe-store): left out of the lists, still found by id. */
export function setHiddenFoodIds(ids: Iterable<string>): void {
  hiddenFoodIds = new Set(ids);
}

const isOwnFood = (f: FoodItem) => f.source === "user" || f.category === "cua_toi";

// A tiny store, so a screen re-renders when the catalogue changes (the live load arrives, a food or recipe is made).
// useCatalogFoods (hooks) reads it with useSyncExternalStore.
export type CatalogStatus = "idle" | "loading" | "ready" | "failed";

let catalogVersionNumber = 0;
let catalogStatusValue: CatalogStatus = "idle";
const catalogListeners = new Set<() => void>();

export const catalogVersion = (): number => catalogVersionNumber;
export const catalogStatus = (): CatalogStatus => catalogStatusValue;

export function subscribeCatalog(listener: () => void): () => void {
  catalogListeners.add(listener);
  return () => {
    catalogListeners.delete(listener);
  };
}

/** The catalogue changed: call after anything that adds to, replaces or removes from CATALOG_FOODS. */
export function catalogChanged(): void {
  catalogVersionNumber++;
  for (const listener of Array.from(catalogListeners)) listener();
}

/** Where the live load stands. Only a change is announced. */
export function setCatalogStatus(next: CatalogStatus): void {
  if (next === catalogStatusValue) return;
  catalogStatusValue = next;
  catalogChanged();
}

// perf/live-bundle: id → index into CATALOG_FOODS, so a look-up is O(1) instead of a scan per entry (Hôm nay, the
// diary edits and the day history look up every entry). Rebuilt when the catalogue version or its length changes;
// a found index is checked against the array, so an in-place change that announced nothing is caught too.
let byId: { version: number; size: number; index: Map<string, number> } | null = null;

function indexById(): Map<string, number> {
  const index = new Map<string, number>();
  // The first food with an id wins, as Array.find did
  CATALOG_FOODS.forEach((f, i) => {
    if (!index.has(f.id)) index.set(f.id, i);
  });
  byId = { version: catalogVersionNumber, size: CATALOG_FOODS.length, index };
  return index;
}

/** A food of the catalogue in use by id: the sample foods, or in live mode the foods the database sent (setCatalogFoods merges into the same list). */
export function catalogFoodById(id: string | undefined | null): FoodItem | undefined {
  if (!id) return undefined;
  const fresh = byId && byId.version === catalogVersionNumber && byId.size === CATALOG_FOODS.length;
  const at = (fresh ? byId!.index : indexById()).get(id);
  const food = at === undefined ? undefined : CATALOG_FOODS[at];
  if (food?.id === id) return food;
  // Changed in place since the index was built: build it again once
  if (!fresh) return undefined;
  const again = indexById().get(id);
  return again === undefined ? undefined : CATALOG_FOODS[again];
}

/** A food made by the user (live mode): added to the catalogue that is there, which stays as it is. */
export function addCatalogFood(food: FoodItem): void {
  const at = CATALOG_FOODS.findIndex((f) => f.id === food.id);
  if (at >= 0) CATALOG_FOODS.splice(at, 1);
  madeHere.add(food.id);
  CATALOG_FOODS.unshift(food);
  catalogChanged();
}

/** Merges foods from the database into the catalogue: a food with the same id is replaced, every other food stays. */
export function setCatalogFoods(foods: FoodItem[]): void {
  if (!foods || foods.length === 0) return;
  const byId = new Map(CATALOG_FOODS.map((f) => [f.id, f]));
  for (const f of foods) byId.set(f.id, weighedFruit(f));
  CATALOG_FOODS.length = 0;
  CATALOG_FOODS.push(...byId.values());
  catalogChanged();
}

/**
 * Demo mode only (lib/dish-recipes): sample foods the demo catalogue lacks, added once when something needs them. They are
 * `demoOnly`, so lists and search show them in demo mode only; a food already in the catalogue is left as it is.
 */
export function addDemoFoods(foods: readonly FoodItem[]): void {
  const have = new Set(CATALOG_FOODS.map((f) => f.id));
  const fresh = foods.filter((f) => !have.has(f.id));
  if (fresh.length === 0) return;
  CATALOG_FOODS.push(...fresh.map(weighedFruit));
  catalogChanged();
}

/** Live mode: the built-in sample foods are not real foods, so only the user's own stay until /foods answers. */
export function dropMockCatalog(): void {
  const own = CATALOG_FOODS.filter(isOwnFood);
  CATALOG_FOODS.length = 0;
  CATALOG_FOODS.push(...own);
  catalogChanged();
}

/** The catalogue, changed in place (setCatalogFoods, addCatalogFood, the recipes): read it through browsableFoods or catalogFoodById. */
export const CATALOG_FOODS: FoodItem[] = SAMPLE_FOODS.map(weighedFruit);

/** The ids of the sample foods above, taken before the live mode drops them or a database catalogue arrives. */
const SAMPLE_FOOD_IDS: ReadonlySet<string> = new Set(CATALOG_FOODS.map((f) => f.id));

if (process.env.NEXT_PUBLIC_API_MODE === "live") dropMockCatalog();
