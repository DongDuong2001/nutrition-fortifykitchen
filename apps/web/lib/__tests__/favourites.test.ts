import { describe, it, expect } from "vitest";
import { MOCK_FOODS } from "../mock/foods";
import {
  FAVOURITES_KEY,
  parseFavouriteIds,
  readFavouriteIds,
  resolveFavourites,
  toggleFavouriteId,
  writeFavouriteIds,
} from "../favourites";

/** A plain in-memory stand-in for localStorage, so these tests run without a DOM. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("quota");
  },
};

describe("toggleFavouriteId", () => {
  it("adds a missing id to the front", () => {
    expect(toggleFavouriteId(["food-a"], "food-b")).toEqual(["food-b", "food-a"]);
  });

  it("removes an id that is already saved", () => {
    expect(toggleFavouriteId(["food-b", "food-a"], "food-b")).toEqual(["food-a"]);
  });

  it("toggling the same id twice gives back the original list", () => {
    const start = ["food-b", "food-a"];
    expect(toggleFavouriteId(toggleFavouriteId(start, "food-c"), "food-c")).toEqual(start);
  });

  it("never stores the same id twice", () => {
    const once = toggleFavouriteId([], "food-a");
    expect(toggleFavouriteId(once, "food-a")).toEqual([]);
    expect(toggleFavouriteId(["food-a", "food-b"], "food-b")).toEqual(["food-a"]);
  });
});

describe("parseFavouriteIds", () => {
  it("reads nothing as an empty list", () => {
    expect(parseFavouriteIds(null)).toEqual([]);
  });

  it("turns bad JSON into an empty list", () => {
    expect(parseFavouriteIds("{not json")).toEqual([]);
  });

  it("turns a non-array value into an empty list", () => {
    expect(parseFavouriteIds('{"id":"food-cha-la"}')).toEqual([]);
    expect(parseFavouriteIds('"food-cha-la"')).toEqual([]);
  });

  it("keeps string ids only", () => {
    expect(parseFavouriteIds('["food-cha-la", 3, null, {"x":1}]')).toEqual(["food-cha-la"]);
  });

  it("drops duplicates and keeps the saved order", () => {
    expect(parseFavouriteIds('["food-b","food-a","food-b"]')).toEqual(["food-b", "food-a"]);
  });
});

describe("readFavouriteIds and writeFavouriteIds", () => {
  it("reads the list saved under the agreed key", () => {
    const storage = fakeStorage({ [FAVOURITES_KEY]: '["food-cha-la"]' });
    expect(readFavouriteIds(storage)).toEqual(["food-cha-la"]);
  });

  it("reads bad stored JSON as an empty list", () => {
    const storage = fakeStorage({ [FAVOURITES_KEY]: "[oops" });
    expect(readFavouriteIds(storage)).toEqual([]);
  });

  it("reads an empty list when storage throws", () => {
    expect(readFavouriteIds(throwingStorage)).toEqual([]);
  });

  it("writes JSON under h1t_favourite_foods_v1 and reads it back", () => {
    const storage = fakeStorage();
    writeFavouriteIds(["food-cha-la", "food-yen-mach"], storage);
    expect(storage.data[FAVOURITES_KEY]).toBe('["food-cha-la","food-yen-mach"]');
    expect(readFavouriteIds(storage)).toEqual(["food-cha-la", "food-yen-mach"]);
  });

  it("does not throw when storage refuses the write", () => {
    expect(() => writeFavouriteIds(["food-cha-la"], throwingStorage)).not.toThrow();
  });
});

describe("resolveFavourites", () => {
  it("returns the foods in saved order", () => {
    const foods = resolveFavourites(["food-yen-mach", "food-cha-la"], MOCK_FOODS);
    expect(foods.map((f) => f.id)).toEqual(["food-yen-mach", "food-cha-la"]);
  });

  it("drops ids of foods that are not in MOCK_FOODS", () => {
    const foods = resolveFavourites(["food-gone", "food-cha-la"], MOCK_FOODS);
    expect(foods.map((f) => f.id)).toEqual(["food-cha-la"]);
  });
});
