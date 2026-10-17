import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HAPTIC_PATTERNS, firstGoalToday, haptic, hapticsWanted } from "../haptics";
import { saveSettings } from "../settings";

// cc-51 Part C: Android vibration (iOS has no navigator.vibrate: nothing happens there).

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
}

describe("HAPTIC_PATTERNS", () => {
  it("is the agreed table", () => {
    expect(HAPTIC_PATTERNS).toEqual({ saved: 10, longPress: 20, moveDrop: 8, delete: [10, 40, 10], undo: 10, error: 60, goal100: [15, 60, 15] });
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

describe("haptic", () => {
  const vibrate = vi.fn(() => true);
  let storage: ReturnType<typeof memoryStorage>;
  beforeEach(() => {
    storage = memoryStorage();
    vibrate.mockClear();
    vi.stubGlobal("navigator", { vibrate });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
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
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    haptic("saved", storage);
    expect(vibrate).not.toHaveBeenCalled();
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
