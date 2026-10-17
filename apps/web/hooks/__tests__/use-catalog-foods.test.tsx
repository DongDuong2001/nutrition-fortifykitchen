import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { useCatalogFoods } from "../use-catalog-foods";
import { MOCK_FOODS, addCatalogFood, catalogChanged, setCatalogFoods, setCatalogStatus, type FoodItem } from "@/lib/mock/foods";

const SAMPLE = MOCK_FOODS.slice();
const tinhBot = (i: number): FoodItem => ({
  id: `tb-${i}`,
  nameVi: `Tinh bột ${i}`,
  category: "tinh_bot",
  source: "USDA",
  servings: [{ label: "100 g", grams: 100 }],
  nutrients: { energy: 100 + i },
});

function TinhBotCount() {
  const { foods, pending } = useCatalogFoods();
  return <p>{pending ? "Đang tải món…" : `${foods.filter((f) => f.category === "tinh_bot").length} món`}</p>;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
});

afterEach(() => {
  vi.unstubAllEnvs();
  MOCK_FOODS.length = 0;
  MOCK_FOODS.push(...SAMPLE);
  setCatalogStatus("idle");
});

describe("useCatalogFoods", () => {
  it("says it is loading, not empty, until the first live load is done", () => {
    expect(renderToString(<TinhBotCount />)).toContain("Đang tải món…");
  });

  it("goes from 0 to 35 Tinh bột foods once the catalogue arrives", () => {
    setCatalogStatus("failed");
    expect(renderToString(<TinhBotCount />)).toContain("0 món");
    setCatalogFoods(Array.from({ length: 35 }, (_, i) => tinhBot(i)));
    setCatalogStatus("ready");
    expect(renderToString(<TinhBotCount />)).toContain("35 món");
  });

  it("reports a failed load so the screen can offer Thử lại", () => {
    function Failed() {
      const { failed, pending } = useCatalogFoods();
      return <p>{failed ? "failed" : pending ? "pending" : "ok"}</p>;
    }
    setCatalogStatus("failed");
    expect(renderToString(<Failed />)).toContain("failed");
  });
});

describe("useCatalogFoods in demo mode (browsableFoods is MOCK_FOODS itself)", () => {
  function Capture({ into }: { into: FoodItem[][] }) {
    const { foods } = useCatalogFoods();
    into.push(foods);
    return null;
  }

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a new array after a made food is added, and it holds the food", () => {
    const seen: FoodItem[][] = [];
    renderToString(<Capture into={seen} />);
    addCatalogFood(tinhBot(900));
    renderToString(<Capture into={seen} />);
    expect(seen[1]).not.toBe(seen[0]);
    expect(seen[0].some((f) => f.id === "tb-900")).toBe(false);
    expect(seen[1].some((f) => f.id === "tb-900")).toBe(true);
    // Never the catalogue array itself, which is changed in place
    expect(seen[0]).not.toBe(MOCK_FOODS);
    expect(seen[1]).not.toBe(MOCK_FOODS);
  });

  it("returns a new array after any change that is announced (a recipe sync)", () => {
    const seen: FoodItem[][] = [];
    renderToString(<Capture into={seen} />);
    MOCK_FOODS.unshift(tinhBot(901));
    catalogChanged();
    renderToString(<Capture into={seen} />);
    expect(seen[1]).not.toBe(seen[0]);
    expect(seen[1].some((f) => f.id === "tb-901")).toBe(true);
  });
});
