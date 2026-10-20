import { describe, expect, it } from "vitest";
import { applyCustomTargets, CUSTOM_TARGETS_ENABLED, CUSTOM_TARGET_IDS, isCustom, parseCustomAmount, parseCustomTargets, withCustomTarget } from "../custom-targets";
import { calculateTargets } from "../targets";

// cc-73b: a custom daily target for one vitamin or mineral. The feature is behind a flag that stays off (the API has no field
// for it yet: docs/pr/cc-73b-custom-targets.md).
const BASE = calculateTargets({ sex: "male", weightKg: 65, goal: "maintain", age: 25 });

describe("the flag", () => {
  it("is off", () => expect(CUSTOM_TARGETS_ENABLED).toBe(false));
});

describe("which nutrients can be set", () => {
  it("are the 21 DRI vitamins and minerals, not salt and not the macros", () => {
    expect(CUSTOM_TARGET_IDS).toHaveLength(21);
    expect(CUSTOM_TARGET_IDS).toContain("calcium");
    expect(CUSTOM_TARGET_IDS).not.toContain("sodium");
    expect(CUSTOM_TARGET_IDS).not.toContain("protein");
  });
});

describe("parseCustomTargets", () => {
  it("keeps known nutrients with a positive number and drops the rest", () => {
    expect(parseCustomTargets({ calcium: 1200, zinc: -1, iron: 0, b12: "3", sodium: 2000, nope: 5, vitamin_c: Infinity })).toEqual({ calcium: 1200 });
  });
  it("is undefined when nothing is left, or the value is not an object", () => {
    expect(parseCustomTargets({ zinc: 0 })).toBeUndefined();
    expect(parseCustomTargets(null)).toBeUndefined();
    expect(parseCustomTargets([1, 2])).toBeUndefined();
    expect(parseCustomTargets("calcium")).toBeUndefined();
  });
});

describe("parseCustomAmount", () => {
  it("reads a comma or a dot as the decimal mark", () => {
    expect(parseCustomAmount("1,5")).toEqual({ value: 1.5 });
    expect(parseCustomAmount(" 2.25 ")).toEqual({ value: 2.25 });
    expect(parseCustomAmount("1200")).toEqual({ value: 1200 });
  });
  it("says why an amount is not one", () => {
    expect(parseCustomAmount("")).toEqual({ error: "Nhập một số lớn hơn 0" });
    expect(parseCustomAmount("0")).toEqual({ error: "Nhập một số lớn hơn 0" });
    expect(parseCustomAmount("abc")).toEqual({ error: "Nhập một số lớn hơn 0" });
    expect(parseCustomAmount("1.2.3")).toEqual({ error: "Nhập một số lớn hơn 0" });
    expect(parseCustomAmount("100001")).toEqual({ error: "Số này quá lớn" });
  });
});

describe("withCustomTarget", () => {
  it("sets one nutrient and keeps the others", () => {
    expect(withCustomTarget({ zinc: 12 }, "calcium", 1200)).toEqual({ zinc: 12, calcium: 1200 });
  });
  it("goes back to the default (Về mặc định) by removing it, and is undefined when none is left", () => {
    expect(withCustomTarget({ zinc: 12, calcium: 1200 }, "calcium", null)).toEqual({ zinc: 12 });
    expect(withCustomTarget({ calcium: 1200 }, "calcium", null)).toBeUndefined();
  });
  it("ignores a nutrient that cannot be set", () => {
    expect(withCustomTarget({ zinc: 12 }, "sodium", 2000)).toEqual({ zinc: 12 });
  });
});

describe("applyCustomTargets", () => {
  it("puts the custom amount in place of the DRI one, one value, and leaves the rest as they are", () => {
    const t = applyCustomTargets(BASE, { calcium: 1200 });
    expect(t.calcium).toEqual({ min: 1200, max: 1200 });
    expect(t.zinc).toBe(BASE.zinc);
    expect(t.sodium).toBe(BASE.sodium);
    expect(t.calories).toBe(BASE.calories);
  });
  it("is the same targets with no custom amount", () => {
    expect(applyCustomTargets(BASE, undefined)).toBe(BASE);
  });
  it("marks which are custom", () => {
    expect(isCustom({ calcium: 1200 }, "calcium")).toBe(true);
    expect(isCustom({ calcium: 1200 }, "zinc")).toBe(false);
    expect(isCustom(undefined, "zinc")).toBe(false);
  });
});
