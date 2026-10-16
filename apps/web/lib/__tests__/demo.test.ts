import { afterEach, describe, expect, it } from "vitest";
import { DEMO_KEY, demoActive, demoBuildAllowed, resolveDemo, setDemoActive } from "../demo";
import { dayEntries } from "../day-history";
import { weightLogSample } from "../mock/weight-log";

describe("lib/demo resolveDemo in a production build without DEMO_BUILD=1", () => {
  it("has no demo: ?demo and the saved flag do nothing, in mock mode too", () => {
    const keep = { demo: false, flag: "keep" };
    expect(resolveDemo({ nodeEnv: "production", stored: "1", search: "" })).toEqual(keep);
    expect(resolveDemo({ nodeEnv: "production", stored: null, search: "?demo=1" })).toEqual(keep);
    expect(resolveDemo({ nodeEnv: "production", stored: null, search: "?demo=1", demoBuild: "" })).toEqual(keep);
    expect(resolveDemo({ nodeEnv: "production", stored: null, search: "?demo=1", demoBuild: "1" })).toEqual({ demo: true, flag: "set" });
    expect(demoBuildAllowed("production", undefined)).toBe(false);
    expect(demoBuildAllowed("production", "1")).toBe(true);
    expect(demoBuildAllowed("development", undefined)).toBe(true);
    expect(demoBuildAllowed("test", undefined)).toBe(true);
  });
});

describe("lib/demo resolveDemo in live mode", () => {
  it("has no demo whatever the environment, the saved flag or the URL says", () => {
    const keep = { demo: false, flag: "keep" };
    expect(resolveDemo({ nodeEnv: "development", stored: null, search: "", live: true })).toEqual(keep);
    expect(resolveDemo({ nodeEnv: "production", demoBuild: "1", stored: "1", search: "", live: true })).toEqual(keep);
    expect(resolveDemo({ nodeEnv: "production", demoBuild: "1", stored: null, search: "?demo=1", live: true })).toEqual(keep);
  });
});

describe("lib/demo resolveDemo", () => {
  it("is on in development, off in production and test", () => {
    expect(resolveDemo({ nodeEnv: "development", stored: null, search: "" }).demo).toBe(true);
    expect(resolveDemo({ nodeEnv: "production", demoBuild: "1", stored: null, search: "" }).demo).toBe(false);
    expect(resolveDemo({ nodeEnv: "test", stored: null, search: "" }).demo).toBe(false);
  });

  it("is on when the saved flag is 1, off for anything else", () => {
    expect(resolveDemo({ nodeEnv: "production", demoBuild: "1", stored: "1", search: "" }).demo).toBe(true);
    expect(resolveDemo({ nodeEnv: "production", demoBuild: "1", stored: "0", search: "" }).demo).toBe(false);
    expect(resolveDemo({ nodeEnv: "production", demoBuild: "1", stored: "yes", search: "" }).demo).toBe(false);
  });

  it("?demo=1 turns it on and asks to save the flag", () => {
    expect(resolveDemo({ nodeEnv: "production", demoBuild: "1", stored: null, search: "?demo=1" })).toEqual({ demo: true, flag: "set" });
    expect(resolveDemo({ nodeEnv: "production", demoBuild: "1", stored: null, search: "?p=7&demo=1" })).toEqual({ demo: true, flag: "set" });
  });

  it("?demo=0 turns a saved flag off and asks to clear it", () => {
    expect(resolveDemo({ nodeEnv: "production", demoBuild: "1", stored: "1", search: "?demo=0" })).toEqual({ demo: false, flag: "clear" });
  });

  it("another ?demo value changes nothing", () => {
    expect(resolveDemo({ nodeEnv: "production", demoBuild: "1", stored: "1", search: "?demo=2" })).toEqual({ demo: true, flag: "keep" });
    expect(resolveDemo({ nodeEnv: "production", demoBuild: "1", stored: null, search: "?demo=" })).toEqual({ demo: false, flag: "keep" });
  });

  it("uses the same key the probes set", () => {
    expect(DEMO_KEY).toBe("h1t_demo_v1");
  });
});

describe("sample data only exists in demo mode", () => {
  afterEach(() => setDemoActive(true));

  it("history, sample weights and the flag follow setDemoActive", () => {
    setDemoActive(true);
    expect(demoActive()).toBe(true);
    expect(dayEntries("2026-10-12", "2026-10-13").length).toBeGreaterThan(0);
    expect(weightLogSample("2026-10-13").length).toBe(30);

    setDemoActive(false);
    expect(demoActive()).toBe(false);
    expect(dayEntries("2026-10-12", "2026-10-13")).toEqual([]);
    expect(weightLogSample("2026-10-13")).toEqual([]);
  });
});
