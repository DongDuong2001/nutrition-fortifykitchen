import { describe, it, expect } from "vitest";
import { MOCK_FOODS, type FoodItem } from "../mock/foods";
import {
  FOOD_CATEGORIES,
  buildFoodList,
  categoriesWithFoods,
  groupFoodsByCategory,
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
      "Rau củ",
      "Trái cây",
      "Món Việt",
      "Đồ ngọt & ăn vặt",
      "Thực phẩm bổ sung",
      "Món của tôi",
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

  it("treats a food without a category as Món của tôi", () => {
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

  it("treats the favourite filter as all foods, because there are no favourites yet", () => {
    const list = buildFoodList(foods, "", "favorite");
    expect(list.grouped).toBe(true);
    expect(list.foods).toHaveLength(4);
  });
});
