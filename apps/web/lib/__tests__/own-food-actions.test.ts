import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSyncEngine, outboxItems } from "../api-client";
import { CATALOG_FOODS, browsableFoods, catalogFoodById, putBackCatalogFood, setCatalogFoods, type FoodItem } from "../catalog";
import { deleteOwnFood } from "../own-food-actions";
import { apiClient } from "../api-client";
import { OWN_FOOD_HOLD_MS, OWN_FOOD_UNDO_MS } from "../own-foods";

vi.mock("../cue", () => ({ cue: vi.fn() }));
const { cue } = await import("../cue");

// Job C: what one Xóa món does end to end, and what its Hoàn tác undoes.

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

const ID = "12121212-1212-4212-8212-121212121212";
const mine = { id: ID, nameVi: "Chè đậu xanh", category: "cua_toi", source: "user", servings: [{ label: "200 g", grams: 200 }], nutrients: { energy: 120 } } as FoodItem;
let calls: string[] = [];
let toasts: Array<{ message: string; undo: () => void }> = [];
const notifyUndo = (message: string, undo: () => void) => toasts.push({ message, undo });
let notices: string[] = [];
const notify = (message: string) => void notices.push(message);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  const local = memoryStorage();
  local.setItem("h1t_auth_current_email", "actions@example.com");
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage(), location: { search: "", pathname: "/app" } });
  calls = [];
  toasts = [];
  notices = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${String(url).replace("https://api.test/api/v1", "")}`);
    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  }));
  await loadSyncEngine();
  setCatalogFoods([mine]);
});
afterEach(() => {
  putBackCatalogFood(mine);
  const at = CATALOG_FOODS.findIndex((f) => f.id === ID);
  if (at >= 0) CATALOG_FOODS.splice(at, 1);
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("deleteOwnFood sounds (feat/sound-goals)", () => {
  it("Xóa món plays the remove cue, its Hoàn tác the undo cue", () => {
    vi.mocked(cue).mockClear();
    deleteOwnFood(mine, notifyUndo, notify);
    expect(vi.mocked(cue).mock.calls).toEqual([["remove"]]);
    toasts[0].undo();
    expect(vi.mocked(cue).mock.calls).toEqual([["remove"], ["undo"]]);
  });
  it("a delete that did nothing (the food is not there) is silent", () => {
    deleteOwnFood(mine, notifyUndo, notify);
    vi.mocked(cue).mockClear();
    expect(deleteOwnFood(mine, notifyUndo, notify)).toBe(false);
    expect(cue).not.toHaveBeenCalled();
  });
});

describe("deleteOwnFood", () => {
  it("the food is gone at once and one toast says Đã xóa <món> with its Hoàn tác; nothing is sent yet", async () => {
    expect(deleteOwnFood(mine, notifyUndo, notify)).toBe(true);
    expect(catalogFoodById(ID)).toBeUndefined();
    expect(browsableFoods().some((f) => f.id === ID)).toBe(false);
    expect(toasts.map((t) => t.message)).toEqual(["Đã xóa Chè đậu xanh"]);
    await vi.advanceTimersByTimeAsync(100);
    expect(calls).toEqual([]);
    expect(outboxItems().map((i) => i.path)).toEqual([`/foods/custom/${ID}`]);
  });

  it("the DELETE goes out when the window is over", async () => {
    deleteOwnFood(mine, notifyUndo, notify);
    await vi.advanceTimersByTimeAsync(OWN_FOOD_HOLD_MS + 1000);
    expect(calls).toEqual([`DELETE /foods/custom/${ID}`]);
  });

  it("the DELETE is held 1,5 s past the toast, so a Hoàn tác in the last moment still finds it in the outbox", async () => {
    expect(OWN_FOOD_HOLD_MS).toBe(OWN_FOOD_UNDO_MS + 1500);
    deleteOwnFood(mine, notifyUndo, notify);
    await vi.advanceTimersByTimeAsync(OWN_FOOD_UNDO_MS + 1000);
    expect(calls).toEqual([]);
    toasts[0].undo();
    await vi.advanceTimersByTimeAsync(OWN_FOOD_HOLD_MS * 2);
    expect(calls).toEqual([]);
    expect(catalogFoodById(ID)?.nameVi).toBe("Chè đậu xanh");
    expect(notices).toEqual([]);
  });

  it("a Hoàn tác after the DELETE has gone does not bring the food back: it stays out and a toast says Món đã xóa rồi", async () => {
    deleteOwnFood(mine, notifyUndo, notify);
    await vi.advanceTimersByTimeAsync(OWN_FOOD_HOLD_MS + 1000);
    expect(calls).toEqual([`DELETE /foods/custom/${ID}`]);
    toasts[0].undo();
    await vi.advanceTimersByTimeAsync(500);
    expect(catalogFoodById(ID)).toBeUndefined();
    expect(browsableFoods().some((f) => f.id === ID)).toBe(false);
    expect(notices).toEqual(["Món đã xóa rồi"]);
  });

  it("Hoàn tác puts the food back everywhere and nothing is ever sent", async () => {
    deleteOwnFood(mine, notifyUndo, notify);
    await vi.advanceTimersByTimeAsync(2000);
    toasts[0].undo();
    await vi.advanceTimersByTimeAsync(OWN_FOOD_UNDO_MS * 2);
    expect(catalogFoodById(ID)?.nameVi).toBe("Chè đậu xanh");
    expect(browsableFoods().some((f) => f.id === ID)).toBe(true);
    expect(calls).toEqual([]);
    expect(outboxItems()).toEqual([]);
  });

  it("a food that is not in the catalogue is left alone: no toast, no write", () => {
    expect(deleteOwnFood({ ...mine, id: "34343434-3434-4434-8434-343434343434" }, notifyUndo, notify)).toBe(false);
    expect(toasts).toEqual([]);
  });
});

describe("Sửa món when the server refuses (review 24/10)", () => {
  const input = { nameVi: "Chè", servingUnit: "g" as const, servingSize: 100, calories: 100, protein: null, carbs: null, fat: null, micros: {} };

  it.each([405, 404, 500])("a %i is told without a status code: Chưa sửa được món. Thử lại sau nhé.", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status })));
    await expect(apiClient.updateFood(ID, input)).rejects.toThrow("Chưa sửa được món. Thử lại sau nhé.");
  });

  it("no answer at all keeps its own line", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("offline");
    }));
    await expect(apiClient.updateFood(ID, input)).rejects.toThrow("Lỗi kết nối khi sửa món. Vui lòng thử lại.");
  });
});
