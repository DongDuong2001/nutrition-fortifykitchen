import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api-client";
import { entryNumbers } from "../diary-edits";
import { DISH_DEMO_FOODS } from "../mock/dish-demo-foods";
import { EDITED_DISH_SUFFIX, MOCK_FOODS, addCatalogFood, addDemoFoods, browsableFoods, catalogFoodById, type FoodItem } from "../mock/foods";
import { dishViewOf, editParts, editTotals, foodsByKey, saveEditedDish, type DishRecipes } from "../dish-recipes";
import { isLocalOnly } from "../sync-notice";
import { readRecipes, serverFoodIdOf, syncRecipeFoods, uploadPendingRecipes } from "../recipe-store";
import { calculateMacroPreview } from "../portion";
import { withServerFoods } from "../recipe";
import { isOwnFood } from "../food-categories";
import recipesJson from "../data/dish-recipes.slim.json";
import { keyedStorage } from "../storage-keys";

// cc-67 part 3: a premade dish whose parts were changed for one meal is logged as ONE entry of a food made for it

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, String(value)),
  } as Storage;
}

const A = "a@example.com";
const SERVER = "66666666-6666-4666-8666-666666666666";
const recipes = recipesJson as unknown as DishRecipes;
const phoBo = MOCK_FOODS.find((f) => f.id === "food-pho-bo") as FoodItem;

addDemoFoods(DISH_DEMO_FOODS);
const view = dishViewOf(phoBo, recipes, foodsByKey(MOCK_FOODS));
if (!view) throw new Error("no Phở bò view");
const BANH = view.parts[0].key;

/** Bánh phở 200 → 150 g and + Thịt bò, for one bowl */
const edited = () => editTotals(editParts(view, { [BANH]: 150 }, ["+ Thịt bò"]), 1);
const kcalOfParts = (t: ReturnType<typeof edited>) => Math.round(t.ingredients.reduce((sum, i) => sum + (calculateMacroPreview(catalogFoodById(i.foodId)!.nutrients, i.grams).calories ?? 0), 0));

let local: Storage;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  local = memoryStorage();
  local.setItem("h1t_demo_v1", "1");
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/add" } });
  syncRecipeFoods([]);
});

