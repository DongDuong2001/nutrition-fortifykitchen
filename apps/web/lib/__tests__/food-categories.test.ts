import { describe, it, expect } from "vitest";
import { MOCK_FOODS, type FoodItem } from "../mock/foods";
import { mapApiFoodToFoodItem } from "../api-client";
import {
  FOOD_CATEGORIES,
  buildFoodList,
  categoriesWithFoods,
  chipCategories,
  groupFoodsByCategory,
  categoryOf,
  isKnownCategory,
  isOwnFood,
} from "../food-categories";

const ids = (foods: FoodItem[]) => foods.map((f) => f.id);

describe("food categories data", () => {
  it("every mock food has a category from the list", () => {
    const keys = new Set(FOOD_CATEGORIES.map((c) => c.key));
    for (const food of MOCK_FOODS) {
      expect(keys.has(food.category), `${food.id} has no category`).toBe(true);
    }
  });

  it("uses the agreed display order and labels", () => {
    expect(FOOD_CATEGORIES.map((c) => c.label)).toEqual([
      "Tinh bột",
      "Đạm",
      "Chất béo & hạt",
      "Sữa & chế phẩm",
      "Đồ uống",
      "Rau củ",
      "Trái cây",
      "Món Việt",
      "Đồ ngọt & ăn vặt",
      "Thực phẩm bổ sung",
      "Gia vị",
      "Món ăn của tôi",
    ]);
  });

  it("maps the agreed foods to their categories", () => {
    const byId = new Map(MOCK_FOODS.map((f) => [f.id, f.category]));
    expect(byId.get("food-rau-muong")).toBe("rau");
    expect(byId.get("food-cai-bo-xoi")).toBe("rau");
    expect(byId.get("food-bong-cai-xanh")).toBe("rau");
    expect(byId.get("food-cha-la")).toBe("trai_cay");
    expect(byId.get("food-yen-mach")).toBe("tinh_bot");
    expect(byId.get("food-whey-protein")).toBe("bo_sung");
    expect(byId.get("food-bot-cu-den")).toBe("bo_sung");
    expect(byId.get("ing-muoi")).toBe("gia_vi");
  });
});

describe("groupFoodsByCategory", () => {
  it("keeps the display order and drops empty categories", () => {
    const foods = [
      { id: "b", category: "trai_cay" },
      { id: "a", category: "tinh_bot" },
      { id: "c", category: "trai_cay" },
    ] as FoodItem[];
    const groups = groupFoodsByCategory(foods);
    expect(groups.map((g) => g.key)).toEqual(["tinh_bot", "trai_cay"]);
    expect(ids(groups[1].foods)).toEqual(["b", "c"]);
  });

  it("treats a food without a category as Món ăn của tôi", () => {
    const foods = [{ id: "x" }] as FoodItem[];
    expect(groupFoodsByCategory(foods).map((g) => g.key)).toEqual(["cua_toi"]);
  });

  it("lists only the categories that have foods, in order", () => {
    const foods = [
      { id: "a", category: "trai_cay" },
      { id: "b", category: "tinh_bot" },
    ] as FoodItem[];
    expect(categoriesWithFoods(foods).map((c) => c.key)).toEqual(["tinh_bot", "trai_cay"]);
  });
});

describe("chipCategories", () => {
  it("adds Đồ uống to the categories that have foods, in display order", () => {
    const foods = [
      { id: "a", category: "trai_cay" },
      { id: "b", category: "tinh_bot" },
    ] as FoodItem[];
    expect(chipCategories(foods).map((c) => c.key)).toEqual(["tinh_bot", "do_uong", "trai_cay"]);
    expect(chipCategories([]).map((c) => c.key)).toEqual(["do_uong"]);
  });

  it("Đồ uống filter with no drink: an empty flat list", () => {
    const list = buildFoodList([{ id: "a", nameVi: "Cơm", category: "tinh_bot" }] as FoodItem[], "", "do_uong");
    expect(list.foods).toEqual([]);
    expect(list.grouped).toBe(false);
  });
});

