import { describe, expect, it } from "vitest";
import { FOOD_CATEGORIES } from "@/lib/food-categories";
import { ICON_TILE_KEYS } from "../icon-tile";

// V3-SPEC §5: one tile per food group, plus Tất cả, Yêu thích and Minh Hào (the keys of IconTile.dc.html)
describe("IconTile", () => {
  it("has a glyph for every category and the three filters", () => {
    const keys = [...FOOD_CATEGORIES.map((c) => c.key), "all", "favorite", "minh_hao"];
    expect([...ICON_TILE_KEYS].sort()).toEqual([...keys].sort());
  });
});
