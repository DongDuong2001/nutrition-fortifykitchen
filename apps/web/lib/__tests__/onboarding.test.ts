import { describe, it, expect } from "vitest";
import {
  parseWeightKg,
  parseBirthYear,
  validateSetupDraft,
  isValidEmail,
  goalOptions,
  dailyTargetRows,
  resendLabel,
  type SetupDraft,
} from "../onboarding";

// Expected values come from the coach rules in design/SPEC.md, not from lib/targets.ts.
// 65 kg, Giữ cân (30–35 kcal/kg) => 1.950–2.275 kcal; protein 1,6–2,2 g/kg => 104–143 g;
// fat 0,5–1 g/kg => 33–65 g; potassium 80–100 mg/kg => 5.200–6.500 mg.

describe("onboarding input parsing", () => {
  it("parses a weight with a dot or a comma decimal", () => {
    expect(parseWeightKg("65")).toBe(65);
    expect(parseWeightKg(" 65 ")).toBe(65);
    expect(parseWeightKg("65.5")).toBe(65.5);
    expect(parseWeightKg("65,5")).toBe(65.5);
  });

  it("returns null for a weight that is not a number", () => {
    expect(parseWeightKg("")).toBeNull();
    expect(parseWeightKg("abc")).toBeNull();
  });

  it("parses a birth year and rejects non-numeric input", () => {
    expect(parseBirthYear("2003")).toBe(2003);
    expect(parseBirthYear("20x3")).toBeNull();
    expect(parseBirthYear("")).toBeNull();
  });
});

describe("validateSetupDraft", () => {
  const draft: SetupDraft = { sex: "male", birthYear: "2003", weight: "65", goal: "maintain" };

  it("returns the profile when every field is valid", () => {
    const result = validateSetupDraft(draft, 2026);
    expect(result.profile).toEqual({ sex: "male", birthYear: 2003, weightKg: 65, goal: "maintain" });
    expect(result.errors).toEqual({});
  });

  it("flags a birth year in the future and a missing weight", () => {
    const result = validateSetupDraft({ ...draft, birthYear: "2030", weight: "" }, 2026);
    expect(result.profile).toBeUndefined();
    expect(result.errors.birthYear).toBeTruthy();
    expect(result.errors.weight).toBeTruthy();
  });

  it("flags a weight outside 30–300 kg", () => {
    expect(validateSetupDraft({ ...draft, weight: "5" }, 2026).errors.weight).toBeTruthy();
    expect(validateSetupDraft({ ...draft, weight: "301" }, 2026).errors.weight).toBeTruthy();
  });
});

describe("isValidEmail", () => {
  it("accepts a normal address and rejects malformed ones", () => {
    expect(isValidEmail("ban@email.com")).toBe(true);
    expect(isValidEmail("ban@")).toBe(false);
    expect(isValidEmail("a b@c.d")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("goalOptions", () => {
  it("lists the four goals in design order with the kcal range for the weight", () => {
    const options = goalOptions(65);
    expect(options.map((o) => o.goal)).toEqual(["build", "maintain", "cut", "deep_cut"]);
    expect(options.map((o) => o.name)).toEqual(["Tăng cơ", "Giữ cân", "Giảm mỡ", "Giảm mỡ nhanh"]);
    // 65 kg × 35–40, 30–35, 25–30, 20–25 kcal/kg
    expect(options.map((o) => o.kcal)).toEqual(["2.275–2.600", "1.950–2.275", "1.625–1.950", "1.300–1.625"]);
  });
});

describe("goal and target rows without a valid weight", () => {
  it("shows a dash for each goal's kcal while the weight is not valid yet", () => {
    expect(goalOptions(null).map((o) => o.kcal)).toEqual(["—", "—", "—", "—"]);
  });

  it("shows no target rows while the weight is not valid yet", () => {
    expect(dailyTargetRows(null, "male", "maintain")).toEqual([]);
  });
});

describe("dailyTargetRows", () => {
  it("shows energy and macro/mineral targets from lib/targets.ts for the profile", () => {
    expect(dailyTargetRows(65, "male", "maintain")).toEqual([
      { label: "Năng lượng", value: "1.950–2.275 kcal" },
      { label: "Đạm (1,6–2,2 g/kg)", value: "104–143 g" },
      { label: "Béo (0,5–1 g/kg)", value: "33–65 g" },
      { label: "Kali (80–100 mg/kg)", value: "5.200–6.500 mg" },
    ]);
  });
});

describe("resendLabel", () => {
  it("counts down before the link can be sent again", () => {
    expect(resendLabel(45)).toBe("Gửi lại liên kết (sau 45 giây)");
    expect(resendLabel(0)).toBe("Gửi lại liên kết");
  });
});
