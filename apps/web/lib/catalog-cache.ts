import type { FoodItem } from "./catalog";
import { idbBatch, idbRun } from "./idb";
import { yieldToMain } from "./idle";

/**
 * cc-50: the food catalogue on the device, so /app does not download every page of /foods on each load. One copy per
 * account (custom foods are per user) in IndexedDB. Fresh for 10 min (used as it is), then stale up to 24 h (shown at
 * once and refreshed in the background), then expired (loaded again first). Every call resolves: without IndexedDB
 * (a private window, blocked storage) there is no copy and the catalogue loads as before.
 */
export const CATALOG_FRESH_MS = 10 * 60 * 1000;
export const CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type CatalogCacheState = "none" | "fresh" | "stale" | "expired";

export function catalogCacheState(savedAt: number | null, now: number): CatalogCacheState {
  if (savedAt === null) return "none";
  const age = now - savedAt;
  if (age < 0) return "stale";
  if (age < CATALOG_FRESH_MS) return "fresh";
  return age < CATALOG_MAX_AGE_MS ? "stale" : "expired";
}

export const catalogCacheKey = (account: string | null) => `foods:${account ?? "guest"}`;

export interface SavedCatalog {
  at: number;
  foods: FoodItem[];
}

// cc-68 (Part 5): one record of 3,000 foods is copied (structured clone) in a single task, on the way in and the way out.
// The copy is kept in chunks instead, each its own request with a yield between, so no task holds the page for long. The
// record under the account's key says which chunks make the copy (`id` is the time it was saved), and it is written last:
// a copy that did not finish is never read. The older format, one record with every food, is still read.
export const CATALOG_CHUNK = 125;
interface CatalogMeta {
  at: number;
  id: number;
  chunks: number;
}
const chunkKey = (account: string | null, id: number, i: number) => `${catalogCacheKey(account)}:${id}:${i}`;
const isMeta = (v: unknown): v is CatalogMeta =>
  !!v && typeof (v as CatalogMeta).at === "number" && typeof (v as CatalogMeta).id === "number" && typeof (v as CatalogMeta).chunks === "number";

async function readMeta(account: string | null): Promise<unknown> {
  const result = await idbRun<unknown>("kv", "readonly", (store) => store.get(catalogCacheKey(account)));
  return result.ok ? result.value : null;
}

export async function readCatalogCache(account: string | null): Promise<SavedCatalog | null> {
  const saved = await readMeta(account);
  if (!saved) return null;
  if (!isMeta(saved)) {
    const old = saved as SavedCatalog;
    return typeof old.at === "number" && Array.isArray(old.foods) && old.foods.length > 0 ? old : null;
  }
  const foods: FoodItem[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < saved.chunks; i++) {
    const part = await idbRun<FoodItem[]>("kv", "readonly", (store) => store.get(chunkKey(account, saved.id, i)));
    if (!part.ok || !Array.isArray(part.value)) return null;
    // A food added to the copy is first: a later copy of the same id is skipped
    for (const food of part.value) {
      if (!seen.has(food.id)) {
        seen.add(food.id);
        foods.push(food);
      }
    }
    await yieldToMain();
  }
  return foods.length > 0 ? { at: saved.at, foods } : null;
}

async function writeChunks(account: string | null, at: number, foods: FoodItem[]): Promise<void> {
  const previous = await readMeta(account);
  const id = Date.now() === (isMeta(previous) ? previous.id : -1) ? Date.now() + 1 : Date.now();
  const chunks = Math.ceil(foods.length / CATALOG_CHUNK);
  for (let i = 0; i < chunks; i++) {
    const done = await idbRun("kv", "readwrite", (store) => store.put(foods.slice(i * CATALOG_CHUNK, (i + 1) * CATALOG_CHUNK), chunkKey(account, id, i)));
    if (!done.ok) return;
    await yieldToMain();
  }
  const meta: CatalogMeta = { at, id, chunks };
  const written = await idbRun("kv", "readwrite", (store) => store.put(meta, catalogCacheKey(account)));
  // The chunks of the copy that was there before are not needed any more
  if (written.ok && isMeta(previous)) await dropChunks(account, previous);
}

async function dropChunks(account: string | null, meta: CatalogMeta): Promise<void> {
  const ops = Array.from({ length: meta.chunks }, (_, i) => ({ delete: chunkKey(account, meta.id, i) }));
  await idbBatch("kv", ops);
}

export async function writeCatalogCache(account: string | null, foods: FoodItem[]): Promise<void> {
  await writeChunks(account, Date.now(), foods);
}

/** The copy and its chunks removed (Đăng xuất with nothing waiting wipes the account's data from the device). */
export async function dropCatalogCache(account: string | null): Promise<void> {
  const meta = await readMeta(account);
  if (isMeta(meta)) await dropChunks(account, meta);
  await idbRun("kv", "readwrite", (store) => store.delete(catalogCacheKey(account)));
}

/** The copy with `food` added first (a food with the same id replaced); its age stays as it was. */
export function withCatalogFood(saved: SavedCatalog, food: FoodItem): SavedCatalog {
  return { at: saved.at, foods: [food, ...saved.foods.filter((f) => f.id !== food.id)] };
}

/**
 * A food the user just made goes into the device's copy too, so an app reopened while the copy is fresh shows it
 * (review 07:00). Without a copy there is nothing to change: the next load reads /foods, which has it. It goes in front of
 * the first chunk only (the reader keeps the first food of an id), so the rest of the copy is not read or written again.
 */
export async function addToCatalogCache(account: string | null, food: FoodItem): Promise<void> {
  const meta = await readMeta(account);
  if (!meta) return;
  if (!isMeta(meta)) {
    const saved = await readCatalogCache(account);
    if (saved) await writeChunks(account, saved.at, withCatalogFood(saved, food).foods);
    return;
  }
  const first = await idbRun<FoodItem[]>("kv", "readonly", (store) => store.get(chunkKey(account, meta.id, 0)));
  if (!first.ok || !Array.isArray(first.value)) return;
  await idbRun("kv", "readwrite", (store) => store.put([food, ...first.value!.filter((f) => f.id !== food.id)], chunkKey(account, meta.id, 0)));
}
