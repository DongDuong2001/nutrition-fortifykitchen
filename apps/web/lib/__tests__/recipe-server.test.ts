import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, syncOfflineOutbox } from "../api-client";
import { MOCK_FOODS, browsableFoods, catalogFoodById } from "../mock/foods";
import { RECIPES_KEY, RECIPE_NUTRIENT_KEYS, per100Nutrients, servingGrams, withServerFoods, type Recipe } from "../recipe";
import { catalogueLookup, readRecipes, saveRecipe, serverFoodIdOf, syncRecipeFoods, uploadPendingRecipes } from "../recipe-store";
import { OFFLINE_OUTBOX_KEY, keyedStorage } from "../storage-keys";

// hotfix/recipes-server: a dish made from ingredients reaches the server as a custom food, and its entries with it.

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
const B = "b@example.com";
const SERVER_1 = "33333333-3333-4333-8333-333333333333";
const SERVER_2 = "44444444-4444-4444-8444-444444444444";
const ENTRY = "55555555-5555-4555-8555-555555555555";
const EGG = "food-trung-ga";
const OATS = "food-yen-mach";
const TODAY = "2026-10-18";

const recipe = (id: string, over: Partial<Recipe> = {}): Recipe => ({
  id,
  name: "Cháo trứng",
  servings: 2,
  cookedGrams: null,
  createdAt: "2026-10-18T00:00:00.000Z",
  ingredients: [
    { foodId: EGG, name: "Trứng", grams: 100, unit: "g" },
    { foodId: OATS, name: "Yến mạch", grams: 50, unit: "g" },
  ],
  ...over,
});

interface Call {
  key: string;
  body: Record<string, any> | null;
}

/**
 * The API: POST /foods/custom answers with the next server id (or a status / "network"); everything else 2xx.
 * `hold` keeps the next /foods/custom answer until released.
 */
function server(foods: Array<string | number | "network">) {
  const calls: Call[] = [];
  let release: (() => void) | null = null;
  const state = { hold: false };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.replace("https://api.test/api/v1", "");
      const key = `${init?.method ?? "GET"} ${path}`;
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
      calls.push({ key, body });
      if (key === "POST /foods/custom") {
        if (state.hold) {
          state.hold = false;
          await new Promise<void>((resolve) => (release = resolve));
        }
        const answer = foods.length > 1 ? foods.shift()! : foods[0];
        if (answer === "network") throw new TypeError("Failed to fetch");
        if (typeof answer === "number") return new Response(JSON.stringify({ error: { message: "boom" } }), { status: answer });
        return new Response(JSON.stringify({ data: { id: answer, name_vi: body?.name_vi, category: "cua_toi", servings: [], per_100g_nutrients: {} } }), { status: 201 });
      }
      return new Response(JSON.stringify({ data: {} }), { status: 201 });
    })
  );
  return { calls, state, release: () => release?.() };
}

let local: Storage;
const signIn = (email: string) => local.setItem("h1t_auth_current_email", email);
const own = (email: string) => keyedStorage(local, false, email);
const outbox = (email: string) => JSON.parse(own(email).getItem(OFFLINE_OUTBOX_KEY) ?? "[]");
const created = (calls: Call[]) => calls.filter((c) => c.key === "POST /foods/custom");
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  local = memoryStorage();
  signIn(A);
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
});

