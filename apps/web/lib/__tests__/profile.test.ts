import { describe, it, expect } from "vitest";
import {
  SAMPLE_PROFILE,
  applyProfileTargets,
  cleanDisplayName,
  normaliseProfile,
  parseStoredProfile,
  profileFromDraft,
  profileToDraft,
  targetRangeText,
  targetsFor,
  type Profile,
} from "../profile";
import { SAMPLE_DAY } from "../mock/sample-day";

// Expected values come from the coach rules in design/SPEC.md, not from lib/targets.ts.
// 65 kg, Giữ cân (30–35 kcal/kg) => 1.950–2.275 kcal; potassium 80–100 mg/kg => 5.200–6.500 mg.
// 70 kg, Giữ cân => 2.100–2.450 kcal; potassium 5.600–7.000 mg.
// Iron: men 8–10 mg; women 18 mg, or 28 mg in the period.

const YEAR = 2026;
const WOMAN: Profile = { ...SAMPLE_PROFILE, sex: "female" };

describe("sample profile", () => {
  it("is the sample-day user: male, 65 kg, Giữ cân, 60 minutes of training", () => {
    expect(SAMPLE_PROFILE).toMatchObject({
      sex: "male",
      birthYear: 2003,
      weightKg: 65,
      goal: "maintain",
      periodMode: false,
      trainingMinutesDefault: 60,
    });
  });

  it("gives the sample-day targets at 65 kg", () => {
    const t = targetsFor(SAMPLE_PROFILE);
    expect(t.calories).toEqual({ min: 1950, max: 2275 });
    expect(t.potassium).toEqual({ min: 5200, max: 6500 });
    expect(t.iron).toEqual({ min: 8, max: 8 });
    expect(t.sodium).toEqual({ min: 2750, max: 4130 });
  });

  it("gives 2.100–2.450 kcal and 5.600–7.000 mg potassium at 70 kg", () => {
    const t = targetsFor({ ...SAMPLE_PROFILE, weightKg: 70 });
    expect(t.calories).toEqual({ min: 2100, max: 2450 });
    expect(t.potassium).toEqual({ min: 5600, max: 7000 });
  });

  it("sets iron to 28 mg for a woman in the period, 18 mg otherwise", () => {
    expect(targetsFor({ ...WOMAN, periodMode: true }).iron).toEqual({ min: 28, max: 28 });
    expect(targetsFor({ ...WOMAN, periodMode: false }).iron).toEqual({ min: 18, max: 18 });
  });

  it("ignores the period setting for men", () => {
    expect(targetsFor({ ...SAMPLE_PROFILE, periodMode: true }).iron).toEqual({ min: 8, max: 8 });
  });
});

describe("normaliseProfile", () => {
  it("turns the period setting off for a man", () => {
    expect(normaliseProfile({ ...SAMPLE_PROFILE, periodMode: true }).periodMode).toBe(false);
  });

  it("keeps the period setting for a woman", () => {
    expect(normaliseProfile({ ...WOMAN, periodMode: true }).periodMode).toBe(true);
  });
});

describe("parseStoredProfile", () => {
  const stored = (value: unknown) => JSON.stringify(value);
  const valid = {
    sex: "female",
    birthYear: 1995,
    weightKg: 58,
    goal: "cut",
    periodMode: true,
    trainingMinutesDefault: 45,
    displayName: "Hao",
  };

  it("reads a valid stored profile", () => {
    // An old profile has no role, Level or coach: it loads as user, Level 0, no coach
    expect(parseStoredProfile(stored(valid), YEAR)).toEqual({ ...valid, role: "user", level: 0, coach: null, levelSeen: 0, hintSeen: false });
  });

  it("reads the role, Level and coach when they are stored", () => {
    const coach = { id: "coach-khanh", name: "HLV Khánh" };
    const profile = parseStoredProfile(stored({ ...valid, role: "coach", level: 3, coach, levelSeen: 2, hintSeen: true }), YEAR);
    expect(profile).toMatchObject({ role: "coach", level: 3, coach, levelSeen: 2, hintSeen: true });
  });

  it("repairs a Level with no coach to Level 0", () => {
    expect(parseStoredProfile(stored({ ...valid, level: 4 }), YEAR)).toMatchObject({ level: 0, coach: null });
  });

  it("returns null when nothing is stored or the text is not JSON", () => {
    expect(parseStoredProfile(null, YEAR)).toBeNull();
    expect(parseStoredProfile("{not json", YEAR)).toBeNull();
    expect(parseStoredProfile("42", YEAR)).toBeNull();
  });

  it("rejects a weight or birth year outside the setup ranges", () => {
    expect(parseStoredProfile(stored({ ...valid, weightKg: 29 }), YEAR)).toBeNull();
    expect(parseStoredProfile(stored({ ...valid, weightKg: 301 }), YEAR)).toBeNull();
    expect(parseStoredProfile(stored({ ...valid, birthYear: YEAR + 1 }), YEAR)).toBeNull();
    expect(parseStoredProfile(stored({ ...valid, birthYear: 1899 }), YEAR)).toBeNull();
  });

  it("rejects an unknown sex or goal", () => {
    expect(parseStoredProfile(stored({ ...valid, sex: "other" }), YEAR)).toBeNull();
    expect(parseStoredProfile(stored({ ...valid, goal: "bulk" }), YEAR)).toBeNull();
  });

  it("fills in the period and training defaults when they are missing or invalid", () => {
    const parsed = parseStoredProfile(
      stored({ sex: "male", birthYear: 2003, weightKg: 65, goal: "maintain", trainingMinutesDefault: 9999 }),
      YEAR,
    );
    expect(parsed).toMatchObject({ periodMode: false, trainingMinutesDefault: 60, displayName: "" });
  });

  it("keeps a stored name trimmed, and drops one that is too long", () => {
    expect(parseStoredProfile(stored({ ...valid, displayName: "  Hao  " }), YEAR)).toMatchObject({ displayName: "Hao" });
    expect(parseStoredProfile(stored({ ...valid, displayName: "a".repeat(41) }), YEAR)).toMatchObject({ displayName: "" });
  });
});

