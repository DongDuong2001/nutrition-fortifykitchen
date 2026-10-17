import type { FoodItem } from "./mock/foods";

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

const DB_NAME = "h1t";
const STORE = "kv";
let opening: Promise<IDBDatabase | null> | null = null;

function database(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return database().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const request = work(db.transaction(STORE, mode).objectStore(STORE));
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      })
  );
}

export async function readCatalogCache(account: string | null): Promise<SavedCatalog | null> {
  const saved = await run<SavedCatalog>("readonly", (store) => store.get(catalogCacheKey(account)));
  return saved && typeof saved.at === "number" && Array.isArray(saved.foods) && saved.foods.length > 0 ? saved : null;
}

export async function writeCatalogCache(account: string | null, foods: FoodItem[]): Promise<void> {
  await run("readwrite", (store) => store.put({ at: Date.now(), foods } satisfies SavedCatalog, catalogCacheKey(account)));
}