afterEach(() => {
  syncRecipeFoods([]);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the one-off food of a changed dish", () => {
  it("is named after the dish, marked đã chỉnh, and is the parts added up", () => {
    const totals = edited();
    const food = saveEditedDish(phoBo, totals.ingredients);
    expect(food?.nameVi).toBe(`Phở bò${EDITED_DISH_SUFFIX}`);
    expect(food?.nameVi).toBe("Phở bò · đã chỉnh");
    // Bánh phở 150 g, 7 more parts, and 50 g of Thịt bò: the weight and the kcal of the parts
    expect(totals.grams).toBe(600 - 50 + 50);
    const entry = entryNumbers(food!, totals.grams);
    expect(entry.calories).toBe(kcalOfParts(totals));
  });

  it("logs as one row: one food, the dish's grams are the parts' grams", () => {
    const totals = edited();
    const food = saveEditedDish(phoBo, totals.ingredients)!;
    // One entry = one (food, grams): per-100 g × grams is the whole edited dish, not the dish plus its changes
    const whole = entryNumbers(food, totals.grams);
    const plain = entryNumbers(phoBo, 600);
    expect(whole.calories).not.toBe(plain.calories);
    expect(readRecipes().filter((r) => r.oneOff)).toHaveLength(1);
  });

  it("is found by id (a diary row, a recent) and listed nowhere: not in a list, not in Món của tôi", () => {
    const food = saveEditedDish(phoBo, edited().ingredients)!;
    expect(catalogFoodById(food.id)).toBeDefined();
    expect(browsableFoods().map((f) => f.id)).not.toContain(food.id);
    expect(browsableFoods().filter(isOwnFood).map((f) => f.nameVi)).not.toContain(food.nameVi);
  });

  it("is hidden by the recipe's one-off flag and its server food id first; a food this device made as the user's own with that name still lists", () => {
    const food = saveEditedDish(phoBo, edited().ingredients)!;
    const server: FoodItem = { ...food, id: SERVER };
    const mine: FoodItem = { ...food, id: "55555555-5555-4555-8555-555555555555", nameVi: `Phở bò${EDITED_DISH_SUFFIX}`, source: "user", category: "cua_toi" };
    addCatalogFood(mine);
    syncRecipeFoods(readRecipes().map((r) => (r.id === food.id ? { ...r, serverFoodId: SERVER } : r)));
    MOCK_FOODS.push(server);
    const listed = browsableFoods().map((f) => f.id);
    expect(listed).not.toContain(SERVER);
    expect(listed).not.toContain(food.id);
    expect(listed).toContain(mine.id);
    expect(browsableFoods().filter(isOwnFood).map((f) => f.id)).toContain(mine.id);
    MOCK_FOODS.splice(MOCK_FOODS.indexOf(server), 1);
    MOCK_FOODS.splice(MOCK_FOODS.indexOf(mine), 1);
  });

  it("another device has no recipe record: the server food named · đã chỉnh is hidden by its name, the same food made elsewhere as a plain name is not", () => {
    const food = saveEditedDish(phoBo, edited().ingredients)!;
    syncRecipeFoods([]);
    const server: FoodItem = { ...food, id: SERVER, source: "user", category: "cua_toi" };
    const plain: FoodItem = { ...server, id: "44444444-4444-4444-8444-444444444444", nameVi: "Phở bò nhà làm" };
    MOCK_FOODS.push(server, plain);
    const listed = browsableFoods().map((f) => f.id);
    expect(listed).not.toContain(SERVER);
    expect(listed).toContain(plain.id);
    MOCK_FOODS.splice(MOCK_FOODS.indexOf(server), 1);
    MOCK_FOODS.splice(MOCK_FOODS.indexOf(plain), 1);
  });

  it("the same change twice is one food", () => {
    const first = saveEditedDish(phoBo, edited().ingredients)!;
    const second = saveEditedDish(phoBo, edited().ingredients)!;
    expect(second.id).toBe(first.id);
    expect(readRecipes().filter((r) => r.oneOff)).toHaveLength(1);
    // Another change is another food
    const other = saveEditedDish(phoBo, editTotals(editParts(view, { [BANH]: 100 }, []), 1).ingredients)!;
    expect(other.id).not.toBe(first.id);
  });

  it("the same change after the app was opened again still has its numbers (the ingredients were not in the catalogue when it synced)", () => {
    const first = saveEditedDish(phoBo, edited().ingredients)!;
    // Opened again: the recipes are put in the catalogue before the ingredients of the dish are there
    const ingredients = edited().ingredients.map((i) => MOCK_FOODS.find((f) => f.id === i.foodId)!);
    for (const f of ingredients) MOCK_FOODS.splice(MOCK_FOODS.indexOf(f), 1);
    syncRecipeFoods();
    expect(catalogFoodById(first.id)?.nutrients.energy).toBeNull();
    MOCK_FOODS.push(...ingredients);
    const again = saveEditedDish(phoBo, edited().ingredients)!;
    expect(again.id).toBe(first.id);
    expect(typeof again.nutrients.energy).toBe("number");
  });

  it("a dish with nothing left to log is not saved; storage that refuses it says so", () => {
    expect(saveEditedDish(phoBo, [])).toBeNull();
    vi.stubGlobal("window", {
      localStorage: { ...local, getItem: (k: string) => (k === "h1t_demo_v1" ? "1" : null), setItem: () => { throw new Error("full"); } },
      sessionStorage: memoryStorage(),
      location: { search: "", pathname: "/add" },
    });
    expect(saveEditedDish(phoBo, edited().ingredients)).toBeNull();
  });
});

describe("offline: the entry waits on this device until the server has the food", () => {
  const own = (email: string) => keyedStorage(local, false, email);

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
    local.setItem("h1t_auth_current_email", A);
  });

  it("is a local-only entry while the food has no server row, then names the server food once it has one", async () => {
    let online = false;
    const posted: Array<Record<string, any>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (!online) throw new TypeError("Failed to fetch");
        const path = url.replace("https://api.test/api/v1", "");
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
        if (path === "/foods/custom") {
          posted.push(body);
          return new Response(JSON.stringify({ data: { id: SERVER, name_vi: body.name_vi, category: "cua_toi", servings: [], per_100g_nutrients: {} } }), { status: 201 });
        }
        return new Response(JSON.stringify({ data: {} }), { status: 201 });
      })
    );
    const food = saveEditedDish(phoBo, edited().ingredients)!;
    await settle();
    // Offline: the entry names the recipe's local id, which only this device knows
    const entry = { foodId: serverFoodIdOf(food.id), kind: "food" as const };
    expect(entry.foodId).toBe(food.id);
    expect(isLocalOnly(entry)).toBe(true);
    expect(own(A).getItem("h1t_recipes_v1")).toContain(food.id);

    // Online (the next app open): the food is created once, and the entry follows it
    online = true;
    await uploadPendingRecipes(A);
    await vi.waitFor(() => expect(readRecipes().find((r) => r.id === food.id)?.serverFoodId).toBe(SERVER));
    expect(posted).toHaveLength(1);
    expect(posted[0].name_vi).toBe("Phở bò · đã chỉnh");
    const [moved] = withServerFoods([{ foodId: food.id, kind: "food" as const }], readRecipes());
    expect(moved.foodId).toBe(SERVER);
    expect(isLocalOnly(moved)).toBe(false);
    await apiClient.addEntry({ id: "77777777-7777-4777-8777-777777777777", foodId: moved.foodId, grams: 600, mealSlot: "lunch", date: "2026-10-19" });
    // The server's copy is not listed either
    expect(browsableFoods().map((f) => f.id)).not.toContain(SERVER);
    expect(browsableFoods().map((f) => f.id)).not.toContain(food.id);
  });
});
