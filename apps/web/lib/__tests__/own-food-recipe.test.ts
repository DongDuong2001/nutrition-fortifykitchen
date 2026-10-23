import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSyncEngine, outboxItems } from "../api-client";
import { MOCK_FOODS, browsableFoods, catalogFoodById } from "../mock/foods";
import { RECIPES_KEY, type Recipe } from "../recipe";
import { keyedStorage } from "../storage-keys";
import { deleteRecipe, readRecipes, restoreRecipe, syncRecipeFoods } from "../recipe-store";
import { OWN_FOOD_UNDO_MS } from "../own-foods";

// Job C: Xoá món on a dish made from ingredients (recipe-store: device only, plus a hidden server food per version in live mode).

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

const SERVER_NOW = "33333333-3333-4333-8333-333333333333";
const SERVER_OLD = "44444444-4444-4444-8444-444444444444";
const dish = (over: Partial<Recipe> = {}): Recipe => ({
  id: "recipe-1",
  name: "Cháo trứng",
  servings: 2,
  cookedGrams: null,
  createdAt: "2026-10-18T00:00:00.000Z",
  ingredients: [{ foodId: "food-trung-ga", name: "Trứng", grams: 100, unit: "g" }],
  ...over,
});

let calls: string[] = [];
let local: Storage;
/** A dish as the device holds it once the server has made its food (saveRecipe itself starts a version without one) */
const seed = (...recipes: Recipe[]) => {
  keyedStorage(local, false, "recipe@example.com").setItem(RECIPES_KEY, JSON.stringify(recipes));
  syncRecipeFoods(readRecipes());
};
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  local = memoryStorage();
  local.setItem("h1t_auth_current_email", "recipe@example.com");
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${String(url).replace("https://api.test/api/v1", "")}`);
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    })
  );
  await loadSyncEngine();
});
afterEach(() => {
  syncRecipeFoods([]);
  for (const id of [SERVER_NOW, SERVER_OLD]) {
    const at = MOCK_FOODS.findIndex((f) => f.id === id);
    if (at >= 0) MOCK_FOODS.splice(at, 1);
  }
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("deleteRecipe / restoreRecipe", () => {
  it("takes the dish out of this device and the lists at once, and hands it back for Hoàn tác", () => {
    seed(dish());
    expect(browsableFoods().some((f) => f.id === "recipe-1")).toBe(true);
    const gone = deleteRecipe("recipe-1");
    expect(gone?.recipe.name).toBe("Cháo trứng");
    expect(readRecipes()).toEqual([]);
    expect(catalogFoodById("recipe-1")).toBeUndefined();
    expect(browsableFoods().some((f) => f.id === "recipe-1")).toBe(false);
  });

  it("Hoàn tác puts the same dish back", async () => {
    seed(dish());
    const gone = deleteRecipe("recipe-1")!;
    await restoreRecipe(gone);
    expect(readRecipes().map((r) => r.id)).toEqual(["recipe-1"]);
    expect(browsableFoods().some((f) => f.id === "recipe-1")).toBe(true);
  });

  it("nothing to delete: null", () => {
    expect(deleteRecipe("recipe-404")).toBeNull();
  });

  it("deletes its server foods too (this version and the earlier ones) after the undo window, out of the lists meanwhile", async () => {
    seed(dish({ serverFoodId: SERVER_NOW, pastServerFoodIds: [SERVER_OLD] }));
    deleteRecipe("recipe-1");
    await vi.advanceTimersByTimeAsync(10);
    expect(outboxItems().map((i) => i.path).sort()).toEqual([`/foods/custom/${SERVER_NOW}`, `/foods/custom/${SERVER_OLD}`]);
    expect(calls.filter((c) => c.startsWith("DELETE"))).toEqual([]);
    await vi.advanceTimersByTimeAsync(OWN_FOOD_UNDO_MS + 1000);
    expect(calls.filter((c) => c.startsWith("DELETE")).sort()).toEqual([`DELETE /foods/custom/${SERVER_NOW}`, `DELETE /foods/custom/${SERVER_OLD}`]);
  });

  it("Hoàn tác inside the window takes the server deletes back: nothing is sent", async () => {
    seed(dish({ serverFoodId: SERVER_NOW, pastServerFoodIds: [SERVER_OLD] }));
    const gone = deleteRecipe("recipe-1")!;
    await vi.advanceTimersByTimeAsync(3000);
    await restoreRecipe(gone);
    await vi.advanceTimersByTimeAsync(OWN_FOOD_UNDO_MS * 3);
    expect(calls.filter((c) => c.startsWith("DELETE"))).toEqual([]);
    expect(outboxItems()).toEqual([]);
    expect(readRecipes()[0].serverFoodId).toBe(SERVER_NOW);
  });
});
