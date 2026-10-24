import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// feat/sound-goals §2: one cue plays the haptic and the sound from one table, so they never drift.

vi.mock("../haptics", () => ({ haptic: vi.fn() }));
vi.mock("../sound", () => ({ playSound: vi.fn() }));

const { haptic } = await import("../haptics");
const { playSound } = await import("../sound");
const { CUE_HAPTICS, TIER_CUE, cue, cueSound } = await import("../cue");
const { SETTINGS_STORAGE_KEY } = await import("../settings");

/** The account's storage with the settings the test names. */
const withSettings = (settings: object) => ({ getItem: (k: string) => (k === SETTINGS_STORAGE_KEY ? JSON.stringify(settings) : null), setItem: () => undefined, removeItem: () => undefined });

describe("cue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(haptic).mockClear();
    vi.mocked(playSound).mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pairs each sound with its haptic (the agreed table)", () => {
    expect(CUE_HAPTICS).toEqual({ add: "saved", remove: "delete", undo: "undo", save: "saved", goal: "goal100", day: "goal100", full: "goal100" });
  });

  it("plays the haptic and the sound of the kind, with the Âm thanh switch read from the settings", () => {
    const storage = withSettings({ sound: false });
    cue("remove", storage);
    expect(haptic).toHaveBeenCalledWith("delete", storage);
    expect(playSound).toHaveBeenCalledWith("remove", false);
  });

  it("the switch untouched is null (on by default); switched on is true", () => {
    cue("add", withSettings({}));
    expect(playSound).toHaveBeenLastCalledWith("add", null);
    cue("add", withSettings({ sound: true }));
    expect(playSound).toHaveBeenLastCalledWith("add", true);
  });

  it("no storage: the default (null)", () => {
    cue("undo", null);
    expect(playSound).toHaveBeenLastCalledWith("undo", null);
  });

  it("cueSound is the sound alone, no haptic (Level-up already vibrates; the Âm thanh switch does not)", () => {
    cueSound("full", withSettings({ sound: false }));
    expect(playSound).toHaveBeenCalledWith("full", false);
    expect(haptic).not.toHaveBeenCalled();
  });

  it("full vibrates goal100 twice, 120 ms apart (15·60·15, 120, 15·60·15)", () => {
    cue("full", null);
    expect(haptic).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(209);
    expect(haptic).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(haptic).toHaveBeenCalledTimes(2);
    expect(haptic).toHaveBeenLastCalledWith("goal100", null);
  });

  it("a moment's tier picks its sound: T1 goal, T2 day, T3 full", () => {
    expect(TIER_CUE).toEqual({ 1: "goal", 2: "day", 3: "full" });
  });
});
