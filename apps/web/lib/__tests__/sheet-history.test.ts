import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SHEET_BACK_DELAY_MS, closeSheetEntry, navigateFromSheet, openSheetEntry, topSheetId } from "../sheet-history";

// Review 07:00 M1: a navigation from a sheet is never cancelled by the sheet taking its history entry back, and
// leaves no stray entry. A fake history: an array of states with the current index.

function fakeHistory(href = "https://app.test/app") {
  const entries: unknown[] = [{ __NA: true }];
  let index = 0;
  const history = {
    get state() {
      return entries[index] as Record<string, unknown> | null;
    },
    pushState: vi.fn((state: unknown) => {
      entries.splice(index + 1, entries.length, state);
      index += 1;
    }),
    replaceState: vi.fn((state: unknown) => {
      entries[index] = state;
    }),
    back: vi.fn(() => {
      index = Math.max(0, index - 1);
    }),
  };
  vi.stubGlobal("window", { history, location: { href } });
  return { history, length: () => entries.length, index: () => index };
}

const router = () => ({ push: vi.fn(), replace: vi.fn() });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("sheet history entries", () => {
  it("a sheet closed with Esc or a button takes its entry back", () => {
    const h = fakeHistory();
    const id = openSheetEntry();
    expect(topSheetId()).toBe(id);
    closeSheetEntry(id, window.location.href, false);
    vi.advanceTimersByTime(SHEET_BACK_DELAY_MS);
    expect(h.history.back).toHaveBeenCalledTimes(1);
    expect(topSheetId()).toBe(null);
  });

  it("closed by Back (popped): nothing more is taken back", () => {
    const h = fakeHistory();
    const id = openSheetEntry();
    h.history.back();
    closeSheetEntry(id, window.location.href, true);
    vi.advanceTimersByTime(SHEET_BACK_DELAY_MS);
    expect(h.history.back).toHaveBeenCalledTimes(1);
  });

  it("with sheetNavigating set (navigateFromSheet), the close never calls history.back()", () => {
    const h = fakeHistory();
    const r = router();
    const id = openSheetEntry();
    navigateFromSheet(r, "/app?date=2026-10-17");
    closeSheetEntry(id, window.location.href, false);
    vi.advanceTimersByTime(SHEET_BACK_DELAY_MS * 4);
    expect(h.history.back).not.toHaveBeenCalled();
    expect(r.replace).toHaveBeenCalledWith("/app?date=2026-10-17");
    expect(r.push).not.toHaveBeenCalled();
    // The flag is used once: the next sheet closed with Esc takes its entry back again
    const next = openSheetEntry();
    closeSheetEntry(next, window.location.href, false);
    vi.advanceTimersByTime(SHEET_BACK_DELAY_MS);
    expect(h.history.back).toHaveBeenCalledTimes(1);
  });

  it("a navigation just after the close (the back is still waiting) replaces the entry and cancels the back", () => {
    const h = fakeHistory();
    const r = router();
    const id = openSheetEntry();
    closeSheetEntry(id, window.location.href, false);
    navigateFromSheet(r, "/micros/iron");
    vi.advanceTimersByTime(SHEET_BACK_DELAY_MS * 4);
    expect(h.history.back).not.toHaveBeenCalled();
    expect(r.replace).toHaveBeenCalledWith("/micros/iron");
  });

  it("no sheet: a plain push", () => {
    fakeHistory();
    const r = router();
    navigateFromSheet(r, "/app");
    expect(r.push).toHaveBeenCalledWith("/app");
    expect(r.replace).not.toHaveBeenCalled();
  });

  it("the route changed before the delay: nothing is taken back", () => {
    const h = fakeHistory();
    const id = openSheetEntry();
    const href = window.location.href;
    (window.location as { href: string }).href = "https://app.test/micros/iron";
    closeSheetEntry(id, href, false);
    vi.advanceTimersByTime(SHEET_BACK_DELAY_MS);
    expect(h.history.back).not.toHaveBeenCalled();
  });

  it("a sheet under another one closes: nothing is taken back", () => {
    const h = fakeHistory();
    const under = openSheetEntry();
    const above = openSheetEntry();
    closeSheetEntry(under, window.location.href, false);
    vi.advanceTimersByTime(SHEET_BACK_DELAY_MS);
    expect(h.history.back).not.toHaveBeenCalled();
    expect(topSheetId()).toBe(above);
    closeSheetEntry(above, window.location.href, false);
    vi.advanceTimersByTime(SHEET_BACK_DELAY_MS);
    expect(h.history.back).toHaveBeenCalledTimes(1);
  });

  it("a sheet that closes and opens another hands its entry over: one entry, no back", () => {
    const h = fakeHistory();
    const first = openSheetEntry();
    closeSheetEntry(first, window.location.href, false);
    const second = openSheetEntry();
    vi.advanceTimersByTime(SHEET_BACK_DELAY_MS);
    expect(h.history.back).not.toHaveBeenCalled();
    expect(h.length()).toBe(2);
    expect(topSheetId()).toBe(second);
    closeSheetEntry(second, window.location.href, true);
  });
});
