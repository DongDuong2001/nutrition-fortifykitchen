import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api-client";
import { MOCK_FOODS, browsableFoods } from "../mock/foods";
import * as cache from "../catalog-cache";

const SAMPLE_COUNT = MOCK_FOODS.length;
const SAMPLE = MOCK_FOODS.slice();

const row = (i: number) => ({ id: `db-${i}`, name_vi: `Món ${i}`, category: "khac", source: "USDA", nutrients: { energy: 100 + i } });

/** A /foods server with `total` rows that caps limit at `cap` (50 like the old API, 500 like the new one). */
function foodsServer(total: number, fail?: (page: number) => boolean, cap = 50) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (url: string) => {
    calls.push(url);
    const params = new URL(url).searchParams;
    const page = Number(params.get("page") ?? "1");
    const limit = Math.min(Number(params.get("limit") ?? "50"), cap);
    if (fail?.(page)) return new Response("boom", { status: 500 });
    const items = Array.from({ length: total }, (_, i) => row(i)).slice((page - 1) * limit, page * limit);
    return new Response(JSON.stringify({ data: { items, total } }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  MOCK_FOODS.length = 0;
  MOCK_FOODS.push(...SAMPLE);
});

describe("apiClient.loadAllFoods", () => {
  it("pages /foods until the total: 389 rows from a server that caps at 50 take 8 calls and one catalogue", async () => {
    const { calls } = foodsServer(389);
    const foods = await apiClient.loadAllFoods();
    expect(calls).toHaveLength(8);
    expect(calls[7]).toContain("page=8");
    expect(foods).toHaveLength(389);
    expect(new Set(foods.map((f) => f.id)).size).toBe(389);
    expect(browsableFoods()).toHaveLength(389);
  });

  it("asks for 500 at a time: a server with no cap answers 389 foods in one call", async () => {
    const { calls } = foodsServer(389, undefined, 500);
    const foods = await apiClient.loadAllFoods();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("limit=500");
    expect(calls[0]).toContain("page=1");
    expect(foods).toHaveLength(389);
  });

  it("keeps paging with the same limit while fewer than total are collected, even if the server caps at 50", async () => {
    const { calls } = foodsServer(389);
    await apiClient.loadAllFoods();
    expect(calls).toHaveLength(8);
    expect(calls.every((url) => url.includes("limit=500"))).toBe(true);
    expect(calls.map((url) => new URL(url).searchParams.get("page"))).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  it("two loads at once make one set of requests and share the result", async () => {
    const { calls } = foodsServer(389);
    const [a, b] = await Promise.all([apiClient.loadAllFoods(), apiClient.loadAllFoods()]);
    expect(calls).toHaveLength(8);
    expect(a).toBe(b);
  });

  it("a load after the first one has finished asks again", async () => {
    const { calls } = foodsServer(60);
    await apiClient.loadAllFoods();
    await apiClient.loadAllFoods();
    expect(calls).toHaveLength(4);
  });

  it("stops on an empty page when the server gives no total", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        const items = calls.length === 1 ? Array.from({ length: 70 }, (_, i) => row(i)) : [];
        return new Response(JSON.stringify({ data: { items } }), { status: 200 });
      })
    );
    const foods = await apiClient.loadAllFoods();
    expect(calls).toHaveLength(2);
    expect(foods).toHaveLength(70);
  });

  it("never asks for more than 30 pages", async () => {
    const { calls } = foodsServer(50 * 40);
    await apiClient.loadAllFoods();
    expect(calls).toHaveLength(30);
  });

  it("never mixes the sample foods into the live list", async () => {
    foodsServer(60);
    expect(SAMPLE_COUNT).toBeGreaterThan(0);
    await apiClient.loadAllFoods();
    expect(browsableFoods().some((f) => SAMPLE.some((s) => s.id === f.id))).toBe(false);
  });

  it("keeps what loaded when a later page fails, and the sample foods stay out", async () => {
    foodsServer(389, (page) => page === 4);
    const foods = await apiClient.loadAllFoods();
    expect(foods).toHaveLength(150);
    expect(browsableFoods()).toHaveLength(150);
  });

  it("throws when nothing loaded, leaving the catalogue without sample foods", async () => {
    foodsServer(389, () => true);
    await expect(apiClient.loadAllFoods()).rejects.toThrow();
    expect(browsableFoods().some((f) => SAMPLE.some((s) => s.id === f.id))).toBe(false);
  });
});