afterEach(() => {
  syncRecipeFoods([]);
  for (const id of [SERVER_1, SERVER_2]) {
    const at = MOCK_FOODS.findIndex((f) => f.id === id);
    if (at >= 0) MOCK_FOODS.splice(at, 1);
  }
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("saving a recipe in live mode", () => {
  it("creates its server food: one phần of the serving's grams, values the server turns into the per-100 g ones, every tracked nutrient", async () => {
    const { calls } = server([SERVER_1]);
    const dish = recipe("recipe-1");
    expect(saveRecipe(dish)).toBe(true);
    await vi.waitFor(() => expect(readRecipes()[0].serverFoodId).toBe(SERVER_1));

    const [post] = created(calls);
    const body = post.body!;
    const grams = servingGrams(dish);
    expect(body.name_vi).toBe("Cháo trứng");
    expect(body.serving_unit).toBe("phần");
    expect(body.serving_size).toBe(grams);
    // What the server stores: value × 100 / serving_size (apps/api nutrition service), which must be the recipe's per 100 g
    const per100 = per100Nutrients(dish, catalogueLookup);
    const stored = (v: number | null) => (v === null ? null : Math.round(((v * 100) / body.serving_size) * 100) / 100);
    expect(stored(body.calories)).toBe(per100.energy);
    for (const k of ["protein", "carbs", "fat"]) expect(stored(body[k])).toBe(per100[k]);
    const microKeys = RECIPE_NUTRIENT_KEYS.filter((k) => !["energy", "protein", "carbs", "fat"].includes(k));
    expect(microKeys).toHaveLength(23);
    expect(Object.keys(body.micros).sort()).toEqual([...microKeys].sort());
    for (const k of microKeys) expect(stored(body.micros[k])).toBe(per100[k]);
    expect(body.micros.fiber).not.toBeUndefined();
  });

  it("logs the recipe's entries with its server food (a uuid), so the server takes them", async () => {
    const { calls } = server([SERVER_1]);
    saveRecipe(recipe("recipe-1"));
    await vi.waitFor(() => expect(serverFoodIdOf("recipe-1")).toBe(SERVER_1));
    const result = await apiClient.addEntry({ id: ENTRY, foodId: serverFoodIdOf("recipe-1"), grams: 75, mealSlot: "dinner", date: TODAY });
    expect(result.state).toBe("saved");
    expect(calls.find((c) => c.key === `POST /days/${TODAY}/entries`)?.body?.food_id).toBe(SERVER_1);
  });

  it("lists the recipe once: its server food is found by id but left out of the lists", async () => {
    server([SERVER_1]);
    saveRecipe(recipe("recipe-1"));
    await vi.waitFor(() => expect(readRecipes()[0].serverFoodId).toBe(SERVER_1));
    expect(catalogFoodById(SERVER_1)).toBeDefined();
    const listed = browsableFoods().map((f) => f.id);
    expect(listed).toContain("recipe-1");
    expect(listed).not.toContain(SERVER_1);
  });

  it("an edit creates a new server food and keeps the old one (past entries name it); saving unchanged makes none", async () => {
    const { calls } = server([SERVER_1, SERVER_2]);
    saveRecipe(recipe("recipe-1"));
    await vi.waitFor(() => expect(readRecipes()[0].serverFoodId).toBe(SERVER_1));
    saveRecipe(recipe("recipe-1"));
    await settle();
    expect(created(calls)).toHaveLength(1);

    saveRecipe(recipe("recipe-1", { ingredients: [{ foodId: EGG, name: "Trứng", grams: 150, unit: "g" }] }));
    await vi.waitFor(() => expect(readRecipes()[0].serverFoodId).toBe(SERVER_2));
    expect(readRecipes()[0].pastServerFoodIds).toEqual([SERVER_1]);
    expect(calls.some((c) => c.key.startsWith("DELETE"))).toBe(false);
    expect(browsableFoods().map((f) => f.id)).not.toContain(SERVER_1);
  });

  it("a food made for a version edited while the request was out is kept as a past one; the edit gets its own", async () => {
    const api = server([SERVER_1, SERVER_2]);
    api.state.hold = true;
    saveRecipe(recipe("recipe-1"));
    await vi.waitFor(() => expect(created(api.calls)).toHaveLength(1));
    saveRecipe(recipe("recipe-1", { name: "Cháo trứng (sửa)" }));
    api.release();
    await vi.waitFor(() => expect(readRecipes()[0].serverFoodId).toBe(SERVER_2));
    expect(readRecipes()[0].pastServerFoodIds).toEqual([SERVER_1]);
    expect(created(api.calls).map((c) => c.body?.name_vi)).toEqual(["Cháo trứng", "Cháo trứng (sửa)"]);
  });

  it("does not send a recipe whose ingredient is not in the catalogue yet (every value would be unknown)", async () => {
    const { calls } = server([SERVER_1]);
    saveRecipe(recipe("recipe-1", { ingredients: [{ foodId: "not-loaded", name: "?", grams: 100, unit: "g" }] }));
    await settle();
    expect(created(calls)).toHaveLength(0);
    expect(readRecipes()[0].serverFoodId).toBeUndefined();
  });
});

describe("app open: recipes made before this fix", () => {
  const seed = (email: string, recipes: Recipe[], queued: unknown[] = []) => {
    own(email).setItem(RECIPES_KEY, JSON.stringify(recipes));
    own(email).setItem(OFFLINE_OUTBOX_KEY, JSON.stringify(queued));
  };
  // An add refused with 400 "Invalid request body" because it named the local id
  const refusedAdd = {
    id: ENTRY,
    date: TODAY,
    payload: { id: ENTRY, kind: "food", meal_slot: "dinner", food_id: "recipe-1", grams: 75, serving_size_g: 75 },
    method: "POST",
    path: `/days/${TODAY}/entries`,
    key: `${ENTRY}:1:k`,
    createdAt: 1,
    retries: 1,
    held: { status: 400, message: "Invalid request body" },
  };

  it("creates each once, then the queued writes name the server food and are sent", async () => {
    const { calls } = server([SERVER_1]);
    seed(A, [recipe("recipe-1")], [refusedAdd]);
    // The app open's Thử lại run comes first: the write that names the local id waits, it is not refused again
    await syncOfflineOutbox({ retryHeld: true });
    expect(calls.filter((c) => c.key.startsWith("POST /days/"))).toEqual([]);
    await uploadPendingRecipes(A);
    await syncOfflineOutbox();
    expect(readRecipes(A)[0].serverFoodId).toBe(SERVER_1);
    const sent = calls.filter((c) => c.key === `POST /days/${TODAY}/entries`);
    expect(sent.map((c) => c.body?.food_id)).toEqual([SERVER_1]);
    expect(outbox(A)).toEqual([]);

    await uploadPendingRecipes(A);
    expect(created(calls)).toHaveLength(1);
  });

  it("points the device-only entries (Chỉ trên máy này) at the server food; quick entries and other foods stay", () => {
    const recipes = [recipe("recipe-1", { serverFoodId: SERVER_1 }), recipe("recipe-2")];
    const entries = [
      { id: "e1", foodId: "recipe-1" },
      { id: "e2", foodId: "recipe-2" },
      { id: "e3", foodId: EGG },
      { id: "e4", foodId: "recipe-1", kind: "quick" },
    ];
    expect(withServerFoods(entries, recipes).map((e) => e.foodId)).toEqual([SERVER_1, "recipe-2", EGG, "recipe-1"]);
    const untouched = entries.slice(1, 3);
    expect(withServerFoods(untouched, recipes)).toBe(untouched);
  });

  it("a failed creation keeps the recipe on the device and its writes queued; the next open tries again", async () => {
    const { calls } = server([500, "network", SERVER_1]);
    seed(A, [recipe("recipe-1")], [refusedAdd]);
    await uploadPendingRecipes(A);
    expect(readRecipes(A)).toHaveLength(1);
    expect(readRecipes(A)[0].serverFoodId).toBeUndefined();
    expect(outbox(A)[0].payload.food_id).toBe("recipe-1");

    await uploadPendingRecipes(A);
    expect(readRecipes(A)[0].serverFoodId).toBeUndefined();

    await uploadPendingRecipes(A);
    await syncOfflineOutbox();
    expect(readRecipes(A)[0].serverFoodId).toBe(SERVER_1);
    expect(created(calls)).toHaveLength(3);
    expect(outbox(A)).toEqual([]);
  });

  it("stays with the account it started for when another one signs in meanwhile", async () => {
    const api = server([SERVER_1]);
    api.state.hold = true;
    seed(A, [recipe("recipe-1"), recipe("recipe-2", { name: "Món hai" })], [refusedAdd]);
    seed(B, [recipe("recipe-1", { name: "Món của B" })]);
    const run = uploadPendingRecipes(A);
    await vi.waitFor(() => expect(created(api.calls)).toHaveLength(1));
    signIn(B);
    api.release();
    await run;

    // A's recipe has the food made with A's session, A's queued write names it; nothing of B changed
    expect(readRecipes(A).find((r) => r.id === "recipe-1")?.serverFoodId).toBe(SERVER_1);
    expect(outbox(A)[0].payload.food_id).toBe(SERVER_1);
    expect(readRecipes(B)[0].serverFoodId).toBeUndefined();
    expect(outbox(B)).toEqual([]);
    // A's second recipe and A's queued write wait for A's next open: nothing goes out under B's session
    expect(readRecipes(A).find((r) => r.id === "recipe-2")?.serverFoodId).toBeUndefined();
    expect(created(api.calls)).toHaveLength(1);
    expect(api.calls.some((c) => c.key.startsWith("POST /days/"))).toBe(false);
  });
});

describe("apiClient.createFood (Tự nhập too)", () => {
  it("live: sends the whole micros map", async () => {
    const { calls } = server([SERVER_1]);
    await apiClient.createFood({ nameVi: "Bánh", servingUnit: "g", servingSize: 50, calories: 200, micros: { zinc: 1.2, b12: null, sodium: 300 } });
    expect(created(calls)[0].body?.micros).toEqual({ zinc: 1.2, b12: null, sodium: 300 });
    MOCK_FOODS.splice(MOCK_FOODS.findIndex((f) => f.id === SERVER_1), 1);
  });

  it("mock: keeps every micro it is given, per 100 g", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "mock");
    const food = await apiClient.createFood({ nameVi: "Bánh", servingUnit: "g", servingSize: 50, calories: 200, micros: { zinc: 1.2, b12: null } });
    expect(food.nutrients).toMatchObject({ energy: 400, zinc: 2.4, b12: null });
    MOCK_FOODS.splice(MOCK_FOODS.indexOf(food), 1);
  });
});
