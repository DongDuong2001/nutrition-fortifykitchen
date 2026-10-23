import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_FRESH_MS, CATALOG_MAX_AGE_MS, catalogCacheKey, catalogCacheState, withCatalogFood, withoutCatalogFood } from "../catalog-cache";
import type { FoodItem } from "../mock/foods";

// cc-50: the catalogue is kept on the device per account (custom foods are per user) and refreshed in the background.

describe("catalogCacheState", () => {
  const now = Date.parse("2026-10-18T08:00:00Z");
  it("nothing saved", () => expect(catalogCacheState(null, now)).toBe("none"));
  it("fresh for 10 minutes: used as it is, no request", () => {
    expect(catalogCacheState(now - CATALOG_FRESH_MS + 1, now)).toBe("fresh");
  });
  it("stale after 10 minutes and up to 24 h: shown at once, refreshed in the background", () => {
    expect(catalogCacheState(now - CATALOG_FRESH_MS, now)).toBe("stale");
    expect(catalogCacheState(now - CATALOG_MAX_AGE_MS + 1, now)).toBe("stale");
  });
  it("expired after 24 h: loaded again before it is shown", () => {
    expect(catalogCacheState(now - CATALOG_MAX_AGE_MS, now)).toBe("expired");
  });
  it("a time in the future (clock moved back) counts as stale, never fresh forever", () => {
    expect(catalogCacheState(now + 60_000, now)).toBe("stale");
  });
});

describe("catalogCacheKey", () => {
  it("one copy per account; signed out has its own", () => {
    expect(catalogCacheKey("a@example.com")).toBe("foods:a@example.com");
    expect(catalogCacheKey("b@example.com")).not.toBe(catalogCacheKey("a@example.com"));
    expect(catalogCacheKey(null)).toBe("foods:guest");
  });
});

describe("withCatalogFood (review 07:00: a food just made is in the device's copy)", () => {
  const food = (id: string, nameVi: string) => ({ id, nameVi }) as FoodItem;
  it("adds the new food first and keeps the copy's age (a fresh copy stays fresh, an old one is still refreshed)", () => {
    const saved = { at: 1234, foods: [food("a", "Cơm"), food("b", "Phở")] };
    const next = withCatalogFood(saved, food("mine", "Bánh của tôi"));
    expect(next.at).toBe(1234);
    expect(next.foods.map((f) => f.id)).toEqual(["mine", "a", "b"]);
  });
  it("a food with the same id is replaced, not doubled", () => {
    const next = withCatalogFood({ at: 1, foods: [food("a", "Cũ"), food("b", "Phở")] }, food("a", "Mới"));
    expect(next.foods.map((f) => f.nameVi)).toEqual(["Mới", "Phở"]);
  });
});

describe("withoutCatalogFood (Xoá món: a deleted food is not in the device's copy either)", () => {
  const food = (id: string) => ({ id, nameVi: id }) as FoodItem;
  it("drops the food and keeps the copy's age and the order of the others", () => {
    const saved = { at: 1234, foods: [food("a"), food("mine"), food("b")] };
    const next = withoutCatalogFood(saved, "mine");
    expect(next.at).toBe(1234);
    expect(next.foods.map((f) => f.id)).toEqual(["a", "b"]);
  });
  it("a food that is not there leaves the copy as it was", () => {
    const saved = { at: 1, foods: [food("a")] };
    expect(withoutCatalogFood(saved, "zzz")).toEqual(saved);
  });
});