// cc-50: the device's copy of the catalogue (lib/catalog-cache), stubbed: IndexedDB does not exist under node
describe("apiClient.loadAllFoods with the device's copy", () => {
  const saved = (ageMs: number) => ({ at: Date.now() - ageMs, foods: [row(900), row(901)].map((r) => ({ id: r.id, nameVi: r.name_vi, category: "khac", source: "USDA", servings: [{ label: "100 g", grams: 100 }], nutrients: r.nutrients })) });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fresh (under 10 min): the copy is the catalogue, no request", async () => {
    vi.spyOn(cache, "readCatalogCache").mockResolvedValue(saved(60_000) as never);
    const { calls } = foodsServer(389);
    const foods = await apiClient.loadAllFoods();
    expect(foods.map((f) => f.id)).toEqual(["db-900", "db-901"]);
    expect(calls).toEqual([]);
  });

  it("stale (over 10 min): the copy shows at once, every page loads in the background and replaces it", async () => {
    vi.spyOn(cache, "readCatalogCache").mockResolvedValue(saved(11 * 60_000) as never);
    const written = vi.spyOn(cache, "writeCatalogCache").mockResolvedValue();
    const { calls } = foodsServer(60, undefined, 500);
    const foods = await apiClient.loadAllFoods();
    expect(foods.map((f) => f.id)).toEqual(["db-900", "db-901"]);
    await vi.waitFor(() => expect(written).toHaveBeenCalled());
    expect(calls).toHaveLength(1);
    expect(browsableFoods().some((f) => f.id === "db-59")).toBe(true);
    expect(written.mock.calls[0][1]).toHaveLength(60);
  });

  it("expired (over 24 h): loads first, then saves the new copy", async () => {
    vi.spyOn(cache, "readCatalogCache").mockResolvedValue(saved(25 * 3600_000) as never);
    const written = vi.spyOn(cache, "writeCatalogCache").mockResolvedValue();
    foodsServer(60, undefined, 500);
    const foods = await apiClient.loadAllFoods();
    expect(foods).toHaveLength(60);
    // The copy is written once the catalogue cache module has loaded (it is not part of the first-load JS)
    await vi.waitFor(() => expect(written).toHaveBeenCalledTimes(1));
  });

  it("cc-51: offline with an expired copy: the copy is used, search still has foods", async () => {
    vi.spyOn(cache, "readCatalogCache").mockResolvedValue(saved(30 * 3600_000) as never);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const foods = await apiClient.loadAllFoods();
    expect(foods.map((f) => f.id)).toEqual(["db-900", "db-901"]);
    expect(browsableFoods().some((f) => f.id === "db-901")).toBe(true);
  });

  it("a failed background refresh keeps the copy on screen", async () => {
    vi.spyOn(cache, "readCatalogCache").mockResolvedValue(saved(11 * 60_000) as never);
    const written = vi.spyOn(cache, "writeCatalogCache").mockResolvedValue();
    foodsServer(60, () => true);
    const foods = await apiClient.loadAllFoods();
    await new Promise((r) => setTimeout(r, 0));
    expect(foods.map((f) => f.id)).toEqual(["db-900", "db-901"]);
    expect(written).not.toHaveBeenCalled();
    expect(browsableFoods().some((f) => f.id === "db-900")).toBe(true);
  });
});
