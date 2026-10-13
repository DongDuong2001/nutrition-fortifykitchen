import { describe, expect, it } from "vitest";
import { profileSummary, profileTitle, sexLabel } from "../profile-summary";

describe("profileSummary", () => {
  it("reads the sample user as the design does", () => {
    const sample = { sex: "male", birthYear: 2003, weightKg: 65, goal: "maintain", periodMode: false, trainingMinutesDefault: 60, displayName: "" } as const;
    expect(profileSummary(sample)).toBe("Nam · sinh 2003 · 65 kg · Giữ cân");
  });

  it("keeps one decimal in the weight with a comma", () => {
    const profile = { sex: "female", birthYear: 1990, weightKg: 70.5, goal: "build", periodMode: false, trainingMinutesDefault: 0, displayName: "" } as const;
    expect(profileSummary(profile)).toBe("Nữ · sinh 1990 · 70,5 kg · Tăng cơ");
  });

  it("labels the sexes in Vietnamese", () => {
    expect(sexLabel("male")).toBe("Nam");
    expect(sexLabel("female")).toBe("Nữ");
  });
});

describe("profileTitle", () => {
  const base = { sex: "male", birthYear: 2003, weightKg: 65, goal: "maintain", periodMode: false, trainingMinutesDefault: 60 } as const;

  it("is the name when one is set", () => {
    expect(profileTitle({ ...base, displayName: "Hao" })).toBe("Hao");
  });

  it("is Hồ sơ của bạn when no name is set", () => {
    expect(profileTitle({ ...base, displayName: "" })).toBe("Hồ sơ của bạn");
  });
});
