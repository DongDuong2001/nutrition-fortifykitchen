import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api-client";
import { catalogFoodById } from "../catalog";

// Job B: PUT /foods/custom/{id} (feat/custom-food-update). Sửa món sends the body of createFood to the same id and the device's
// catalogue shows the new values at once.

const ID = "44444444-4444-4444-8444-444444444444";
const input = { nameVi: "Bánh mới", servingUnit: "miếng", servingSize: 80, calories: 400, protein: 8, carbs: 60, fat: 12, micros: { calcium: 40 } };
const saved = {
  id: ID,
  name_vi: "Bánh mới",
  category: "cua_toi",
  source: "custom",
  is_custom: true,
  servings: [{ label: "80 miếng", grams: 80 }, { label: "100 g", grams: 100 }],
  per_100g_nutrients: { energy: 500, calories: 500, protein: 10, carbs: 75, fat: 15, calcium: 50 },
};

describe("apiClient.updateFood", () => {
  const calls: Array<{ url: string; method?: string; body: Record<string, unknown> | null }> = [];
  let status = 200;
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
    calls.length = 0;
    status = 200;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : null });
        return status === 200 ? new Response(JSON.stringify({ data: saved }), { status }) : new Response(null, { status });
      })
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("PUTs the body of a new food to /foods/custom/{id}", async () => {
    await apiClient.updateFood(ID, input);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`https://api.test/api/v1/foods/custom/${ID}`);
    expect(calls[0].method).toBe("PUT");
    expect(calls[0].body).toMatchObject({ name_vi: "Bánh mới", serving_unit: "miếng", serving_size: 80, calories: 400, protein: 8, carbs: 60, fat: 12, micros: { calcium: 40 } });
    expect(calls[0].body).not.toHaveProperty("one_off");
  });

  it("answers with the food under the same id, and the device's catalogue has the new values at once", async () => {
    const food = await apiClient.updateFood(ID, input);
    expect(food.id).toBe(ID);
    expect(catalogFoodById(ID)).toMatchObject({ id: ID, nameVi: "Bánh mới" });
    expect(catalogFoodById(ID)?.nutrients.energy).toBe(500);
    // The next edit replaces it again, never a second row
    status = 200;
    saved.name_vi = "Bánh lần hai";
    await apiClient.updateFood(ID, { ...input, nameVi: "Bánh lần hai" });
    expect(catalogFoodById(ID)?.nameVi).toBe("Bánh lần hai");
    saved.name_vi = "Bánh mới";
  });

  it("says why in fixed words and leaves the catalogue as it was when the server refuses", async () => {
    await apiClient.updateFood(ID, input);
    status = 404;
    await expect(apiClient.updateFood(ID, { ...input, nameVi: "Không được lưu" })).rejects.toThrow("Chưa sửa được món. Thử lại sau nhé.");
    expect(catalogFoodById(ID)?.nameVi).toBe("Bánh mới");
  });

  it("a dropped connection is its own message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    await expect(apiClient.updateFood(ID, input)).rejects.toThrow("Lỗi kết nối khi sửa món. Vui lòng thử lại.");
  });
});

describe("apiClient.updateFood without the server (demo)", () => {
  it("replaces the food of that id in the catalogue with the new values", async () => {
    const made = await apiClient.createFood({ nameVi: "Chè nhà làm", servingUnit: "chén", servingSize: 200, calories: 300 });
    const food = await apiClient.updateFood(made.id, { nameVi: "Chè nhà làm ít đường", servingUnit: "chén", servingSize: 200, calories: 200 });
    expect(food.id).toBe(made.id);
    expect(catalogFoodById(made.id)).toMatchObject({ nameVi: "Chè nhà làm ít đường" });
    expect(catalogFoodById(made.id)?.nutrients.energy).toBe(100);
  });
});
