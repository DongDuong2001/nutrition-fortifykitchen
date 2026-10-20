import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api-client";
import * as cache from "../catalog-cache";
import { MOCK_FOODS, browsableFoods } from "../mock/foods";
import { resetIdb } from "../idb";
import { searchFoods } from "../search";
import { createFakeIdb, quotaError } from "./fake-idb";

// cc-65: a live-size catalogue. 3,000 generated foods from a server that pages them 50 at a time (60 pages): a page that
// fails during a background refresh never swaps the device's copy for a partial list, a full IndexedDB (quota) does not
// break the load, and a search over the 3,000 foods is timed and reported.

const SAMPLE = MOCK_FOODS.slice();
const TOTAL = 3000;
const NAMES = ["Cơm tấm", "Phở bò", "Bánh mì", "Bún chả", "Gỏi cuốn", "Cháo gà", "Xôi đậu", "Canh chua", "Cá kho", "Đậu phụ"];
const row = (i: number) => ({ id: `db-${i}`, name_vi: `${NAMES[i % NAMES.length]} ${i}`, category: "khac", source: "USDA", nutrients: { energy: 100 + (i % 400) } });
const ROWS = Array.from({ length: TOTAL }, (_, i) => row(i));

function foodsServer(fail?: (page: number) => boolean, cap = 50) {
  const pages: number[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const params = new URL(url).searchParams;
      const page = Number(params.get("page") ?? "1");
      const limit = Math.min(Number(params.get("limit") ?? "50"), cap);
      pages.push(page);
      if (fail?.(page)) return new Response("boom", { status: 500 });
      const items = ROWS.slice((page - 1) * limit, page * limit);
      return new Response(JSON.stringify({ data: { items, total: TOTAL } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
  return pages;
}

const savedCopy = (ageMs: number) => ({
  at: Date.now() - ageMs,
  foods: [row(9000), row(9001)].map((r) => ({ id: r.id, nameVi: r.name_vi, category: "khac", source: "USDA", servings: [{ label: "100 g", grams: 100 }], nutrients: r.nutrients })),
});

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  MOCK_FOODS.length = 0;
  MOCK_FOODS.push(...SAMPLE);
});

describe("a 3,000-food catalogue over 60 pages", () => {
  it("one request from an API that pages by 5,000 (overnight 20/10, no search query)", async () => {
    vi.spyOn(cache, "readCatalogCache").mockResolvedValue(null);
    const written = vi.spyOn(cache, "writeCatalogCache").mockResolvedValue();
    const pages = foodsServer(undefined, 5000);
    const foods = await apiClient.loadAllFoods();
    expect(pages).toEqual([1]);
    expect(foods).toHaveLength(TOTAL);
    await vi.waitFor(() => expect(written).toHaveBeenCalledTimes(1));
  });

  it("an API that still caps at 500: 6 pages, every food once (the old paging is the fallback)", async () => {
    vi.spyOn(cache, "readCatalogCache").mockResolvedValue(null);
    const written = vi.spyOn(cache, "writeCatalogCache").mockResolvedValue();
    const pages = foodsServer(undefined, 500);
    const foods = await apiClient.loadAllFoods();
    expect(new Set(pages).size).toBe(6);
    expect(foods).toHaveLength(TOTAL);
    expect(new Set(foods.map((f) => f.id)).size).toBe(TOTAL);
    await vi.waitFor(() => expect(written).toHaveBeenCalledTimes(1));
    expect(written.mock.calls[0][1]).toHaveLength(TOTAL);
  });

  it("a server that pages by 50: all 60 pages load now (the cap was 30 pages, 1,500 foods)", async () => {
    vi.spyOn(cache, "readCatalogCache").mockResolvedValue(null);
    const written = vi.spyOn(cache, "writeCatalogCache").mockResolvedValue();
    const pages = foodsServer();
    const foods = await apiClient.loadAllFoods();
    expect(Math.max(...pages)).toBe(60);
    expect(foods).toHaveLength(TOTAL);
    await vi.waitFor(() => expect(written).toHaveBeenCalledTimes(1));
  });

  it("page 17 fails during a background refresh: the copy stays on screen and in the cache, nothing partial is written", async () => {
    vi.spyOn(cache, "readCatalogCache").mockResolvedValue(savedCopy(11 * 60_000) as never);
    const written = vi.spyOn(cache, "writeCatalogCache").mockResolvedValue();
    const pages = foodsServer((page) => page === 17);
    const foods = await apiClient.loadAllFoods();
    expect(foods.map((f) => f.id)).toEqual(["db-9000", "db-9001"]);
    await vi.waitFor(() => expect(pages).toContain(17));
    await new Promise((r) => setTimeout(r, 50));
    expect(written).not.toHaveBeenCalled();
    expect(browsableFoods().map((f) => f.id)).toEqual(["db-9000", "db-9001"]);
  });

  it("a full IndexedDB (quota exceeded) does not break the load: the foods are still there, no copy is kept", async () => {
    const idb = createFakeIdb();
    vi.stubGlobal("indexedDB", idb.factory);
    resetIdb();
    idb.failWrites(quotaError(), 1000);
    const written = vi.spyOn(cache, "writeCatalogCache");
    foodsServer(undefined, 500);
    const foods = await apiClient.loadAllFoods();
    expect(foods).toHaveLength(TOTAL);
    await vi.waitFor(() => expect(written).toHaveBeenCalled());
    await written.mock.results[0].value;
    expect(browsableFoods()).toHaveLength(TOTAL);
    expect(await cache.readCatalogCache(null)).toBeNull();
    resetIdb();
  });

  it("search over the 3,000 foods: time reported, inside a frame budget", async () => {
    vi.spyOn(cache, "readCatalogCache").mockResolvedValue(null);
    vi.spyOn(cache, "writeCatalogCache").mockResolvedValue();
    foodsServer(undefined, 500);
    const foods = await apiClient.loadAllFoods();
    searchFoods(foods, "pho"); // the first call builds the folded names
    const queries = ["pho bo", "com", "banh mi 12", "đậu", "canh chua 99", "xyz"];
    const started = performance.now();
    for (const q of queries) searchFoods(foods, q);
    const perQuery = (performance.now() - started) / queries.length;
    console.info(`search over ${foods.length} foods: ${perQuery.toFixed(2)} ms per query`);
    expect(searchFoods(foods, "pho bo")[0]?.nameVi).toMatch(/^Phở bò/);
    expect(perQuery).toBeLessThan(16);
  });
});
