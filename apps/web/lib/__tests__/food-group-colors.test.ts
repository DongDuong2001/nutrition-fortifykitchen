import { describe, expect, it } from "vitest";
import { FOOD_CATEGORIES } from "../food-categories";
import { FOOD_GROUP_COLORS, foodGroupAccent, foodGroupText } from "../food-group-colors";
import { token } from "./css-tokens";

// V3-SPEC §1: the icon tile colour of each food group, also the group's accent on its list page.
describe("food group colours", () => {
  it("covers every category plus Tất cả, Yêu thích and Minh Hào", () => {
    for (const c of FOOD_CATEGORIES) expect(FOOD_GROUP_COLORS[c.key], c.key).toBeDefined();
    for (const k of ["all", "favorite", "minh_hao"] as const) expect(FOOD_GROUP_COLORS[k]).toBeDefined();
  });

  it("follows the V3 table", () => {
    expect(FOOD_GROUP_COLORS).toEqual({
      tinh_bot: "yellow", dam: "indigo", beo: "green", sua: "blue", do_uong: "cyan", rau: "orange", trai_cay: "red",
      mon_viet: "teal", an_vat: "purple", bo_sung: "mint", gia_vi: "brown", cua_toi: "cobalt", all: "ink",
      favorite: "pink", minh_hao: "rainbow",
    });
  });

  it("has a tile gradient (highlight, colour, deeper) token for every colour but the rainbow", () => {
    for (const colour of new Set(Object.values(FOOD_GROUP_COLORS))) {
      if (colour === "rainbow") continue;
      for (const stop of ["hi", "base", "lo"]) expect(token(`tile-${colour}-${stop}`), `${colour} ${stop}`).not.toBe("");
    }
  });

  it("gives every group a text-safe accent token", () => {
    for (const key of Object.keys(FOOD_GROUP_COLORS)) {
      const name = foodGroupAccent(key as keyof typeof FOOD_GROUP_COLORS).match(/--color-([\w-]+)/)![1];
      expect(token(name), key).not.toBe("");
    }
  });

  it("gives every group a figure colour that names a real token (deep shade for the system colours)", () => {
    for (const key of Object.keys(FOOD_GROUP_COLORS)) {
      const name = foodGroupText(key as keyof typeof FOOD_GROUP_COLORS).match(/--color-([\w-]+)/)![1];
      expect(token(name), key).not.toBe("");
    }
    expect(foodGroupText("rau")).toBe("var(--color-deep-orange)");
    expect(foodGroupText("cua_toi")).toBe("var(--color-cobalt)");
    expect(foodGroupText("minh_hao")).toBe("var(--color-cobalt)");
  });
});
