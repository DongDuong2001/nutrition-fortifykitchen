import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MOCK_FOODS, catalogChanged, type FoodItem } from "../mock/foods";
import { collapseTwins, dedupeTwins, rowName, stripCookState, tidyName, twinGroupOf, twinIdsOf } from "../food-twins";
import { searchFoods } from "../search";
import { searchRows } from "../food-twins";
import { buildFoodList } from "../food-categories";
import { collapseTwins as facadeCollapse, dedupeTwins as facadeDedupe, loadFoodRows, rowName as facadeName, rowsReady, searchRows as facadeSearch, twinIdsOf as facadeIds } from "../food-rows";
import { cookSwitchFor } from "../yield";

interface FixturePair {
  raw: { source: string; source_id: string; name_vi: string };
  cooked: { source: string; source_id: string; name_vi: string };
}

// The food research's pairs (the same file the app's slim copy is made from) as catalogue rows, with the live API's
// source and source_id: so the grouping is tried on the real names, not on names made up here.
const FIXTURE: FixturePair[] = JSON.parse(readFileSync(path.resolve(__dirname, "../../tests/fixtures/raw-cooked-pairs.json"), "utf8"));

// The names the live catalogue has since the units import (food-research, 18/10): the research pairs file still carries the older ones
const LATEST_NAME: Record<string, string> = {
  "usda_sr_legacy|FDC 168484": "Khoai lang luộc bỏ vỏ (chín)",
  "usda_sr_legacy|FDC 168483": "Khoai lang nướng cả vỏ (chín)",
  "usda_foundation|food-khoai-lang": "Khoai lang luộc (chín)",
  "usda_foundation|FDC 2346404:khoai-nhat-song": "Khoai Nhật (sống)",
};

const CATEGORY_OF = (name: string): FoodItem["category"] => {
  if (/^(khoai|củ)/i.test(name)) return "tinh_bot";
  if (/^(gạo|cơm|xôi|yến|bún|phở|miến|mì)/i.test(name)) return "tinh_bot";
  return "dam";
};

let seq = 0;
const row = (nameVi: string, category: FoodItem["category"] = "dam", extra: Partial<FoodItem> = {}): FoodItem => ({
  id: `t-${++seq}`,
  nameVi,
  category,
  source: "USDA",
  servings: [{ label: "100 g", grams: 100 }],
  nutrients: { energy: 50 + seq },
  ...extra,
});

function fromFixture(): FoodItem[] {
  const seen = new Map<string, FoodItem>();
  const take = (r: FixturePair["raw"]) => {
    const key = `${r.source}|${r.source_id}`;
    if (!seen.has(key)) seen.set(key, row(LATEST_NAME[key] ?? r.name_vi, CATEGORY_OF(r.name_vi), { source: r.source as FoodItem["source"], sourceId: r.source_id }));
  };
  for (const p of FIXTURE) {
    take(p.raw);
    take(p.cooked);
  }
  return [...seen.values()];
}

const original = [...MOCK_FOODS];
function install(foods: FoodItem[]) {
  MOCK_FOODS.length = 0;
  MOCK_FOODS.push(...foods);
  catalogChanged();
}
const find = (foods: FoodItem[], name: string) => {
  const found = foods.find((f) => f.nameVi === name);
  if (!found) throw new Error(`no row ${name}`);
  return found;
};
const names = (foods: FoodItem[]) => foods.map(rowName);

