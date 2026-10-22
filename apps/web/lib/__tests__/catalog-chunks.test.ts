import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_CHUNK, addToCatalogCache, dropCatalogCache, readCatalogCache, writeCatalogCache } from "../catalog-cache";
import { idbRun, resetIdb } from "../idb";
import type { FoodItem } from "../mock/foods";
import { createFakeIdb, quotaError, type FakeIdb } from "./fake-idb";

// cc-68 (Part 5): a 3,000-food catalogue is kept in chunks, so reading or writing it is never one long task.

const food = (i: number): FoodItem => ({ id: `food-${i}`, nameVi: `Món ${i}`, servings: [{ label: "100 g", grams: 100 }], nutrients: { energy: i } }) as unknown as FoodItem;
const catalogue = (n: number) => Array.from({ length: n }, (_, i) => food(i));
const A = "a@x.vn";
let idb: FakeIdb;
const kvKeys = () => Array.from(idb.disk.get("h1t")!.stores.get("kv")!.data.keys()).filter((k) => k.startsWith("foods:"));

beforeEach(() => {
  idb = createFakeIdb();
  vi.stubGlobal("indexedDB", idb.factory);
  resetIdb();
});

describe("the catalogue copy in chunks", () => {
  it("3,000 foods come back in the same order, written as small records", async () => {
    const puts: number[] = [];
    idb.onPut((store, value) => {
      if (store === "kv" && Array.isArray(value)) puts.push(value.length);
    });
    await writeCatalogCache(A, catalogue(3000));
    expect(puts.length).toBe(Math.ceil(3000 / CATALOG_CHUNK));
    expect(Math.max(...puts)).toBeLessThanOrEqual(CATALOG_CHUNK);
    const back = await readCatalogCache(A);
    expect(back?.foods.map((f) => f.id)).toEqual(catalogue(3000).map((f) => f.id));
    expect(back?.foods[2999].nutrients).toEqual({ energy: 2999 });
  });

  it("a copy that did not finish is not read, and the copy before it stays", async () => {
    await writeCatalogCache(A, catalogue(300));
    idb.failWrites(quotaError(), 1);
    await writeCatalogCache(A, catalogue(2000));
    idb.fixDisk();
    expect((await readCatalogCache(A))?.foods).toHaveLength(300);
  });

  it("a new copy takes the place of the old one and leaves none of its chunks behind", async () => {
    await writeCatalogCache(A, catalogue(3000));
    await writeCatalogCache(A, catalogue(500));
    expect(kvKeys()).toHaveLength(1 + Math.ceil(500 / CATALOG_CHUNK));
    expect((await readCatalogCache(A))?.foods).toHaveLength(500);
  });

  it("a chunk that is missing makes the copy unusable (the catalogue loads again)", async () => {
    await writeCatalogCache(A, catalogue(600));
    const chunk = kvKeys().find((k) => k.endsWith(":2"))!;
    await idbRun("kv", "readwrite", (s) => s.delete(chunk));
    expect(await readCatalogCache(A)).toBeNull();
  });

  it("the older format (one record with every food) is still read", async () => {
    await idbRun("kv", "readwrite", (s) => s.put({ at: 5, foods: catalogue(40) }, `foods:${A}`));
    const back = await readCatalogCache(A);
    expect(back?.at).toBe(5);
    expect(back?.foods).toHaveLength(40);
  });

  it("a food just made goes first, keeps the copy's age, and a food with that id is not doubled", async () => {
    await writeCatalogCache(A, catalogue(400));
    const before = (await readCatalogCache(A))!.at;
    await addToCatalogCache(A, { ...food(7), nameVi: "Món ăn của tôi" });
    await addToCatalogCache(A, { ...food(9999), nameVi: "Mới" });
    const back = (await readCatalogCache(A))!;
    expect(back.at).toBe(before);
    expect(back.foods[0].id).toBe("food-9999");
    expect(back.foods.filter((f) => f.id === "food-7")).toHaveLength(1);
    expect(back.foods.find((f) => f.id === "food-7")?.nameVi).toBe("Món ăn của tôi");
    expect(back.foods).toHaveLength(401);
  });

  it("dropCatalogCache removes the copy and all its chunks", async () => {
    await writeCatalogCache(A, catalogue(1000));
    await dropCatalogCache(A);
    expect(kvKeys()).toEqual([]);
  });
});
