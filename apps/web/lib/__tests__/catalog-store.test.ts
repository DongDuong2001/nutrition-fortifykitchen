import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MOCK_FOODS,
  catalogChanged,
  catalogStatus,
  catalogVersion,
  setCatalogFoods,
  setCatalogStatus,
  subscribeCatalog,
  type FoodItem,
} from "../mock/foods";

const SAMPLE = MOCK_FOODS.slice();
const food = (id: string): FoodItem => ({ id, nameVi: id, category: "tinh_bot", source: "USDA", servings: [{ label: "100 g", grams: 100 }], nutrients: { energy: 100 } });

afterEach(() => {
  MOCK_FOODS.length = 0;
  MOCK_FOODS.push(...SAMPLE);
  setCatalogStatus("idle");
});

describe("catalogue store", () => {
  it("setCatalogFoods bumps the version and tells every subscriber once", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = subscribeCatalog(a);
    const offB = subscribeCatalog(b);
    const before = catalogVersion();
    setCatalogFoods([food("x1"), food("x2")]);
    expect(catalogVersion()).toBe(before + 1);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    offB();
  });

  it("an unsubscribed listener is not called again", () => {
    const listener = vi.fn();
    const off = subscribeCatalog(listener);
    off();
    catalogChanged();
    expect(listener).not.toHaveBeenCalled();
  });

  it("an empty catalogue changes nothing and says nothing", () => {
    const listener = vi.fn();
    const off = subscribeCatalog(listener);
    const before = catalogVersion();
    setCatalogFoods([]);
    expect(catalogVersion()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    off();
  });

  it("a status change bumps the version, the same status does not", () => {
    const listener = vi.fn();
    const off = subscribeCatalog(listener);
    setCatalogStatus("loading");
    expect(catalogStatus()).toBe("loading");
    setCatalogStatus("loading");
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });
});
