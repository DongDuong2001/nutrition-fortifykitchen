import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
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
  TARGET_SETTING_KEYS,
  mergeServerProfile,
  targetSettingsOf,
  touchesTargetSettings,
} from "../profile";
import { mapApiProfileToProfile } from "../api-client";
import { SAMPLE_DAY } from "../mock/sample-day";

// Expected values come from the coach rules (energy: the upper end, 35 kcal/kg for Giữ cân) and from the US DRI (the micros), not from lib/targets.ts.
// 65 kg, Giữ cân => 2.275 kcal. 70 kg, Giữ cân => 2.450 kcal.
// cc-73b: the micros follow sex and age, not the weight: a man of 23 has potassium 3.400 mg, iron 8 mg (sodium stays the training formula);
// a woman of 23 has iron 18 mg. The age is the year less the year of birth: pin the year.
beforeAll(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-19T08:00:00+07:00") }));
afterAll(() => vi.useRealTimers());

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
    expect(t.calories).toEqual({ min: 2275, max: 2275 });
    expect(t.potassium).toEqual({ min: 3400, max: 3400 });
    expect(t.iron).toEqual({ min: 8, max: 8 });
    expect(t.sodium).toEqual({ min: 2750, max: 4130 });
  });

  it("gives 2.450 kcal at 70 kg and the same micros (they do not follow the weight)", () => {
    const t = targetsFor({ ...SAMPLE_PROFILE, weightKg: 70 });
    expect(t.calories).toEqual({ min: 2450, max: 2450 });
    expect(t.potassium).toEqual({ min: 3400, max: 3400 });
  });

  it("gives a woman iron 28 mg in the period (the coach rule), 18 mg otherwise", () => {
    expect(targetsFor({ ...WOMAN, periodMode: true }).iron).toEqual({ min: 28, max: 28 });
    expect(targetsFor({ ...WOMAN, periodMode: false }).iron).toEqual({ min: 18, max: 18 });
  });

  it("follows the age: the same woman at 55 has 8 mg iron and 1.200 mg calcium", () => {
    const t = targetsFor({ ...WOMAN, birthYear: 1971 });
    expect(t.iron).toEqual({ min: 8, max: 8 });
    expect(t.calcium).toEqual({ min: 1200, max: 1200 });
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
  it("gives the sample day the upper-end energy target for the sample profile, and the micros the DRI's", () => {
    const day = applyProfileTargets(SAMPLE_DAY, SAMPLE_PROFILE, targetsFor(SAMPLE_PROFILE));
    expect(day.calories).toMatchObject({ targetMin: 2275, targetMax: 2275 });
    const potassium = day.minerals.find((m) => m.key === "potassium");
    expect(potassium).toMatchObject({ targetMin: 3400 });
  });

  it("moves the calorie target when the weight changes to 70 kg, and leaves the potassium target", () => {
    const profile = { ...SAMPLE_PROFILE, weightKg: 70 };
    const day = applyProfileTargets(SAMPLE_DAY, profile, targetsFor(profile));
    expect(day.calories).toMatchObject({ targetMin: 2450, targetMax: 2450 });
    const potassium = day.minerals.find((m) => m.key === "potassium");
    expect(potassium).toMatchObject({ targetMin: 3400 });
    expect(day.user).toMatchObject({ weightKg: 70, goalLabel: "Giữ cân" });
  });

  it("recalculates the percentage of a target that moved", () => {
    const profile = { ...SAMPLE_PROFILE, birthYear: 1990 };
    const day = applyProfileTargets(SAMPLE_DAY, profile, targetsFor(profile));
    const magnesium = day.minerals.find((m) => m.key === "magnesium");
    expect(magnesium?.targetMin).toBe(420);
    expect(magnesium?.percentage).toBe(Math.round(((magnesium?.consumed ?? 0) / 420) * 100));
  });

  it("shows iron as a single 18 mg target for a woman of 23", () => {
    const day = applyProfileTargets(SAMPLE_DAY, WOMAN, targetsFor(WOMAN));
    const iron = day.minerals.find((m) => m.key === "iron");
    expect(iron).toMatchObject({ targetMin: 18 });
    expect(iron?.targetMax).toBeUndefined();
  });
});

