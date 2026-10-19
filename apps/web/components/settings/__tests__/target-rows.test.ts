import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { targetSections } from "../target-rows";
import type { Profile } from "../../../lib/profile";
import { NO_COACHING } from "../../../lib/coaching-link";

// The sample user: Nam, 65 kg, Giữ cân, 60 phút. Expected values are the design's copy (design/v2/cai-dat.html).
const SAMPLE: Profile = {
  sex: "male",
  // 23 in 2026: the 20–29 band of VN 2016
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

  it("gives the sample user the design's energy and macro rows", () => {
    expect(row(SAMPLE, "Năng lượng và đa lượng", "Kcal")).toEqual({
      label: "Kcal",
      detail: "Giữ cân: 30–35 kcal/kg × 65 kg",
      value: "1.950–2.275 kcal",
    });
    expect(row(SAMPLE, "Năng lượng và đa lượng", "Đạm")).toMatchObject({
      detail: "1,6–2,2 g/kg × 65 kg",
      value: "104–143 g",
    });
    expect(row(SAMPLE, "Năng lượng và đa lượng", "Chất béo")).toMatchObject({ value: "33–65 g" });
    expect(row(SAMPLE, "Năng lượng và đa lượng", "Tinh bột")).toMatchObject({ value: "254 g" });
    // Fiber is provisional, not a coach rule: marked "*", and the detail names the rule without repeating the range
    expect(row(SAMPLE, "Năng lượng và đa lượng", "Chất xơ*")).toEqual({
      label: "Chất xơ*",
      detail: "14 g mỗi 1.000 kcal, giới hạn theo giới tính",
      value: "30–40 g",
    });
  });

  it("cc-67: gives the sample user the VN 2016 amounts for a man of 20–29, with who they are for", () => {
    expect(row(SAMPLE, "Khoáng chất", "Muối")).toMatchObject({ value: "5 g", detail: "Dưới 5 g mỗi ngày (2.000 mg natri), VN 2016, nam 20–29 tuổi" });
    expect(row(SAMPLE, "Khoáng chất", "Potassium")).toMatchObject({ value: "2.500 mg", detail: "VN 2016, nam 20–29 tuổi" });
    expect(row(SAMPLE, "Khoáng chất", "Calcium")).toMatchObject({ value: "800 mg" });
    expect(row(SAMPLE, "Khoáng chất", "Magnesium")).toMatchObject({ value: "340 mg" });
    expect(row(SAMPLE, "Khoáng chất", "Iron")).toMatchObject({ value: "7,9 mg" });
    expect(row(SAMPLE, "Khoáng chất", "Zinc")).toMatchObject({ value: "10 mg" });
  });

  it("uses the goal's kcal per kg", () => {
    const build = { ...SAMPLE, goal: "build" as const };
    expect(row(build, "Năng lượng và đa lượng", "Kcal")).toMatchObject({
      detail: "Tăng cơ: 35–40 kcal/kg × 65 kg",
      value: "2.275–2.600 kcal",
    });
    const deepCut = { ...SAMPLE, goal: "deep_cut" as const };
    expect(row(deepCut, "Năng lượng và đa lượng", "Kcal")).toMatchObject({ value: "1.300–1.625 kcal" });
  });

  it("gives a woman her own amounts, and the period switch is gone", () => {
    const woman = { ...SAMPLE, sex: "female" as const };
    expect(row(woman, "Khoáng chất", "Iron")).toMatchObject({ value: "17,4 mg", detail: "VN 2016, nữ 20–29 tuổi" });
    expect(row(woman, "Khoáng chất", "Zinc")).toMatchObject({ value: "8 mg" });
    expect(row(woman, "Khoáng chất", "Potassium")).toMatchObject({ value: "2.000 mg" });
    expect(row({ ...woman, periodMode: true }, "Khoáng chất", "Iron")).toMatchObject({ value: "17,4 mg" });
  });

  it("lists the 16 other VN 2016 amounts with their units", () => {
    const vitamins = targetSections(SAMPLE)[2].rows;
    expect(vitamins).toHaveLength(16);
    expect(vitamins[0]).toMatchObject({ label: "Vitamin A", value: "850 µg" });
    expect(vitamins[1]).toMatchObject({ label: "Vitamin C", value: "100 mg" });
    expect(vitamins[4]).toMatchObject({ label: "Vitamin K", value: "150 µg" });
    expect(vitamins[5]).toMatchObject({ label: "Vitamin B1", value: "1,3 mg" });
    expect(vitamins[7]).toMatchObject({ label: "Vitamin B3", value: "16 mg" });
    expect(vitamins[11]).toMatchObject({ label: "Vitamin B12", value: "2,4 µg" });
    expect(vitamins[10]).toMatchObject({ label: "Folate", value: "400 µg" });
    expect(vitamins[12]).toMatchObject({ label: "Copper" });
    expect(vitamins[13]).toMatchObject({ label: "Manganese", value: "2,3 mg" });
    expect(vitamins[15]).toMatchObject({ label: "Selenium", value: "34 µg" });
  });
});