describe("stripCookState", () => {
  it("takes the state out of a name", () => {
    expect(stripCookState("Khoai lang luộc")).toBe("Khoai lang");
    expect(stripCookState("Khoai lang (luộc, bỏ vỏ)")).toBe("Khoai lang");
    expect(stripCookState("Khoai lang luộc bỏ vỏ (chín)")).toBe("Khoai lang");
    expect(stripCookState("Cá lóc (cá quả, sống)")).toBe("Cá lóc");
    expect(stripCookState("Yến mạch cán dẹt (chín)")).toBe("Yến mạch cán dẹt");
    expect(stripCookState("Thịt bò thăn (áp chảo/nướng)")).toBe("Thịt bò thăn");
    expect(stripCookState("Tôm luộc")).toBe("Tôm");
    expect(stripCookState("Cơm trắng")).toBe("Cơm trắng");
  });

  it("keeps a bracket that names the variety", () => {
    expect(stripCookState("Khoai lang (tím)")).toBe("Khoai lang (tím)");
    expect(stripCookState("Bơ (trái)")).toBe("Bơ (trái)");
  });
});

describe("tidyName (no bỏ vỏ, cả vỏ or thịt quả in a name)", () => {
  it("takes the words about the part thrown away out and keeps the rest", () => {
    expect(tidyName("Táo (cả vỏ)")).toBe("Táo");
    expect(tidyName("Hạt gai dầu (bóc vỏ)")).toBe("Hạt gai dầu");
    expect(tidyName("Khoai lang (nướng, cả vỏ)")).toBe("Khoai lang (nướng)");
    expect(tidyName("Mãng cầu xiêm (thịt quả)")).toBe("Mãng cầu xiêm");
    expect(tidyName("Bơ vỏ tím")).toBe("Bơ vỏ tím");
    expect(tidyName("Cá cơm cả xương")).toBe("Cá cơm cả xương");
  });

  it("names the avocado Bơ (trái), as Bơ lạt exists", () => {
    expect(tidyName("Quả bơ")).toBe("Bơ (trái)");
    expect(tidyName("Bơ lạt")).toBe("Bơ lạt");
  });
});

