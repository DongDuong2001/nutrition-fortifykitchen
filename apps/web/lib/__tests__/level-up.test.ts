import { describe, expect, it } from "vitest";
import { levelUpReady, type LevelUpGate } from "../level-up";

// prompts/day-level-ui-1023.md §5 Trigger: level > levelSeen, never over unsaved work, only after Có gì mới is closed.

const calm: LevelUpGate = { step: { from: 2, to: 3 }, onHome: true, unsavedWork: false, whatsNewOpen: false, busy: false };

describe("levelUpReady", () => {
  it("plays on Hôm nay when nothing is in the way", () => {
    expect(levelUpReady(calm)).toBe(true);
  });

  it("not without a promotion (a lower or the same Level never plays)", () => {
    expect(levelUpReady({ ...calm, step: null })).toBe(false);
  });

  it("never over unsaved work (a tray, an open portion, a typed field)", () => {
    expect(levelUpReady({ ...calm, unsavedWork: true })).toBe(false);
  });

  it("waits while Có gì mới or its tour is open", () => {
    expect(levelUpReady({ ...calm, whatsNewOpen: true })).toBe(false);
  });

  it("waits while Hôm nay has a sheet open or is choosing foods, and off Hôm nay", () => {
    expect(levelUpReady({ ...calm, busy: true })).toBe(false);
    expect(levelUpReady({ ...calm, onHome: false })).toBe(false);
  });
});
