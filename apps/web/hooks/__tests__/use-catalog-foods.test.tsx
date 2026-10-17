import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { useCatalogFoods } from "../use-catalog-foods";
import { MOCK_FOODS, setCatalogFoods, setCatalogStatus, type FoodItem } from "@/lib/mock/foods";

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
