import { describe, expect, it } from "vitest";
import { MATCH_LABEL, coverageText, isProxy, matchOf, microCoverage, searchTag } from "../food-source";
import { MOCK_FOODS } from "../mock/foods";
import { COUNTED_NUTRIENT_KEYS } from "../day-totals";

describe("food source helpers", () => {
  it("a food with no match is unknown, never exact", () => {
    expect(matchOf({})).toBe("unknown");
    expect(MATCH_LABEL.unknown.name).toBe("Chưa rõ nguồn");
    expect(matchOf({ match: "close" })).toBe("close");
    expect(isProxy({ match: "proxy" })).toBe(true);
    expect(isProxy({})).toBe(false);
  });

  it("names the three match levels", () => {
    expect(MATCH_LABEL.exact.detail).toBe("đúng món");
    expect(MATCH_LABEL.close.detail).toBe("cùng món, khác cách chế biến");
    expect(MATCH_LABEL.proxy.detail).toBe("món tương tự");
  });

  it("tags a search result by database, with Ước tính in amber for a proxy", () => {
    expect(searchTag({ source: "USDA" })).toEqual({ label: "USDA", warning: false });
    expect(searchTag({ source: "VN FCT" })).toEqual({ label: "VN", warning: false });
    expect(searchTag({ source: "user" })).toEqual({ label: "Của tôi", warning: false });
    expect(searchTag({ source: "VN FCT", match: "proxy" })).toEqual({ label: "Ước tính", warning: true });
    expect(searchTag({ source: "USDA", match: "close" })).toEqual({ label: "USDA", warning: false });
  });

  it("reads every database code the catalogue can carry", () => {
    // usda*: any USDA database (usda_sr_legacy, usda_foundation, usda_fndds, the mock "USDA")
    for (const source of ["USDA", "usda", "usda_sr_legacy", "usda_foundation", "usda_fndds"]) {
      expect(searchTag({ source })).toEqual({ label: "USDA", warning: false });
    }
    expect(searchTag({ source: "label" })).toEqual({ label: "Nhãn", warning: false });
    expect(searchTag({ source: "VN FCT" })).toEqual({ label: "VN", warning: false });
    expect(searchTag({ source: "vn_table" })).toEqual({ label: "VN", warning: false });
    expect(searchTag({ source: "community" })).toEqual({ label: "Ước tính", warning: true });
    expect(searchTag({ source: "user" })).toEqual({ label: "Của tôi", warning: false });
  });

  it("says Chưa rõ for a source it does not know, or none", () => {
    expect(searchTag({ source: "literature" })).toEqual({ label: "Chưa rõ", warning: false });
    expect(searchTag({ source: "asean" })).toEqual({ label: "Chưa rõ", warning: false });
    expect(searchTag({ source: "" })).toEqual({ label: "Chưa rõ", warning: false });
    expect(searchTag({})).toEqual({ label: "Chưa rõ", warning: false });
  });

  it("a proxy says Ước tính whatever its source, and match decides before the source", () => {
    for (const source of ["usda_sr_legacy", "label", "VN FCT", "community", "user", "literature", undefined]) {
      expect(searchTag({ source, match: "proxy" })).toEqual({ label: "Ước tính", warning: true });
    }
    expect(searchTag({ source: "label", match: "close" })).toEqual({ label: "Nhãn", warning: false });
    expect(searchTag({ source: "community", match: "exact" })).toEqual({ label: "Ước tính", warning: true });
  });

  it("counts only the counted micros with a number (0 counts, null and missing do not)", () => {
    const n: Record<string, number | null> = { energy: 100, protein: 3, calcium: 0, iron: null, b12: 1.2 };
    expect(microCoverage({ nutrients: n })).toEqual({ known: 2, total: 22 });
    expect(microCoverage({ nutrients: {} }).known).toBe(0);
    const all = Object.fromEntries(COUNTED_NUTRIENT_KEYS.map((k) => [k, 1]));
    expect(microCoverage({ nutrients: all })).toEqual({ known: 22, total: 22 });
  });

  it("writes the coverage row with the dash note unless everything is known", () => {
    expect(coverageText({ nutrients: { calcium: 5 } })).toBe("1/22 vi chất · các chất còn lại hiện “—”");
    const all = Object.fromEntries(COUNTED_NUTRIENT_KEYS.map((k) => [k, 1]));
    expect(coverageText({ nutrients: all })).toBe("22/22 vi chất");
  });
});

describe("mock catalogue sources", () => {
  it("gives every food an explicit match and a source reference", () => {
    for (const f of MOCK_FOODS) {
      expect(f.match, f.id).toBeDefined();
      expect(f.sourceRef?.db, f.id).toBeTruthy();
      expect(f.sourceRef?.id, f.id).toBeTruthy();
    }
  });

  it("marks every food with a real source id and link as not verified until someone has checked it", () => {
    const linked = MOCK_FOODS.filter((f) => f.sourceRef?.url);
    expect(linked.length).toBeGreaterThanOrEqual(10);
    for (const f of linked) expect(f.sourceRef?.verified, f.id).toBe(false);
    for (const f of MOCK_FOODS) expect(f.sourceRef?.verified, f.id).toBe(false);
  });

  it("claims no exact match or verified source until someone has checked", () => {
    expect(MOCK_FOODS.filter((f) => f.match === "exact" || f.sourceRef?.verified)).toEqual([]);
  });

  it("has at least two proxy foods", () => {
    expect(MOCK_FOODS.filter((f) => f.match === "proxy").length).toBeGreaterThanOrEqual(2);
  });

  it("gives USDA foods a source reference that links to FoodData Central", () => {
    const withRef = MOCK_FOODS.filter((f) => f.source === "USDA" && f.sourceRef?.url);
    expect(withRef.length).toBeGreaterThanOrEqual(10);
    const dates = MOCK_FOODS.find((f) => f.id === "food-cha-la");
    expect(dates?.sourceRef).toEqual({ db: "SR Legacy", id: "FDC 168191", url: "https://fdc.nal.usda.gov/food-details/168191/nutrients", verified: false });
    for (const f of withRef) expect(f.sourceRef?.url).toMatch(/^https:\/\/fdc\.nal\.usda\.gov\/food-details\/\d+\/nutrients$/);
  });
});
