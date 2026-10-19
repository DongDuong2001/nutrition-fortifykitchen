import { describe, expect, it } from "vitest";
import { COOKED_PER_RAW, cookStateOf, cookSwitchFor, nameStem, ownCookState, yieldGroupOf } from "../yield";
import type { FoodItem } from "../mock/foods";

const food = (id: string, nameVi: string, category: FoodItem["category"] = "dam"): FoodItem => ({
  id,
  nameVi,
  category,
  source: "USDA",
  servings: [{ label: "100 g", grams: 100 }],
  nutrients: { energy: 100 },
});

describe("cookStateOf (the state a food's name says)", () => {
  it("reads raw and cooked markers", () => {
    expect(cookStateOf("Cá chép (sống)")).toBe("raw");
    expect(cookStateOf("Cá lóc (cá quả, sống)")).toBe("raw");
    expect(cookStateOf("Đậu đen (hạt khô)")).toBe("raw");
    expect(cookStateOf("Mì ý (khô)")).toBe("raw");
    expect(cookStateOf("Cá chép (nấu chín)")).toBe("cooked");
    expect(cookStateOf("Cơm trắng (chín)")).toBe("cooked");
    expect(cookStateOf("Khoai lang luộc")).toBe("cooked");
    expect(cookStateOf("Cá hồi (Atlantic, nuôi) nấu chín")).toBe("cooked");
    expect(cookStateOf("Ức gà phi lê")).toBeNull();
  });
});

describe("yieldGroupOf", () => {
  it("puts meat, fish, rice, pasta and noodles in their group", () => {
    expect(yieldGroupOf(food("a", "Ức gà phi lê"))).toBe("meat");
    expect(yieldGroupOf(food("a", "Thịt bò nạc"))).toBe("meat");
    expect(yieldGroupOf(food("a", "Cá hồi"))).toBe("fish");
    expect(yieldGroupOf(food("a", "Cơm trắng (chín)", "tinh_bot"))).toBe("rice");
    expect(yieldGroupOf(food("a", "Gạo trắng", "tinh_bot"))).toBe("rice");
    expect(yieldGroupOf(food("a", "Mì ý (khô)", "tinh_bot"))).toBe("pasta");
    expect(yieldGroupOf(food("a", "Bún khô", "tinh_bot"))).toBe("noodle");
  });

  it("puts tubers, dry legumes and other grains in the research groups", () => {
    expect(yieldGroupOf(food("a", "Khoai mật", "tinh_bot"))).toBe("tuber");
    expect(yieldGroupOf(food("a", "Củ cái (khoai cái)", "tinh_bot"))).toBe("tuber");
    expect(yieldGroupOf(food("a", "Đậu lăng đỏ (hạt khô)"))).toBe("legume");
    expect(yieldGroupOf(food("a", "Yến mạch", "tinh_bot"))).toBe("grain");
    expect(yieldGroupOf(food("a", "Quinoa (hạt khô)", "tinh_bot"))).toBe("grain");
    expect(yieldGroupOf(food("a", "Hạt kê (khô)", "tinh_bot"))).toBe("grain");
  });

  it("leaves eggs, tofu, processed meat and other groups out", () => {
    expect(yieldGroupOf(food("a", "Trứng gà"))).toBeNull();
    expect(yieldGroupOf(food("a", "Đậu hũ trắng"))).toBeNull();
    expect(yieldGroupOf(food("a", "Chả lụa"))).toBeNull();
    expect(yieldGroupOf(food("a", "Cá ngừ đóng hộp"))).toBeNull();
    expect(yieldGroupOf(food("a", "Chuối", "trai_cay"))).toBeNull();
    // Vegetables named củ or đậu, fresh or cooked beans with no dry weight, sweet corn
    expect(yieldGroupOf(food("a", "Củ cải trắng (sống)", "rau"))).toBeNull();
    expect(yieldGroupOf(food("a", "Đậu que (sống)", "rau"))).toBeNull();
    expect(yieldGroupOf(food("a", "Đậu đen (luộc)"))).toBeNull();
    expect(yieldGroupOf(food("a", "Bắp/ngô ngọt", "tinh_bot"))).toBeNull();
  });

  it("puts offal in its own group", () => {
    expect(yieldGroupOf(food("a", "Gan gà"))).toBe("offal");
    expect(yieldGroupOf(food("a", "Tim heo"))).toBe("offal");
    expect(yieldGroupOf(food("a", "Lưỡi bò"))).toBe("offal");
  });

  it("uses the research medians of every group", () => {
    // raw-cooked-group-yields.json, cooked g per 100 g raw: meat_poultry 74, offal 66, fish 78, rice 272, pasta 238,
    // noodle_dry 346, tuber 100, legume 252, other_grains 460
    expect(COOKED_PER_RAW).toEqual({ meat: 0.74, offal: 0.66, fish: 0.78, rice: 2.72, pasta: 2.38, noodle: 3.46, tuber: 1, legume: 2.52, grain: 4.6 });
  });
});

