import { describe, expect, it } from "vitest";
import { targetSections } from "../target-rows";
import type { Profile } from "../../../lib/profile";

// The sample user: Nam, 65 kg, Giữ cân, 60 phút. Expected values are the design's copy (design/v2/cai-dat.html).
const SAMPLE: Profile = {
  sex: "male",
  birthYear: 2003,
  weightKg: 65,
  goal: "maintain",
  periodMode: false,
  trainingMinutesDefault: 60,
  displayName: "",
};

function row(profile: Profile, sectionTitle: string, label: string) {
  const section = targetSections(profile).find((s) => s.title === sectionTitle);
  const found = section?.rows.find((r) => r.label === label);
  if (!found) throw new Error(`missing row ${label} in ${sectionTitle}`);
  return found;
}

describe("targetSections", () => {
  it("lists the three sections in design order", () => {
    expect(targetSections(SAMPLE).map((s) => s.title)).toEqual([
      "Năng lượng và đa lượng",
      "Khoáng chất",
      "Vitamin và khoáng khác*",
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

  it("gives the sample user the design's mineral rows", () => {
    expect(row(SAMPLE, "Khoáng chất", "Muối")).toMatchObject({ value: "7–10,5 g" });
    expect(row(SAMPLE, "Khoáng chất", "Kali")).toMatchObject({ value: "5.200–6.500 mg" });
    expect(row(SAMPLE, "Khoáng chất", "Canxi")).toMatchObject({ value: "1.200–1.500 mg" });
    expect(row(SAMPLE, "Khoáng chất", "Magie")).toMatchObject({ value: "600–750 mg" });
    expect(row(SAMPLE, "Khoáng chất", "Sắt")).toMatchObject({ value: "8 mg" });
    expect(row(SAMPLE, "Khoáng chất", "Kẽm")).toMatchObject({ value: "12 mg" });
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

  it("gives women iron 18 mg, or 28 mg in period mode", () => {
    const woman = { ...SAMPLE, sex: "female" as const };
    expect(row(woman, "Khoáng chất", "Sắt")).toMatchObject({ value: "18 mg" });
    expect(row(woman, "Khoáng chất", "Kẽm")).toMatchObject({ value: "8 mg" });
    expect(row({ ...woman, periodMode: true }, "Khoáng chất", "Sắt")).toMatchObject({ value: "28 mg" });
  });

  it("lists the 16 VN 2016 reference values with their units", () => {
    const vitamins = targetSections(SAMPLE)[2].rows;
    expect(vitamins).toHaveLength(16);
    expect(vitamins[0]).toMatchObject({ label: "Vitamin A", value: "650 µg" });
    expect(vitamins[1]).toMatchObject({ label: "Vitamin C", value: "100 mg" });
    expect(vitamins[4]).toMatchObject({ label: "Vitamin K", value: "150 µg" });
    expect(vitamins[5]).toMatchObject({ label: "Vitamin B1", value: "1,2 mg" });
    expect(vitamins[7]).toMatchObject({ label: "Vitamin B3", value: "16 mg" });
    expect(vitamins[11]).toMatchObject({ label: "Vitamin B12", value: "2,4 µg" });
    expect(vitamins[13]).toMatchObject({ label: "Mangan", value: "2,3 mg" });
    expect(vitamins[15]).toMatchObject({ label: "Selen", value: "34 µg" });
  });
});
