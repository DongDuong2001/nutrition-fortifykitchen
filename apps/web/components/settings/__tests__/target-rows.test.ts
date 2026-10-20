import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { targetSections } from "../target-rows";
import type { Profile } from "../../../lib/profile";
import { NO_COACHING } from "../../../lib/coaching-link";

// The sample user: Nam, 65 kg, Giữ cân, 60 phút. Expected values are the design's copy (design/v2/cai-dat.html).
const SAMPLE: Profile = {
  sex: "male",
  // 23 in 2026: the 19–30 stage of the DRI
  birthYear: 2003,
  weightKg: 65,
  goal: "maintain",
  periodMode: false,
  trainingMinutesDefault: 60,
  displayName: "",
  ...NO_COACHING,
};

function row(profile: Profile, sectionTitle: string, label: string) {
  const section = targetSections(profile).find((s) => s.title === sectionTitle);
  const found = section?.rows.find((r) => r.label === label);
  if (!found) throw new Error(`missing row ${label} in ${sectionTitle}`);
  return found;
}

// The age comes from the year of birth: pin the year so the band does not move with the calendar
beforeAll(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-19T08:00:00+07:00") }));
afterAll(() => vi.useRealTimers());

describe("targetSections", () => {
  it("lists the three sections in design order", () => {
    expect(targetSections(SAMPLE).map((s) => s.title)).toEqual([
      "Năng lượng và đa lượng",
      "Khoáng chất",
      "Vitamin và khoáng khác",
    ]);
  });

  it("gives the sample user the energy and macro rows at the upper end, one number each", () => {
    expect(row(SAMPLE, "Năng lượng và đa lượng", "Kcal")).toEqual({
      label: "Kcal",
      detail: "Giữ cân: 35 kcal/kg × 65 kg",
      value: "2.275 kcal",
    });
    expect(row(SAMPLE, "Năng lượng và đa lượng", "Đạm")).toMatchObject({ detail: "2,2 g/kg × 65 kg", value: "143 g" });
    expect(row(SAMPLE, "Năng lượng và đa lượng", "Chất béo")).toMatchObject({ detail: "1 g/kg × 65 kg", value: "65 g" });
    expect(row(SAMPLE, "Năng lượng và đa lượng", "Tinh bột")).toMatchObject({ value: "280 g" });
    // Fiber is provisional, not a coach rule: marked "*", and the detail names the rule and the cap
    expect(row(SAMPLE, "Năng lượng và đa lượng", "Chất xơ*")).toEqual({
      label: "Chất xơ*",
      detail: "14 g mỗi 1.000 kcal, tối đa 40 g",
      value: "32 g",
    });
  });

  it("cc-73b: gives the sample user the DRI amounts for a man of 19–30, with who they are for and the maximum under each", () => {
    // Salt stays the coach's training formula and a range
    expect(row(SAMPLE, "Khoáng chất", "Muối")).toMatchObject({ value: "7–10,5 g", detail: "Nền 4–6 g + 1–1,5 g mỗi 20 phút tập" });
    expect(row(SAMPLE, "Khoáng chất", "Potassium")).toMatchObject({ value: "3.400 mg", detail: "DRI, nam 19–30 tuổi", max: undefined });
    expect(row(SAMPLE, "Khoáng chất", "Calcium")).toMatchObject({ value: "1.000 mg", max: "Tối đa 2.500 mg" });
    expect(row(SAMPLE, "Khoáng chất", "Magnesium")).toMatchObject({ value: "400 mg", max: "Tối đa 350 mg, chỉ tính từ thực phẩm bổ sung" });
    expect(row(SAMPLE, "Khoáng chất", "Iron")).toMatchObject({ value: "8 mg", max: "Tối đa 45 mg" });
    expect(row(SAMPLE, "Khoáng chất", "Zinc")).toMatchObject({ value: "11 mg", max: "Tối đa 40 mg" });
  });

  it("uses the goal's kcal per kg", () => {
    const build = { ...SAMPLE, goal: "build" as const };
    expect(row(build, "Năng lượng và đa lượng", "Kcal")).toMatchObject({
      detail: "Tăng cơ: 40 kcal/kg × 65 kg",
      value: "2.600 kcal",
    });
    expect(row({ ...SAMPLE, goal: "cut" as const }, "Năng lượng và đa lượng", "Kcal")).toMatchObject({ detail: "Giảm mỡ: 30 kcal/kg × 65 kg", value: "1.950 kcal" });
    const deepCut = { ...SAMPLE, goal: "deep_cut" as const };
    expect(row(deepCut, "Năng lượng và đa lượng", "Kcal")).toMatchObject({ value: "1.625 kcal" });
  });

  it("gives a woman her own amounts, and iron 28 mg in the period", () => {
    const woman = { ...SAMPLE, sex: "female" as const };
    expect(row(woman, "Khoáng chất", "Iron")).toMatchObject({ value: "18 mg", detail: "DRI, nữ 19–30 tuổi" });
    expect(row(woman, "Khoáng chất", "Zinc")).toMatchObject({ value: "8 mg" });
    expect(row(woman, "Khoáng chất", "Potassium")).toMatchObject({ value: "2.600 mg" });
    expect(row(woman, "Năng lượng và đa lượng", "Chất xơ*")).toMatchObject({ value: "30 g", detail: "14 g mỗi 1.000 kcal, tối đa 30 g" });
    // In the period iron is the coach's 28 mg, the other rows stay DRI
    expect(row({ ...woman, periodMode: true }, "Khoáng chất", "Iron")).toMatchObject({ value: "28 mg", detail: "Gần/đang trong kỳ: quy tắc của huấn luyện viên" });
  });

  it("names the life stage of the age: a woman of 30 is 19–30, at 31 she is 31–50", () => {
    expect(row({ ...SAMPLE, sex: "female" as const, birthYear: 1996 }, "Khoáng chất", "Calcium").detail).toBe("DRI, nữ 19–30 tuổi");
    expect(row({ ...SAMPLE, sex: "female" as const, birthYear: 1995 }, "Khoáng chất", "Magnesium")).toMatchObject({ detail: "DRI, nữ 31–50 tuổi", value: "320 mg" });
  });

  it("gives a child and a teenager their own amounts and limits", () => {
    expect(row({ ...SAMPLE, birthYear: 2015 }, "Khoáng chất", "Calcium")).toMatchObject({ value: "1.300 mg", detail: "DRI, nam 9–13 tuổi", max: "Tối đa 3.000 mg" });
    expect(row({ ...SAMPLE, birthYear: 2010 }, "Khoáng chất", "Magnesium")).toMatchObject({ value: "410 mg", detail: "DRI, nam 14–18 tuổi" });
    expect(row({ ...SAMPLE, birthYear: 2010 }, "Khoáng chất", "Zinc")).toMatchObject({ max: "Tối đa 34 mg" });
  });

  it("lists the 16 other DRI amounts with their units and their maximum", () => {
    const vitamins = targetSections(SAMPLE)[2].rows;
    expect(vitamins).toHaveLength(16);
    expect(vitamins[0]).toMatchObject({ label: "Vitamin A", value: "900 µg", max: "Tối đa 3.000 µg" });
    expect(vitamins[1]).toMatchObject({ label: "Vitamin C", value: "90 mg", max: "Tối đa 2.000 mg" });
    expect(vitamins[4]).toMatchObject({ label: "Vitamin K", value: "120 µg", max: undefined });
    expect(vitamins[5]).toMatchObject({ label: "Vitamin B1", value: "1,2 mg", max: undefined });
    expect(vitamins[7]).toMatchObject({ label: "Vitamin B3", value: "16 mg", max: "Tối đa 35 mg, chỉ tính từ thực phẩm bổ sung" });
    expect(vitamins[11]).toMatchObject({ label: "Vitamin B12", value: "2,4 µg", max: undefined });
    expect(vitamins[10]).toMatchObject({ label: "Folate", value: "400 µg", max: "Tối đa 1.000 µg, chỉ tính từ thực phẩm bổ sung" });
    expect(vitamins[12]).toMatchObject({ label: "Copper", value: "0,9 mg", max: "Tối đa 10 mg" });
    expect(vitamins[13]).toMatchObject({ label: "Manganese", value: "2,3 mg", max: "Tối đa 11 mg" });
    expect(vitamins[15]).toMatchObject({ label: "Selenium", value: "55 µg", max: "Tối đa 400 µg" });
  });

  describe("custom targets (a flag that is off)", () => {
    const custom = { ...SAMPLE, customTargets: { calcium: 1200 } };

    it("with the flag off no row can be tapped and a saved custom target is not read", () => {
      const calcium = row(custom, "Khoáng chất", "Calcium");
      expect(calcium).toMatchObject({ value: "1.000 mg", editable: false, custom: false });
    });

    it("with it on a row is tappable, shows the custom amount marked tự đặt and keeps the default to go back to", () => {
      const sections = targetSections(custom, true);
      const calcium = sections[1].rows.find((r) => r.label === "Calcium");
      expect(calcium).toMatchObject({ id: "calcium", value: "1.200 mg", editable: true, custom: true, defaultValue: 1000, max: "Tối đa 2.500 mg" });
      expect(sections[1].rows.find((r) => r.label === "Zinc")).toMatchObject({ value: "11 mg", editable: true, custom: false });
      // the salt row has its own formula: never tappable
      expect(sections[1].rows.find((r) => r.label === "Muối")?.editable).toBeUndefined();
    });
  });
});