describe("raw and cooked twins are one row (cc-67)", () => {
  let catalogue: FoodItem[];
  beforeAll(() => {
    catalogue = [
      ...fromFixture(),
      row("Bắp cải (sống)", "rau"),
      row("Bắp cải (luộc)", "rau"),
      row("Rau muống", "rau"),
      row("Rau muống luộc", "rau"),
      row("Rau muống xào", "rau"),
      row("Khoai lang (tím)", "tinh_bot"),
      row("Bơ", "trai_cay"),
      row("Bơ lạt", "beo"),
      row("Chuối", "trai_cay"),
      row("Chuối chín", "trai_cay"),
      row("Trứng gà (sống)", "dam"),
      row("Trứng gà (luộc)", "dam"),
      row("Khoai lang chiên", "tinh_bot"),
      row("Thịt cừu nạc (sống)", "dam"),
      row("Thịt cừu nạc (nấu chín)", "dam"),
      row("Thịt bò kho", "dam"),
      row("Cà rốt (luộc)", "rau"),
      row("Đậu hũ (sống)", "dam"),
    ];
    install(catalogue);
  });
  afterAll(() => install(original));

  it("leaves a row with no twin alone", () => {
    expect(twinGroupOf(find(catalogue, "Cà rốt (luộc)"))).toBeNull();
    expect(twinGroupOf(find(catalogue, "Đậu hũ (sống)"))).toBeNull();
    expect(rowName(find(catalogue, "Cà rốt (luộc)"))).toBe("Cà rốt (luộc)");
  });

  it("groups the research pairs by source and source_id", () => {
    const potato = twinGroupOf(find(catalogue, "Khoai tây (sống)"));
    expect(potato?.name).toBe("Khoai tây");
    expect(potato?.members.map((m) => m.nameVi)).toEqual(["Khoai tây (sống)", "Khoai tây (luộc)"]);
    expect(twinGroupOf(find(catalogue, "Khoai tây (luộc)"))).toBe(potato);
    // Two raw rows for one cooked row: the cooked one goes with the first, the other stays a row of its own
    const rice = twinGroupOf(find(catalogue, "Cơm trắng"));
    expect(rice?.name).toBe("Cơm trắng");
    expect(rice?.raw.nameVi).toBe("Gạo tẻ trắng (xát máy, hạt khô)");
    expect(twinGroupOf(find(catalogue, "Gạo ST25 (hạt khô)"))).toBeNull();
  });

  it("takes every plain cooked row of a raw row, and leaves the roasted and fried ones out", () => {
    const sweet = twinGroupOf(find(catalogue, "Khoai Nhật (sống)"));
    expect(sweet?.name).toBe("Khoai lang");
    expect(sweet?.members.map((m) => m.nameVi).sort()).toEqual(["Khoai Nhật (sống)", "Khoai lang luộc bỏ vỏ (chín)", "Khoai lang luộc (chín)"].sort());
    // Roasted keeps its row, without the word about the peel
    expect(twinGroupOf(find(catalogue, "Khoai lang nướng cả vỏ (chín)"))).toBeNull();
    expect(rowName(find(catalogue, "Khoai lang nướng cả vỏ (chín)"))).toBe("Khoai lang nướng (chín)");
    expect(twinGroupOf(find(catalogue, "Khoai lang chiên"))).toBeNull();
    expect(twinGroupOf(find(catalogue, "Thịt bò kho"))).toBeNull();
  });

  it("groups by name where the research has no pair", () => {
    expect(twinGroupOf(find(catalogue, "Bắp cải (luộc)"))?.name).toBe("Bắp cải");
    expect(twinGroupOf(find(catalogue, "Thịt cừu nạc (sống)"))).toBe(twinGroupOf(find(catalogue, "Thịt cừu nạc (nấu chín)")));
    expect(rowName(find(catalogue, "Thịt cừu nạc (nấu chín)"))).toBe("Thịt cừu nạc");
    // A raw row that says nothing is raw
    expect(twinGroupOf(find(catalogue, "Rau muống luộc"))?.raw.nameVi).toBe("Rau muống");
    expect(twinGroupOf(find(catalogue, "Rau muống xào"))).toBeNull();
  });

  it("never merges different foods", () => {
    // Bơ (avocado) and Bơ lạt (butter); a ripe banana; a boiled egg; a purple sweet potato and a boiled one
    expect(twinGroupOf(find(catalogue, "Bơ"))).toBeNull();
    expect(twinGroupOf(find(catalogue, "Bơ lạt"))).toBeNull();
    expect(twinGroupOf(find(catalogue, "Chuối chín"))).toBeNull();
    expect(twinGroupOf(find(catalogue, "Trứng gà (luộc)"))).toBeNull();
    expect(twinGroupOf(find(catalogue, "Khoai lang (tím)"))).toBeNull();
    expect(rowName(find(catalogue, "Bơ"))).toBe("Bơ");
  });

  it("opens each food in the state it is eaten in", () => {
    // Starch staples: Chín
    expect(twinGroupOf(find(catalogue, "Cơm trắng"))?.start.nameVi).toBe("Cơm trắng");
    expect(twinGroupOf(find(catalogue, "Khoai tây (sống)"))?.start.nameVi).toBe("Khoai tây (luộc)");
    expect(twinGroupOf(find(catalogue, "Yến mạch cán dẹt (chín)"))?.start.nameVi).toBe("Yến mạch cán dẹt (chín)");
    expect(twinGroupOf(find(catalogue, "Bún khô"))?.start.nameVi).toBe("Bún khô (luộc)");
    expect(twinGroupOf(find(catalogue, "Miến dong (khô)"))?.start.nameVi).toBe("Miến dong (chín)");
    // Meat, fish, seafood, vegetables, dry beans: Sống
    expect(twinGroupOf(find(catalogue, "Thịt bò nạc (nấu chín)"))?.start.nameVi).toBe("Thịt bò nạc");
    expect(twinGroupOf(find(catalogue, "Thịt cừu nạc (nấu chín)"))?.start.nameVi).toBe("Thịt cừu nạc (sống)");
    expect(twinGroupOf(find(catalogue, "Cá lóc (nấu chín)"))?.start.nameVi).toBe("Cá lóc (cá quả, sống)");
    expect(twinGroupOf(find(catalogue, "Hàu (hấp)"))?.start.nameVi).toBe("Hàu (sống)");
    expect(twinGroupOf(find(catalogue, "Bắp cải (luộc)"))?.start.nameVi).toBe("Bắp cải (sống)");
    expect(twinGroupOf(find(catalogue, "Đậu đỏ (luộc)"))?.start.nameVi).toBe("Đậu đỏ (hạt khô)");
    expect(twinGroupOf(find(catalogue, "Khoai tây (luộc)"))?.cooked.nameVi).toBe("Khoai tây (luộc)");
    expect(twinGroupOf(find(catalogue, "Khoai tây (sống)"))?.raw.nameVi).toBe("Khoai tây (sống)");
  });

  it("collapses a list to one row per food, on the row it opens on", () => {
    const rows = collapseTwins(catalogue);
    expect(rows.length).toBeLessThan(catalogue.length);
    const shown = names(rows);
    expect(shown.filter((n) => n === "Khoai tây")).toHaveLength(1);
    expect(shown).not.toContain("Khoai tây (luộc)");
    expect(rows).toContain(find(catalogue, "Khoai tây (luộc)"));
    // The raw row stands in when the category filter left the opening row out
    expect(collapseTwins([find(catalogue, "Khoai tây (sống)")])).toEqual([find(catalogue, "Khoai tây (sống)")]);
  });

  it("is selected, favourite and in the tray by any of its rows", () => {
    expect(twinIdsOf(find(catalogue, "Khoai tây (sống)"))).toEqual([find(catalogue, "Khoai tây (sống)").id, find(catalogue, "Khoai tây (luộc)").id]);
    expect(twinIdsOf(find(catalogue, "Bơ"))).toEqual([find(catalogue, "Bơ").id]);
  });

  it("keeps the first item of a food in a list of recents", () => {
    const logged = [find(catalogue, "Khoai tây (luộc)"), find(catalogue, "Bơ"), find(catalogue, "Khoai tây (sống)")];
    expect(dedupeTwins(logged, (f) => f)).toEqual([logged[0], logged[1]]);
  });

  it("leaves a way to the other state in the portion sheet", () => {
    const boiled = find(catalogue, "Khoai tây (luộc)");
    expect(cookSwitchFor(boiled, MOCK_FOODS, true)?.pair?.nameVi).toBe("Khoai tây (sống)");
    const start = twinGroupOf(find(catalogue, "Bắp cải (sống)"))!.start;
    expect(cookSwitchFor(start, MOCK_FOODS, true)?.pair?.nameVi).toBe("Bắp cải (luộc)");
  });
});

