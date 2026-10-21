import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimInterruption,
  interruptionBlockedByUi,
  interruptionShown,
  REPORT_GRACE_MS,
  mayInterrupt,
  resetInterruptions,
  setInterruptionDue,
  subscribeInterruption,
} from "../interruption";

// fix/polish-1020 item 1: one interruption per app open, in the order Có gì mới > install pop-up > a tip.

beforeEach(resetInterruptions);

describe("one interruption per app open", () => {
  it("the first to ask opens; nothing else opens after it, whatever its rank", () => {
    expect(claimInterruption("install")).toBe(true);
    expect(interruptionShown()).toBe("install");
    expect(claimInterruption("whats-new")).toBe(false);
    expect(claimInterruption("tip")).toBe(false);
    expect(mayInterrupt("tip")).toBe(false);
  });

  it("a higher-ranked kind that is due holds the lower ones back until it has shown, or is no longer due", () => {
    setInterruptionDue("whats-new", true);
    expect(mayInterrupt("install")).toBe(false);
    expect(mayInterrupt("tip")).toBe(false);
    expect(mayInterrupt("whats-new")).toBe(true);
    setInterruptionDue("whats-new", false);
    expect(mayInterrupt("install")).toBe(true);
  });

  it("the order is Có gì mới, then install, then a tip", () => {
    setInterruptionDue("tip", true);
    setInterruptionDue("install", true);
    setInterruptionDue("whats-new", true);
    expect(claimInterruption("tip")).toBe(false);
    expect(claimInterruption("install")).toBe(false);
    expect(claimInterruption("whats-new")).toBe(true);
    // The app open has had its one: the others do not come after it
    expect(claimInterruption("install")).toBe(false);
    expect(claimInterruption("tip")).toBe(false);
  });

  it("a kind that is due while something lower-ranked is due too does not hold that one back (only higher ranks do)", () => {
    setInterruptionDue("tip", true);
    expect(mayInterrupt("whats-new")).toBe(true);
    expect(mayInterrupt("install")).toBe(true);
  });

  it("tells the hosts when to look again", () => {
    const listener = vi.fn();
    const off = subscribeInterruption(listener);
    setInterruptionDue("whats-new", true);
    setInterruptionDue("whats-new", true);
    expect(listener).toHaveBeenCalledTimes(1);
    claimInterruption("whats-new");
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    setInterruptionDue("tip", true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("a tip never opens over a field or a moving sheet", () => {
  it("a focused input, textarea, select or contenteditable blocks it", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
      expect(interruptionBlockedByUi({ activeElement: { tagName }, sheetMoving: false })).toBe(true);
    }
    expect(interruptionBlockedByUi({ activeElement: { tagName: "DIV", isContentEditable: true }, sheetMoving: false })).toBe(true);
  });

  it("a field the screen focused itself and nobody has typed in does not block (the add sheet's search field, where the add tips belong)", () => {
    expect(interruptionBlockedByUi({ activeElement: { tagName: "INPUT" }, sheetMoving: false, autofocusedEmpty: true })).toBe(false);
    // …but a sheet in motion still does
    expect(interruptionBlockedByUi({ activeElement: { tagName: "INPUT" }, sheetMoving: true, autofocusedEmpty: true })).toBe(true);
    // Typed in (autofocusedEmpty false): blocked again
    expect(interruptionBlockedByUi({ activeElement: { tagName: "INPUT" }, sheetMoving: false, autofocusedEmpty: false })).toBe(true);
  });

  it("a button, the body or nothing focused does not; a sheet in motion does", () => {
    expect(interruptionBlockedByUi({ activeElement: { tagName: "BUTTON" }, sheetMoving: false })).toBe(false);
    expect(interruptionBlockedByUi({ activeElement: { tagName: "BODY" }, sheetMoving: false })).toBe(false);
    expect(interruptionBlockedByUi({ activeElement: null, sheetMoving: false })).toBe(false);
    expect(interruptionBlockedByUi({ activeElement: { tagName: "BUTTON" }, sheetMoving: true })).toBe(true);
  });
});

describe("Có gì mới reports from a module that is not lazy (review item 12)", () => {
  const home = () => vi.stubGlobal("location", { pathname: "/app" });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetInterruptions();
  });

  it("on Hôm nay the install pop-up and the tips wait until Có gì mới has said whether it is due", () => {
    resetInterruptions();
    home();
    expect(mayInterrupt("install")).toBe(false);
    expect(mayInterrupt("tip")).toBe(false);
    setInterruptionDue("whats-new", false); // reported: not due
    expect(mayInterrupt("install")).toBe(true);
    expect(mayInterrupt("tip")).toBe(true);
  });

  it("…and when it is due, it goes first", () => {
    resetInterruptions();
    home();
    setInterruptionDue("whats-new", true);
    expect(mayInterrupt("install")).toBe(false);
    expect(mayInterrupt("whats-new")).toBe(true);
    expect(claimInterruption("whats-new")).toBe(true);
    expect(mayInterrupt("install")).toBe(false); // one per app open
  });

  it("a report that never comes holds them back only for the grace period", () => {
    resetInterruptions();
    home();
    expect(mayInterrupt("tip")).toBe(false);
    vi.spyOn(performance, "now").mockReturnValue(performance.now() + REPORT_GRACE_MS + 1);
    expect(mayInterrupt("tip")).toBe(true);
  });

  it("off Hôm nay nothing waits for it", () => {
    resetInterruptions();
    vi.stubGlobal("location", { pathname: "/explore" });
    expect(mayInterrupt("tip")).toBe(true);
  });

  it("the report is told to the hosts that wait, even when it says nothing is due", () => {
    resetInterruptions();
    home();
    const fn = vi.fn();
    subscribeInterruption(fn);
    setInterruptionDue("whats-new", false);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
