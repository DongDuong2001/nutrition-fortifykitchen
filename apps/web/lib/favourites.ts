import type { FoodItem } from "./catalog";

/** Saved in localStorage, so favourites last past the session. Local to this browser until accounts exist. */
export const FAVOURITES_KEY = "h1t_favourite_foods_v1";

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Keeps string ids only, without duplicates, in the saved order. Anything else becomes an empty list. */
export function parseFavouriteIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string => typeof id === "string"))];
  } catch {
    return [];
  }
}

export function readFavouriteIds(storage: KeyValueStorage | null = browserStorage()): string[] {
  try {
    return parseFavouriteIds(storage?.getItem(FAVOURITES_KEY) ?? null);
  } catch {
    return [];
  }
}

/** Storage can be full or blocked. Favourites then last only for this page view. */
export function writeFavouriteIds(ids: string[], storage: KeyValueStorage | null = browserStorage()): void {
  try {
    storage?.setItem(FAVOURITES_KEY, JSON.stringify(ids));
  } catch {
    // Ignore quota and access errors
  }
}

/** Adds the id to the front when it is missing, and removes it when it is there. Never duplicates. */
export function toggleFavouriteId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((saved) => saved !== id) : [id, ...ids];
}

/** The foods for the saved ids, in saved order. Ids whose food no longer exists are dropped. */
export function resolveFavourites(ids: string[], foods: FoodItem[]): FoodItem[] {
  const byId = new Map(foods.map((f) => [f.id, f]));
  return ids.flatMap((id) => {
    const food = byId.get(id);
    return food ? [food] : [];
  });
}