describe("search returns one row per food (cc-67)", () => {
  let catalogue: FoodItem[];
  beforeAll(async () => {
    await loadFoodRows();
    catalogue = [
      ...fromFixture(),
      row("Khoai lang chiên", "tinh_bot"),
      row("Khoai lang (tím)", "tinh_bot"),
      row("Thịt cừu nạc (sống)", "dam"),
      row("Thịt cừu nạc (nấu chín)", "dam"),
      row("Thịt bò kho", "dam"),
      row("Bơ", "trai_cay"),
      row("Bơ lạt", "beo"),
    ];
    install(catalogue);
  });
  afterAll(() => install(original));

  const shown = (query: string) => names(searchRows(catalogue, query));
  const once = (list: string[], name: string) => expect(list.filter((n) => n === name)).toHaveLength(1);

  it("'khoai' lists Khoai lang, Khoai tây, Khoai môn once each, never a luộc or chín twin", () => {
    const list = shown("khoai");
    for (const name of ["Khoai lang", "Khoai tây", "Khoai môn", "Khoai mỡ", "Khoai sọ"]) once(list, name);
    expect(list.filter((n) => /(luộc|chín|sống)/i.test(n) && !/chiên|nướng/.test(n))).toEqual([]);
    // The plain row comes before the preparations of the same food
    expect(list.indexOf("Khoai lang")).toBeLessThan(list.indexOf("Khoai lang chiên"));
    expect(list.indexOf("Khoai lang")).toBeLessThan(list.indexOf("Khoai lang nướng (chín)"));
  });

  it("'cơm' lists Cơm trắng once, and Cơm gạo lứt once", () => {
    const list = shown("cơm");
    once(list, "Cơm trắng");
    once(list, "Cơm gạo lứt");
    expect(list.filter((n) => /^Cơm trắng/.test(n))).toEqual(["Cơm trắng"]);
  });

  it("'thịt bò' lists Thịt bò nạc once, with the kho dish below it", () => {
    const list = shown("thịt bò");
    once(list, "Thịt bò nạc");
    once(list, "Thịt bò thăn");
    expect(list.indexOf("Thịt bò nạc")).toBeLessThan(list.indexOf("Thịt bò kho"));
    expect(list.some((n) => /nấu chín|\(sống\)/.test(n))).toBe(false);
  });

  it("'cá lóc' lists one Cá lóc", () => {
    expect(shown("cá lóc")).toEqual(["Cá lóc"]);
    expect(shown("ca loc")).toEqual(["Cá lóc"]);
  });

  it("finds a food by the name of its other row", () => {
    // Cơm trắng is one row; the raw rice it comes from is still a way to find it
    expect(shown("gạo tẻ trắng")).toContain("Cơm trắng");
  });

  it("does not merge Bơ and Bơ lạt", () => {
    const list = shown("bơ");
    once(list, "Bơ");
    once(list, "Bơ lạt");
  });

  it("opens each found food on the state it is eaten in", () => {
    expect(searchRows(catalogue, "khoai tây")[0].nameVi).toBe("Khoai tây (luộc)");
    expect(searchRows(catalogue, "thịt bò nạc")[0].nameVi).toBe("Thịt bò nạc");
  });

  it("keeps the plain search as it was: every row", () => {
    expect(searchFoods(catalogue, "khoai tây").map((f) => f.nameVi)).toEqual(expect.arrayContaining(["Khoai tây (sống)", "Khoai tây (luộc)"]));
  });

  it("lists every row once in Tất cả with no query, and counts a category once per food", () => {
    const all = buildFoodList(catalogue, "", "all");
    const rows = all.groups.flatMap((g) => g.foods);
    expect(rows.filter((f) => rowName(f) === "Khoai tây")).toHaveLength(1);
    const separate = buildFoodList(catalogue, "", "all", [], false);
    expect(separate.groups.flatMap((g) => g.foods).length).toBeGreaterThan(rows.length);
  });

  it("collapses favourites too", () => {
    const both = [find(catalogue, "Khoai tây (sống)").id, find(catalogue, "Khoai tây (luộc)").id];
    expect(buildFoodList(catalogue, "", "favorite", both).foods).toHaveLength(1);
  });
});

describe("the screens' view of it (lib/food-rows)", () => {
  it("one row per food once the index is loaded: names, ids, dedupe, collapse and search follow lib/food-twins", async () => {
    const catalogue = [row("Khoai tây (sống)", "tinh_bot"), row("Khoai tây (luộc)", "tinh_bot"), row("Bơ", "trai_cay")];
    install(catalogue);
    await loadFoodRows();
    expect(rowsReady()).toBe(true);
    expect(facadeName(catalogue[1])).toBe("Khoai tây");
    expect(facadeIds(catalogue[0])).toEqual([catalogue[0].id, catalogue[1].id]);
    expect(facadeDedupe(catalogue, (f) => f)).toEqual([catalogue[0], catalogue[2]]);
    expect(facadeCollapse(catalogue).map((f) => f.nameVi)).toEqual(["Khoai tây (luộc)", "Bơ"]);
    expect(facadeSearch(catalogue, "khoai").map((f) => f.nameVi)).toEqual(["Khoai tây (luộc)"]);
    install(original);
  });
});
