import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api-client";
import { recipeFoodInput, type Recipe } from "../recipe";

// cc-68 (with Dong's API): the food of an edited dish is sent as a one-off, so the API keeps it out of every list on every
// device. Foods made before the flag are still hidden by their id and name (lib/recipe-store, lib/mock/foods).

const recipe = (over: Partial<Recipe> = {}): Recipe => ({
  id: "recipe-1",
  name: "Phở bò · đã chỉnh",
  servings: 1,
  ingredients: [{ foodId: "x", name: "Phở", grams: 300, unit: "g" }],
  cookedGrams: null,
  createdAt: "2026-10-19T00:00:00.000Z",
  ...over,
});
const lookup = () => ({ nutrients: { energy: 100, protein: 5, carbs: 20, fat: 1 } });

describe("recipeFoodInput", () => {
  it("carries the one-off flag of an edited dish, and not for an ordinary recipe", () => {
    expect(recipeFoodInput(recipe({ oneOff: true }), lookup)).toMatchObject({ oneOff: true });
    expect(recipeFoodInput(recipe(), lookup)).not.toHaveProperty("oneOff");
  });
});

describe("POST /foods/custom", () => {
  const bodies: Array<Record<string, unknown>> = [];
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
    bodies.length = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).endsWith("/foods/custom")) {
          bodies.push(JSON.parse(String(init?.body)));
          return new Response(JSON.stringify({ data: { id: "33333333-3333-4333-8333-333333333333", name_vi: "Món", serving_unit: "phần", serving_size: 300, calories: 100 } }), { status: 201 });
        }
        return new Response(null, { status: 204 });
      })
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends one_off: true for an edited dish", async () => {
    await apiClient.createFood({ nameVi: "Phở bò · đã chỉnh", servingUnit: "phần", servingSize: 300, calories: 100, oneOff: true });
    expect(bodies[0]).toMatchObject({ name_vi: "Phở bò · đã chỉnh", one_off: true });
  });

  it("sends no flag for a food the person made to keep", async () => {
    await apiClient.createFood({ nameVi: "Bánh của tôi", servingUnit: "phần", servingSize: 100, calories: 100 });
    expect(bodies[0]).not.toHaveProperty("one_off");
  });
});