describe("buildFoodList", () => {
  const foods = [
    { id: "cha-la", nameVi: "Chà là", category: "trai_cay" },
    { id: "chuoi", nameVi: "Chuối", category: "trai_cay" },
    { id: "yen-mach", nameVi: "Yến mạch", category: "tinh_bot" },
    { id: "rau", nameVi: "Rau muống", category: "rau" },
  ] as FoodItem[];

  it("groups foods when there is no query and no category", () => {
    const list = buildFoodList(foods, "", "all");
    expect(list.grouped).toBe(true);
    // Display order: Tinh bột, then Rau củ, then Trái cây
    expect(list.groups.map((g) => g.key)).toEqual(["tinh_bot", "rau", "trai_cay"]);
  });

  it("returns a flat, ranked list when there is a query", () => {
    const list = buildFoodList(foods, "chuoi", "all");
    expect(list.grouped).toBe(false);
    expect(ids(list.foods)).toEqual(["chuoi"]);
  });

  it("returns a flat list for one category", () => {
    const list = buildFoodList(foods, "", "rau");
    expect(list.grouped).toBe(false);
    expect(ids(list.foods)).toEqual(["rau"]);
  });

  it("combines a search with the category filter", () => {
    // "chuoi" is a fruit: it shows under Trái cây, but not under Đạm
    expect(ids(buildFoodList(foods, "chuoi", "trai_cay").foods)).toEqual(["chuoi"]);
    expect(ids(buildFoodList(foods, "chuoi", "rau").foods)).toEqual([]);
  });

  it("shows only the saved favourites for the favourite filter, flat and in saved order", () => {
    const list = buildFoodList(foods, "", "favorite", ["rau", "cha-la"]);
    expect(list.grouped).toBe(false);
    expect(ids(list.foods)).toEqual(["rau", "cha-la"]);
  });

  it("ranks the favourites by the search when there is a query", () => {
    // "ch" ranks Chuối (shorter) above Chà là, even though Chà là was saved first
    const list = buildFoodList(foods, "ch", "favorite", ["cha-la", "chuoi"]);
    expect(ids(list.foods)).toEqual(["chuoi", "cha-la"]);
  });

  it("shows nothing when no foods are saved", () => {
    const list = buildFoodList(foods, "", "favorite", []);
    expect(list.foods).toEqual([]);
  });

  it("drops favourite ids whose food no longer exists", () => {
    const list = buildFoodList(foods, "", "favorite", ["gone", "rau"]);
    expect(ids(list.foods)).toEqual(["rau"]);
  });

  it("ignores the favourites for Tất cả", () => {
    const list = buildFoodList(foods, "", "all", ["rau"]);
    expect(list.grouped).toBe(true);
    expect(list.groups.map((g) => g.key)).toEqual(["tinh_bot", "rau", "trai_cay"]);
  });
});

describe("a food with an unknown category", () => {
  const odd = { id: "odd", nameVi: "Bột lạ", category: "khac" } as unknown as FoodItem;
  const tinhBot = { id: "t", nameVi: "Cơm", category: "tinh_bot" } as FoodItem;

  it("knows only the keys of the list", () => {
    expect(isKnownCategory("gia_vi")).toBe(true);
    expect(isKnownCategory("khac")).toBe(false);
    expect(isKnownCategory(undefined)).toBe(false);
  });

  it("counts as Món ăn của tôi without being the user's own food", () => {
    expect(categoryOf(odd)).toBe("cua_toi");
    expect(isOwnFood(odd)).toBe(false);
  });

  it("still appears in Tất cả, grouped and flat, and in a search", () => {
    const all = buildFoodList([tinhBot, odd], "", "all");
    expect(ids(all.groups.flatMap((g) => g.foods))).toContain("odd");
    expect(ids(buildFoodList([tinhBot, odd], "lạ", "all").foods)).toEqual(["odd"]);
  });

  it("does not make a chip of its own", () => {
    expect(categoriesWithFoods([odd]).map((c) => c.key)).toEqual(["cua_toi"]);
  });
});

describe("a live-shaped /foods response", () => {
  const raw = (id: string, name_vi: string, category?: string) => ({
    id,
    name_vi,
    ...(category ? { category } : {}),
    source: "label",
    servings: [{ label: "1 viên", grams: 1 }],
    nutrients: { energy: 4 },
  });
  const foods = [
    raw("a1", "Vitamin D3 CanPrev", "bo_sung"),
    raw("a2", "Muối biển", "gia_vi"),
    raw("a3", "Cơm trắng", "tinh_bot"),
    raw("a4", "Bột lạ", "khac"),
    raw("a5", "Món chưa phân loại"),
  ].map(mapApiFoodToFoodItem);

  it("puts bo_sung and gia_vi foods in their own chips", () => {
    const chips = chipCategories(foods).map((c) => c.key);
    expect(chips).toContain("bo_sung");
    expect(chips).toContain("gia_vi");
    expect(ids(buildFoodList(foods, "", "bo_sung").foods)).toEqual(["a1"]);
    expect(ids(buildFoodList(foods, "", "gia_vi").foods)).toEqual(["a2"]);
  });

  it("keeps a khac food and one with no category in Tất cả, grouped and flat, and in search", () => {
    const all = buildFoodList(foods, "", "all");
    expect(ids(all.groups.flatMap((g) => g.foods)).sort()).toEqual(["a1", "a2", "a3", "a4", "a5"]);
    expect(ids(buildFoodList(foods, "lạ", "all").foods)).toEqual(["a4"]);
    expect(ids(buildFoodList(foods, "chưa phân loại", "all").foods)).toEqual(["a5"]);
  });
});
