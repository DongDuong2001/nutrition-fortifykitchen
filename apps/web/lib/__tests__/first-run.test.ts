import { describe, it, expect } from "vitest";
import {
  countStoredEntries,
  firstRunState,
  isNewUser,
  isTabRoute,
  setupRedirectFor,
  setupSummary,
  summaryAddHref,
} from "../first-run";
import { SAMPLE_PROFILE } from "../profile";

describe("lib/first-run", () => {
  it("no saved profile: setup is still needed", () => {
    expect(firstRunState({ profileSaved: false, entryEverLogged: false })).toBe("needs-setup");
    expect(firstRunState({ profileSaved: false, entryEverLogged: true })).toBe("needs-setup");
  });

  it("a profile and no entry ever: the first meal is next", () => {
    expect(firstRunState({ profileSaved: true, entryEverLogged: false })).toBe("needs-first-meal");
  });

  it("a profile and at least one entry: a returning user", () => {
    expect(firstRunState({ profileSaved: true, entryEverLogged: true })).toBe("ready");
  });

  it("isNewUser is true for both unfinished states", () => {
    expect(isNewUser({ profileSaved: false, entryEverLogged: false })).toBe(true);
    expect(isNewUser({ profileSaved: true, entryEverLogged: false })).toBe(true);
    expect(isNewUser({ profileSaved: true, entryEverLogged: true })).toBe(false);
  });

  it("counts entries in a stored JSON array, and 0 for anything else", () => {
    expect(countStoredEntries('[{"id":"a"},{"id":"b"}]')).toBe(2);
    expect(countStoredEntries("[]")).toBe(0);
    expect(countStoredEntries(null)).toBe(0);
    expect(countStoredEntries("not json")).toBe(0);
    expect(countStoredEntries('{"id":"a"}')).toBe(0);
  });

  // cc-73b: the upper end of the coach's range: 35 kcal/kg and 2,2 g/kg protein for "Giữ cân" at 65 kg
  it("summary for the sample profile: 2.275 kcal and protein 143 g", () => {
    const summary = setupSummary(SAMPLE_PROFILE);
    expect(summary.energy).toBe("2.275 kcal");
    expect(summary.protein).toBe("143 g");
    expect(summary.line).toBe("Mục tiêu mỗi ngày: 2.275 kcal · đạm 143 g");
  });

  // Coach rules for 65 kg, Giữ cân, 60 min of training: fat 1 g/kg, carbs = (energy - protein x 4 - fat x 9) / 4 = 279,5 → 280,
  // salt 4–6 g + 1–1,5 g per 20 min
  it("the day targets list: Năng lượng, Đạm, Chất béo, Tinh bột and Muối with the default training minutes", () => {
    const { targets } = setupSummary(SAMPLE_PROFILE);
    expect(targets.map((t) => [t.label, t.value])).toEqual([
      ["Năng lượng", "2.275 kcal"],
      ["Đạm", "143 g"],
      ["Chất béo", "65 g"],
      ["Tinh bột", "280 g"],
      ["Muối", "7–10,5 g"],
    ]);
    expect(targets.find((t) => t.label === "Muối")?.hint).toBe("Ngày tập 60′");
  });

  it("salt follows the default training minutes, and a rest default says Nghỉ", () => {
    const rest = setupSummary({ ...SAMPLE_PROFILE, trainingMinutesDefault: 0 }).targets.find((t) => t.label === "Muối");
    expect(rest?.value).toBe("4–6 g");
    expect(rest?.hint).toBe("Ngày nghỉ");
  });

  it("tab routes are the app screens, not the coach link page, auth, setup, offline or install", () => {
    for (const path of ["/app", "/explore", "/explore/meals", "/settings", "/settings/profile", "/add", "/micros", "/micros/calcium", "/training", "/trends/body"]) {
      expect(isTabRoute(path), path).toBe(true);
    }
    for (const path of ["/", "/signin", "/signup", "/reset-password", "/setup/profile", "/setup/done", "/offline", "/install", "/login", "/foods/food-cha-la", "/entry/item-1"]) {
      expect(isTabRoute(path), path).toBe(false);
    }
  });

  it("no profile outside demo mode sends a tab route to /setup/profile, and nothing else", () => {
    const none = { profileSaved: false, entryEverLogged: false };
    expect(setupRedirectFor("/app", none, false)).toBe("/setup/profile");
    expect(setupRedirectFor("/app", none, false)).toBe("/setup/profile");
    expect(setupRedirectFor("/signin", none, false)).toBeNull();
    expect(setupRedirectFor("/setup/goal", none, false)).toBeNull();
    expect(setupRedirectFor("/app", none, true)).toBeNull();
    expect(setupRedirectFor("/app", { profileSaved: true, entryEverLogged: false }, false)).toBeNull();
  });

  it("nobody signed in outside demo mode is not a setup question: the sign-in gate decides (no profile can be read)", () => {
    const signedOut = { profileSaved: false, entryEverLogged: false, signedIn: false };
    expect(setupRedirectFor("/app", signedOut, false)).toBeNull();
    expect(setupRedirectFor("/app", { ...signedOut, signedIn: true }, false)).toBe("/setup/profile");
    expect(setupRedirectFor("/app", signedOut, true)).toBeNull();
  });

  it("the first meal opens the add sheet for the meal of the clock", () => {
    expect(summaryAddHref(new Date("2026-10-13T08:00:00+07:00"))).toBe("/add?meal=breakfast");
    expect(summaryAddHref(new Date("2026-10-13T12:00:00+07:00"))).toBe("/add?meal=lunch");
    expect(summaryAddHref(new Date("2026-10-13T18:30:00+07:00"))).toBe("/add?meal=dinner");
    expect(summaryAddHref(new Date("2026-10-13T23:30:00+07:00"))).toBe("/add?meal=snack");
  });
});