describe("ownCookState", () => {
  it("takes the name's marker, else cơm is cooked and the rest raw", () => {
    expect(ownCookState(food("a", "Cá chép (nấu chín)"))).toBe("cooked");
    expect(ownCookState(food("a", "Cơm gạo lứt", "tinh_bot"))).toBe("cooked");
    expect(ownCookState(food("a", "Ức gà phi lê"))).toBe("raw");
  });
});

describe("nameStem", () => {
  it("drops the state so a raw row and its cooked row match", () => {
    expect(nameStem("Cá lóc (cá quả, sống)")).toBe(nameStem("Cá lóc (nấu chín)"));
    expect(nameStem("Bún khô")).toBe(nameStem("Bún khô (luộc)"));
    expect(nameStem("Củ dền sống")).toBe(nameStem("Củ dền luộc"));
    expect(nameStem("Cá chép (sống)")).not.toBe(nameStem("Cá chim (nấu chín)"));
  });
});

describe("cookSwitchFor", () => {
  const raw = food("raw", "Cá chép (sống)");
  const cooked = food("cooked", "Cá chép (nấu chín)");
  const grilled = food("grilled", "Cá chép (nướng)");
  const catalog = [raw, grilled, cooked, food("x", "Cá chim (nấu chín)")];

  it("finds the paired row, preferring nấu chín", () => {
    expect(cookSwitchFor(raw, catalog, true)).toEqual({ own: "raw", pair: cooked, factor: 0.78 });
    expect(cookSwitchFor(cooked, catalog, true)?.pair).toBe(raw);
  });

  it("falls back to the yield factor when the pair cannot be swapped in", () => {
    expect(cookSwitchFor(raw, catalog, false)).toEqual({ own: "raw", pair: null, factor: 0.78 });
  });

  it("has a factor for chicken with no cooked row", () => {
    expect(cookSwitchFor(food("g", "Ức gà phi lê"), [], true)).toEqual({ own: "raw", pair: null, factor: 0.74 });
  });

  it("shows no switch where raw or cooked does not matter or nothing converts", () => {
    expect(cookSwitchFor(food("b", "Chuối", "trai_cay"), [], true)).toBeNull();
    expect(cookSwitchFor(food("e", "Trứng gà"), [], true)).toBeNull();
    // A vegetable with no plain cooked row has no switch
    const cabbage = food("c1", "Bắp cải (sống)", "rau");
    expect(cookSwitchFor(cabbage, [cabbage], true)).toBeNull();
    // A fried or stir-fried row is a dish of its own, never the cooked state
    const greens = food("m1", "Rau muống", "rau");
    expect(cookSwitchFor(greens, [greens, food("m2", "Rau muống xào", "rau")], true)).toBeNull();
  });

  it("cc-67: a vegetable and its plain cooked row switch both ways", () => {
    const cabbage = food("c1", "Bắp cải (sống)", "rau");
    const boiled = food("c2", "Bắp cải (luộc)", "rau");
    expect(cookSwitchFor(cabbage, [cabbage, boiled], true)).toEqual({ own: "raw", pair: boiled, factor: null });
    expect(cookSwitchFor(boiled, [cabbage, boiled], true)).toEqual({ own: "cooked", pair: cabbage, factor: null });
    // The raw row may say nothing
    const greens = food("m1", "Rau muống", "rau");
    const greensBoiled = food("m3", "Rau muống luộc", "rau");
    expect(cookSwitchFor(greensBoiled, [greens, greensBoiled], true)?.pair).toBe(greens);
  });

  it("keeps tubers and legumes when they have a pair", () => {
    const beans = food("d1", "Đậu đen (hạt khô)");
    const boiled = food("d2", "Đậu đen (luộc)");
    expect(cookSwitchFor(beans, [beans, boiled], true)?.pair).toBe(boiled);
    const tuber = food("t1", "Củ từ (sống)", "tinh_bot");
    const tuberCooked = food("t2", "Củ từ (luộc)", "tinh_bot");
    expect(cookSwitchFor(tuber, [tuber, tuberCooked], true)).toEqual({ own: "raw", pair: tuberCooked, factor: 1 });
  });

  it("converts tubers, dry legumes and grains with no cooked row by the group yield", () => {
    expect(cookSwitchFor(food("y", "Yến mạch", "tinh_bot"), [], true)).toEqual({ own: "raw", pair: null, factor: 4.6 });
    expect(cookSwitchFor(food("l", "Đậu lăng đỏ (hạt khô)"), [], true)).toEqual({ own: "raw", pair: null, factor: 2.52 });
    expect(cookSwitchFor(food("k", "Khoai mật", "tinh_bot"), [], true)).toEqual({ own: "raw", pair: null, factor: 1 });
    expect(cookSwitchFor(food("n", "Bắp/ngô ngọt", "tinh_bot"), [], true)).toBeNull();
  });
});

describe("cookState in the data wins over the name", () => {
  it("the roasted chicken breast (FDC 171477) is cooked though its name says nothing", () => {
    expect(ownCookState({ ...food("g", "Ức gà phi lê"), cookState: "cooked" })).toBe("cooked");
  });
});

