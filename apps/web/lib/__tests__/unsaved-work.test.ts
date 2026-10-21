import { afterEach, describe, expect, it, vi } from "vitest";
import { hasUnsavedWork, isFormField, resetUnsavedWork, setUnsavedWork, subscribeUnsavedWork, trackFieldForTest } from "../unsaved-work";
import { canApplyUpdate, reloadAfterTakeover, shouldReloadStaleTab, updatePhase } from "../update-phase";

// fix/polish-1020 review (item 10): the update never reloads over a tray, an open portion sheet or a form someone is typing in.

afterEach(() => resetUnsavedWork());

describe("unsaved work", () => {
  it("is held while any screen marks it, and free once every mark is cleared", () => {
    expect(hasUnsavedWork()).toBe(false);
    setUnsavedWork("add-sheet", true);
    setUnsavedWork("entry-editor", true);
    expect(hasUnsavedWork()).toBe(true);
    setUnsavedWork("add-sheet", false);
    expect(hasUnsavedWork()).toBe(true);
    setUnsavedWork("entry-editor", false);
    expect(hasUnsavedWork()).toBe(false);
  });

  it("tells its listeners only when something changed", () => {
    const fn = vi.fn();
    const off = subscribeUnsavedWork(fn);
    setUnsavedWork("a", true);
    setUnsavedWork("a", true);
    setUnsavedWork("a", false);
    off();
    setUnsavedWork("a", true);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("a search box is not a form field, a text field is", () => {
    const el = (attrs: Record<string, string>, tag = "input") =>
      ({
        matches: (sel: string) => sel.split(",").some((x) => x.trim() === tag),
        closest: () => null,
        getAttribute: (k: string) => attrs[k] ?? null,
        ...attrs,
        dataset: {},
      }) as unknown as Element;
    expect(isFormField(el({ type: "text" }))).toBe(true);
    expect(isFormField(el({ type: "number" }))).toBe(true);
    expect(isFormField(el({ type: "search" }))).toBe(false);
    expect(isFormField(el({ type: "text", "data-testid": "food-search" }))).toBe(false);
    expect(isFormField(el({ type: "checkbox" }))).toBe(false);
    expect(isFormField(el({}, "textarea"))).toBe(true);
    expect(isFormField(null)).toBe(false);
  });
});

describe("the update decision with unsaved work", () => {
  it("does not apply over something in hand, tapped or in the background", () => {
    expect(canApplyUpdate({ tapped: true, busy: false, editing: true })).toBe(false);
    expect(canApplyUpdate({ tapped: false, inBackground: true, busy: false, editing: true })).toBe(false);
    expect(canApplyUpdate({ tapped: false, inBackground: true, busy: false, editing: false })).toBe(true);
    expect(canApplyUpdate({ tapped: true, busy: false })).toBe(true);
  });

  it("says so when the person tapped and something is in hand", () => {
    const idle = { tapped: true, busy: false, saving: false, offline: false, failed: 0 };
    expect(updatePhase({ ...idle, editing: true })).toBe("editing");
    expect(updatePhase({ ...idle, editing: false })).toBe("waiting");
  });

  it("a stale tab reloads only in the background with nothing waiting or held", () => {
    const base = { stale: true, hidden: true, busy: false, editing: false };
    expect(shouldReloadStaleTab(base)).toBe(true);
    expect(shouldReloadStaleTab({ ...base, hidden: false })).toBe(false);
    expect(shouldReloadStaleTab({ ...base, busy: true })).toBe(false);
    expect(shouldReloadStaleTab({ ...base, editing: true })).toBe(false);
    expect(shouldReloadStaleTab({ ...base, stale: false })).toBe(false);
  });
});

describe("reload after the worker took over", () => {
  const base = { by: null, hidden: false, busy: false, editing: false } as const;

  it("a tap on Tải lại reloads at once, in front", () => {
    expect(reloadAfterTakeover({ ...base, by: "tap" })).toBe(true);
    expect(reloadAfterTakeover({ ...base, by: "tap", editing: true })).toBe(false);
    expect(reloadAfterTakeover({ ...base, by: "tap", busy: true })).toBe(false);
  });

  it("an update the app started in the background, or another tab's, never reloads a visible page", () => {
    expect(reloadAfterTakeover({ ...base, by: "background", hidden: false })).toBe(false);
    expect(reloadAfterTakeover({ ...base, by: null, hidden: false })).toBe(false);
  });

  it("…and reloads once the page is hidden with nothing waiting or held", () => {
    expect(reloadAfterTakeover({ ...base, by: "background", hidden: true })).toBe(true);
    expect(reloadAfterTakeover({ ...base, by: "background", hidden: true, editing: true })).toBe(false);
  });
});

describe("unsaved work drops a field that left the page and tells those who wait", () => {
  it("emits (after the read, not during it) when a disconnected field is forgotten", async () => {
    const field = { isConnected: true } as unknown as Element;
    trackFieldForTest(field);
    expect(hasUnsavedWork()).toBe(true);
    const fn = vi.fn();
    const off = subscribeUnsavedWork(fn);
    (field as unknown as { isConnected: boolean }).isConnected = false;
    expect(hasUnsavedWork()).toBe(false);
    expect(fn).not.toHaveBeenCalled(); // not inside the read: it may be a render
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);
    off();
  });
});
