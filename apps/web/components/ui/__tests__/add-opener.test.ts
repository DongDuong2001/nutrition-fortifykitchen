import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MouseEvent } from "react";
import { setHomeDay } from "@/lib/home-scroll";
import { openAddFrom } from "../add-opener";

// The + of the nav and of the sidebar: it remembers its opener and, when Hôm nay shows an editable earlier day, opens
// /add?date=… so the screen under the sheet stays on that day. Every other click is the plain link.

const click = (over: Partial<MouseEvent<HTMLElement>> = {}) =>
  ({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, preventDefault: vi.fn(), ...over }) as unknown as MouseEvent<HTMLElement>;

beforeEach(() => vi.stubGlobal("window", {}));
afterEach(() => {
  setHomeDay(null);
  vi.unstubAllGlobals();
});

describe("openAddFrom", () => {
  it("with Hôm nay on yesterday it takes over the click and opens /add?date=yesterday", () => {
    setHomeDay("2026-10-19");
    const router = { push: vi.fn() };
    const e = click();
    openAddFrom("mobile-add-fab", e, router);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/add?date=2026-10-19");
  });

  it("today, or no day: the link as it is", () => {
    const router = { push: vi.fn() };
    const e = click();
    openAddFrom("mobile-add-fab", e, router);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("a modified or non-primary click is left to the browser (a new tab)", () => {
    setHomeDay("2026-10-19");
    for (const over of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { button: 1 }, { defaultPrevented: true }]) {
      const router = { push: vi.fn() };
      const e = click(over);
      openAddFrom("mobile-add-fab", e, router);
      expect(router.push).not.toHaveBeenCalled();
    }
  });
});