/** A live row: the API's source and source_id, as raw-cooked-pairs.json keys them */
const live = (id: string, nameVi: string, source: string, sourceId: string, category: FoodItem["category"] = "dam"): FoodItem => ({
  ...food(id, nameVi, category),
  source: source as FoodItem["source"],
  sourceId,
});

describe("raw-cooked-pairs.json (by source + source_id) comes first", () => {
  const xoi = live("xoi", "Xôi trắng (nếp đồ)", "usda_sr_legacy", "FDC 169711", "tinh_bot");
  const nep = live("nep", "Gạo nếp (hạt khô)", "usda_sr_legacy", "FDC 168883", "tinh_bot");
  const nepCai = live("nep-cai", "Gạo nếp cái (hạt khô)", "vn_nin", "NIN 1001", "tinh_bot");

  it("a cooked row with no state word is cooked, with its raw row and yield", () => {
    // The name alone reads as raw
    expect(ownCookState({ ...xoi, sourceId: undefined })).toBe("raw");
    expect(ownCookState(xoi)).toBe("cooked");
    expect(cookSwitchFor(xoi, [xoi, nep], true)).toEqual({ own: "cooked", pair: nep, factor: 3.83 });
    const xoiCam = live("xoi-cam", "Xôi nếp cẩm", "vn_nin", "NIN 1024002", "tinh_bot");
    expect(cookSwitchFor(xoiCam, [], true)).toEqual({ own: "cooked", pair: null, factor: 1.5 });
  });

  it("a cooked row whose word the name heuristic does not know (hầm) is cooked", () => {
    const stew = live("bap-ham", "Bắp bò (hầm)", "usda_sr_legacy", "FDC 169442");
    const raw = live("bap", "Bắp bò (sống)", "usda_sr_legacy", "FDC 169441");
    expect(cookSwitchFor(stew, [raw, stew], true)).toEqual({ own: "cooked", pair: raw, factor: 0.65 });
    expect(cookSwitchFor(raw, [raw, stew], true)).toEqual({ own: "raw", pair: stew, factor: 0.65 });
  });

  it("a raw row with several cooked rows prefers luộc, and takes the yield of the row it logs", () => {
    const breast = live("uc", "Ức gà", "usda_sr_legacy", "FDC 171077");
    const boiled = live("uc-luoc", "Ức gà luộc", "usda_sr_legacy", "FDC 171478");
    const grilled = live("uc-nuong", "Ức gà nướng", "usda_sr_legacy", "FDC 171477");
    expect(cookSwitchFor(breast, [grilled, boiled, breast], true)).toEqual({ own: "raw", pair: boiled, factor: 0.78 });
    expect(cookSwitchFor(breast, [grilled, breast], true)).toEqual({ own: "raw", pair: grilled, factor: 0.73 });
    expect(cookSwitchFor(breast, [breast], true)).toEqual({ own: "raw", pair: null, factor: 0.78 });
    // Editing an entry: the food stays, the yield still comes from the pairs
    expect(cookSwitchFor(breast, [grilled, boiled, breast], false)).toEqual({ own: "raw", pair: null, factor: 0.78 });
  });

  it("a cooked row with several raw rows logs the first one the catalogue has", () => {
    expect(cookSwitchFor(xoi, [xoi, nepCai, nep], true)).toEqual({ own: "cooked", pair: nep, factor: 3.83 });
    expect(cookSwitchFor(xoi, [xoi, nepCai], true)).toEqual({ own: "cooked", pair: nepCai, factor: 3.68 });
  });

  it("matches on source and source_id, not on the name or the id", () => {
    const sameName = live("other", "Gạo nếp (hạt khô)", "vn_nin", "NIN 9999", "tinh_bot");
    expect(cookSwitchFor(xoi, [xoi, sameName], true)?.pair).toBeNull();
  });

  it("reaches pairs the name rules leave out (fresh peas filed as vegetables, egg noodles), but never eggs", () => {
    const peas = live("peas", "Đậu Hà Lan (hạt, sống)", "usda_sr_legacy", "FDC 170419", "rau");
    expect(cookSwitchFor(peas, [], true)).toEqual({ own: "raw", pair: null, factor: 0.96 });
    const eggNoodles = live("mi-trung", "Mì trứng khô (sợi khô)", "usda_sr_legacy", "FDC 169731:mi-trung-kho", "tinh_bot");
    expect(cookSwitchFor(eggNoodles, [], true)).toEqual({ own: "raw", pair: null, factor: 2.82 });
    const egg = live("egg", "Trứng gà (sống)", "usda_sr_legacy", "FDC 171287");
    expect(cookSwitchFor(egg, [egg, live("egg-b", "Trứng gà luộc", "usda_sr_legacy", "FDC 173424")], true)).toBeNull();
  });

  it("cookState from the API still wins", () => {
    expect(ownCookState({ ...xoi, cookState: "raw" })).toBe("raw");
  });
});