// backend-sync-1022: the macro split, the custom energy and the custom micro targets are stored on the server (migration 000015).
// Adopting the server's profile (when no profile write is waiting) takes them from the server, except settings this device made
// before they were stored there: those are uploaded once, unless the server's are newer.
describe("mergeServerProfile", () => {
  const split = {
    macroMode: "ratios" as const,
    macroRatios: { proteinPct: 30, carbsPct: 40, fatPct: 30 },
    macroFixed: { proteinGrams: 150, carbsGrams: 200, fatGrams: 60 },
    customEnergyKcal: 2100,
    customTargets: { iron: 20 },
  };
  const SERVER_AT = "2026-10-22T03:00:00.000Z";
  const server: Profile = { ...SAMPLE_PROFILE, weightKg: 68, goal: "cut", displayName: "Lan", updatedAt: SERVER_AT };

  it("names the five synced settings", () => {
    expect([...TARGET_SETTING_KEYS].sort()).toEqual(["customEnergyKcal", "customTargets", "macroFixed", "macroMode", "macroRatios"]);
    expect(Object.keys(targetSettingsOf(SAMPLE_PROFILE)).sort()).toEqual([...TARGET_SETTING_KEYS].sort());
    expect(touchesTargetSettings({ macroMode: undefined })).toBe(true);
    expect(touchesTargetSettings({ weightKg: 70, displayName: "A" })).toBe(false);
  });

  it("takes every other key from the server, as before", () => {
    const { profile } = mergeServerProfile(server, { ...SAMPLE_PROFILE, weightKg: 70, targetsSynced: true });
    expect(profile).toMatchObject({ weightKg: 68, goal: "cut", displayName: "Lan", updatedAt: SERVER_AT, targetsSynced: true });
  });

  it("no local profile: the server's, marked synced", () => {
    expect(mergeServerProfile({ ...server, ...split }, null)).toEqual({ profile: { ...server, ...split, targetsSynced: true, targetsChangedAt: undefined }, upload: false });
  });

  it("a device that has synced: the server's settings win, a clear on another device included", () => {
    const local: Profile = { ...SAMPLE_PROFILE, ...split, targetsSynced: true, targetsChangedAt: Date.parse("2026-10-22T05:00:00Z") };
    const { profile, upload } = mergeServerProfile(server, local);
    expect(upload).toBe(false);
    for (const key of TARGET_SETTING_KEYS) expect(profile[key], key).toBeUndefined();
    const other = mergeServerProfile({ ...server, macroMode: "keto" }, local).profile;
    expect(other.macroMode).toBe("keto");
    expect(other.targetsChangedAt).toBe(local.targetsChangedAt);
  });

  it("device-only settings from before, none on the server: kept and uploaded once", () => {
    const local: Profile = { ...SAMPLE_PROFILE, ...split };
    const { profile, upload } = mergeServerProfile(server, local);
    expect(upload).toBe(true);
    expect(profile).toMatchObject({ ...split, weightKg: 68, targetsSynced: true });
    // The next load is a synced device: the server (which now has them) wins, nothing is uploaded again
    expect(mergeServerProfile({ ...server, ...split }, profile).upload).toBe(false);
  });

  it("both have settings and the server's are newer (or the device's are undated): the server's win", () => {
    const serverSplit: Profile = { ...server, macroMode: "fixed", macroFixed: { proteinGrams: 120, carbsGrams: 250, fatGrams: 70 } };
    const older: Profile = { ...SAMPLE_PROFILE, ...split, targetsChangedAt: Date.parse("2026-10-22T02:59:59Z") };
    const { profile, upload } = mergeServerProfile(serverSplit, older);
    expect(upload).toBe(false);
    expect(profile.macroMode).toBe("fixed");
    expect(profile.macroRatios).toBeUndefined();
    expect(profile.customTargets).toBeUndefined();
    expect(mergeServerProfile(serverSplit, { ...SAMPLE_PROFILE, ...split }).upload).toBe(false);
  });

  it("both have settings and the device's were changed after the server's update: the device's are kept and uploaded", () => {
    const serverSplit: Profile = { ...server, macroMode: "fixed", customEnergyKcal: 3000 };
    const newer: Profile = { ...SAMPLE_PROFILE, macroMode: "ratios", macroRatios: split.macroRatios, targetsChangedAt: Date.parse("2026-10-22T03:00:01Z") };
    const { profile, upload } = mergeServerProfile(serverSplit, newer);
    expect(upload).toBe(true);
    // All five come from the device, so the server's custom kcal is not mixed in
    expect(profile).toMatchObject({ macroMode: "ratios", macroRatios: split.macroRatios, targetsSynced: true });
    expect(profile.customEnergyKcal).toBeUndefined();
  });

  it("a device with no settings has nothing to upload", () => {
    expect(mergeServerProfile(server, { ...SAMPLE_PROFILE }).upload).toBe(false);
  });

  it("the stored profile keeps the sync fields", () => {
    const stored = { ...SAMPLE_PROFILE, ...split, updatedAt: SERVER_AT, targetsChangedAt: 123, targetsSynced: true };
    expect(parseStoredProfile(JSON.stringify(stored), YEAR)).toMatchObject({ updatedAt: SERVER_AT, targetsChangedAt: 123, targetsSynced: true, ...split });
  });
});

describe("mapApiProfileToProfile: the target settings of GET /me", () => {
  const base = { sex: "male", birth_year: 2000, weight_kg: 70, goal: "maintain", updatedAt: "2026-10-22T03:00:00Z" };

  it("reads them, and updatedAt", () => {
    expect(
      mapApiProfileToProfile({
        ...base,
        macroMode: "fixed",
        macroRatios: { proteinPct: 25, carbsPct: 55, fatPct: 20 },
        macroFixed: { proteinGrams: 150, carbsGrams: 200, fatGrams: 60 },
        customEnergyKcal: 2400,
        customTargets: { calcium: 1200 },
      })
    ).toMatchObject({
      macroMode: "fixed",
      macroRatios: { proteinPct: 25, carbsPct: 55, fatPct: 20 },
      macroFixed: { proteinGrams: 150, carbsGrams: 200, fatGrams: 60 },
      customEnergyKcal: 2400,
      customTargets: { calcium: 1200 },
      updatedAt: "2026-10-22T03:00:00Z",
    });
  });

  it("null, missing or malformed is not set", () => {
    const p = mapApiProfileToProfile({ ...base, macroMode: null, macroRatios: { proteinPct: 25 }, macroFixed: null, customEnergyKcal: "2400", customTargets: {} });
    for (const key of TARGET_SETTING_KEYS) expect(p[key], key).toBeUndefined();
    expect(mapApiProfileToProfile({ ...base, macroMode: "high" }).macroMode).toBeUndefined();
  });
});
