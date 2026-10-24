import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HAPTIC_PATTERNS, canVibrate, firstGoalToday, goal100Reached, haptic, hapticsWanted } from "../haptics";
import { saveSettings } from "../settings";

// cc-51 Part C: Android vibration (iOS has no navigator.vibrate: nothing happens there).

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
}

describe("HAPTIC_PATTERNS", () => {
  it("is the agreed table", () => {
    expect(HAPTIC_PATTERNS).toEqual({ saved: 10, longPress: 20, moveDrop: 8, delete: [10, 40, 10], undo: 10, error: 60, goal100: [15, 60, 15], snap: 12, tick: 5, levelUp: [30, 30, 70] });
  });
});

describe("hapticsWanted", () => {
  it("on by default, off when switched off, on when switched on", () => {
    expect(hapticsWanted(null, false)).toBe(true);
    expect(hapticsWanted(false, false)).toBe(false);
    expect(hapticsWanted(true, true)).toBe(true);
  });
  it("reduced motion and a switch never touched: no vibration", () => {
    expect(hapticsWanted(null, true)).toBe(false);
  });
});

/** A window whose matchMedia answers the touch (pointer: coarse) and reduced-motion queries. */
const media = ({ coarse = true, reduced = false } = {}) => ({
  matchMedia: (q: string) => ({ matches: q === "(pointer: coarse)" ? coarse : q === "(prefers-reduced-motion: reduce)" ? reduced : false }),
});

describe("canVibrate (review 07:00: Android phones only)", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("a touch phone with navigator.vibrate (Android)", () => {
    vi.stubGlobal("navigator", { vibrate: () => true });
    vi.stubGlobal("window", media());
    expect(canVibrate()).toBe(true);
  });
  it("desktop Chrome (vibrate, but a mouse): no", () => {
    vi.stubGlobal("navigator", { vibrate: () => true });
    vi.stubGlobal("window", media({ coarse: false }));
    expect(canVibrate()).toBe(false);
  });
  it("iOS (touch, no vibrate): no", () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", media());
    expect(canVibrate()).toBe(false);
  });
});

describe("haptic", () => {
  const vibrate = vi.fn(() => true);
  let storage: ReturnType<typeof memoryStorage>;
  beforeEach(() => {
    storage = memoryStorage();
    vibrate.mockClear();
    vi.stubGlobal("navigator", { vibrate });
    vi.stubGlobal("window", media());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("vibrates with the kind's pattern", () => {
    haptic("delete", storage);
    expect(vibrate).toHaveBeenCalledWith([10, 40, 10]);
  });
  it("the switch off: nothing", () => {
    saveSettings({ haptics: false }, storage);
    haptic("saved", storage);
    expect(vibrate).not.toHaveBeenCalled();
  });
  it("iOS (no navigator.vibrate): nothing, and no error", () => {
    vi.stubGlobal("navigator", {});
    expect(() => haptic("saved", storage)).not.toThrow();
  });
  it("reduced motion with the switch never touched: nothing", () => {
    vi.stubGlobal("window", media({ reduced: true }));
    haptic("saved", storage);
    expect(vibrate).not.toHaveBeenCalled();
  });
  it("desktop Chrome (no coarse pointer): nothing", () => {
    vi.stubGlobal("window", media({ coarse: false }));
    haptic("delete", storage);
    expect(vibrate).not.toHaveBeenCalled();
  });
});

describe("goal100Reached (review 07:00: only after a local add)", () => {
  const firstToday = () => {
    const storage = memoryStorage();
    return (key: string) => firstGoalToday(key, "2026-10-18", storage);
  };

  it("the first read of the day records what is over 100 %, no vibration", () => {
    expect(goal100Reached(new Set(["iron"]), null, false, firstToday())).toBe(false);
  });
  it("a refetch (another device, the poll, pull to refresh) that brings a nutrient to 100 %: no vibration", () => {
    expect(goal100Reached(new Set(["iron"]), new Set(), false, firstToday())).toBe(false);
  });
  it("a local add that brings two nutrients to 100 %: one vibration, then never again that day", () => {
    const first = firstToday();
    let vibrations = 0;
    let before: Set<string> | null = null;
    const look = (over: string[], localAdd: boolean) => {
      if (goal100Reached(new Set(over), before, localAdd, first)) vibrations += 1;
      before = new Set(over);
    };
    look([], false); // the app opens
    look(["iron", "zinc"], true); // a local add
    expect(vibrations).toBe(1);
    look([], true); // deleted
    look(["iron"], true); // added again: iron reached 100 % today already
    expect(vibrations).toBe(1);
  });
  it("a nutrient a refetch brought to 100 % is reached for the day: a later add does not vibrate for it", () => {
    const first = firstToday();
    expect(goal100Reached(new Set(["iron"]), new Set(), false, first)).toBe(false);
    expect(goal100Reached(new Set(["iron"]), new Set(), true, first)).toBe(false);
  });
});

describe("firstGoalToday (goal100 once per nutrient per day)", () => {
  it("true the first time a nutrient reaches 100 % on a day, false after", () => {
    const storage = memoryStorage();
    expect(firstGoalToday("iron", "2026-10-18", storage)).toBe(true);
    expect(firstGoalToday("iron", "2026-10-18", storage)).toBe(false);
    expect(firstGoalToday("calcium", "2026-10-18", storage)).toBe(true);
  });
  it("a new day starts again", () => {
    const storage = memoryStorage();
    firstGoalToday("iron", "2026-10-18", storage);
    expect(firstGoalToday("iron", "2026-10-19", storage)).toBe(true);
  });
});