describe("display name", () => {
  it("is not set by default", () => {
    expect(SAMPLE_PROFILE.displayName).toBe("");
  });

  it("is trimmed when saved", () => {
    expect(cleanDisplayName("  Thảo Nguyên  ")).toBe("Thảo Nguyên");
  });
});

describe("profileToDraft", () => {
  it("gives the setup form fields, which read back to the same profile", () => {
    const draft = profileToDraft({ ...SAMPLE_PROFILE, weightKg: 65.5 });
    expect(draft).toEqual({ sex: "male", birthYear: "2003", weight: "65.5", goal: "maintain" });
    expect(profileFromDraft(draft, SAMPLE_PROFILE, YEAR)?.weightKg).toBe(65.5);
  });
});

describe("profileFromDraft", () => {
  it("builds a profile from the setup draft, keeping the other fields of the base", () => {
    const profile = profileFromDraft(
      { sex: "male", birthYear: "1990", weight: "70", goal: "build" },
      SAMPLE_PROFILE,
      YEAR,
    );
    expect(profile).toEqual({ ...SAMPLE_PROFILE, birthYear: 1990, weightKg: 70, goal: "build" });
  });

  it("returns null for a weight the setup form rejects", () => {
    expect(profileFromDraft({ sex: "male", birthYear: "2003", weight: "29", goal: "maintain" }, SAMPLE_PROFILE, YEAR)).toBeNull();
  });
});

describe("targetRangeText", () => {
  it("shows a range with a dot thousands separator, or one value", () => {
    expect(targetRangeText({ min: 1950, max: 2275 }, "kcal")).toBe("1.950–2.275 kcal");
    expect(targetRangeText({ min: 28, max: 28 }, "mg")).toBe("28 mg");
    expect(targetRangeText({ min: 1200, max: 1500 }, "mg")).toBe("1.200–1.500 mg");
    expect(targetRangeText({ min: 1200, max: 1200 }, "mg")).toBe("1.200 mg");
  });
});

describe("applyProfileTargets", () => {
  it("keeps the sample-day targets for the sample profile", () => {
    const day = applyProfileTargets(SAMPLE_DAY, SAMPLE_PROFILE, targetsFor(SAMPLE_PROFILE));
    expect(day.calories).toMatchObject({ targetMin: 1950, targetMax: 2275 });
    const potassium = day.minerals.find((m) => m.key === "potassium");
    expect(potassium).toMatchObject({ targetMin: 5200, targetMax: 6500 });
  });

  it("moves the calorie and potassium targets when the weight changes to 70 kg", () => {
    const profile = { ...SAMPLE_PROFILE, weightKg: 70 };
    const day = applyProfileTargets(SAMPLE_DAY, profile, targetsFor(profile));
    expect(day.calories).toMatchObject({ targetMin: 2100, targetMax: 2450 });
    const potassium = day.minerals.find((m) => m.key === "potassium");
    expect(potassium).toMatchObject({ targetMin: 5600, targetMax: 7000 });
    expect(day.user).toMatchObject({ weightKg: 70, goalLabel: "Giữ cân" });
  });

  it("recalculates the percentage of a target that moved", () => {
    const profile = { ...SAMPLE_PROFILE, weightKg: 70 };
    const day = applyProfileTargets(SAMPLE_DAY, profile, targetsFor(profile));
    const potassium = day.minerals.find((m) => m.key === "potassium");
    expect(potassium?.percentage).toBe(Math.round(((potassium?.consumed ?? 0) / 5600) * 100));
  });

  it("shows iron as a single 28 mg target for a woman in the period", () => {
    const profile = { ...WOMAN, periodMode: true };
    const day = applyProfileTargets(SAMPLE_DAY, profile, targetsFor(profile));
    const iron = day.minerals.find((m) => m.key === "iron");
    expect(iron).toMatchObject({ targetMin: 28 });
    expect(iron?.targetMax).toBeUndefined();
  });
});
