import { describe, it, expect } from "vitest";
import {
  countStoredEntries,
  firstRunState,
  isNewUser,
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

  // Expected values from HANDOFF.md: 30–35 kcal/kg and 1,6–2,2 g/kg protein for "Giữ cân" at 65 kg
  it("summary for the sample profile: 1.950–2.275 kcal and protein 104–143 g", () => {
    const summary = setupSummary(SAMPLE_PROFILE);
    expect(summary.energy).toBe("1.950–2.275 kcal");
    expect(summary.protein).toBe("104–143 g");
    expect(summary.line).toBe("Mục tiêu mỗi ngày: 1.950–2.275 kcal · đạm 104–143 g");
  });

  it("the first meal opens the add sheet for the meal of the clock", () => {
    expect(summaryAddHref(new Date("2026-10-13T08:00:00+07:00"))).toBe("/add?meal=breakfast");
    expect(summaryAddHref(new Date("2026-10-13T12:00:00+07:00"))).toBe("/add?meal=lunch");
    expect(summaryAddHref(new Date("2026-10-13T18:30:00+07:00"))).toBe("/add?meal=dinner");
    expect(summaryAddHref(new Date("2026-10-13T23:30:00+07:00"))).toBe("/add?meal=snack");
  });
});
