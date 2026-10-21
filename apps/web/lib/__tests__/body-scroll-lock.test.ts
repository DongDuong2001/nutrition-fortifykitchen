import { beforeEach, describe, expect, it, vi } from "vitest";
import { bodyScrollLocks, lockBodyScroll } from "../body-scroll-lock";

const body = { style: { overflow: "" } };

describe("body scroll lock", () => {
  beforeEach(() => {
    vi.stubGlobal("document", { body });
    body.style.overflow = "";
  });

  it("hides the overflow while any lock is held and restores the original value with the last release", () => {
    body.style.overflow = "auto";
    const addSheet = lockBodyScroll();
    const portionSheet = lockBodyScroll();
    expect(body.style.overflow).toBe("hidden");
    expect(bodyScrollLocks()).toBe(2);
    // the sheet over closes first: the page stays locked under the one that is still up
    portionSheet();
    expect(body.style.overflow).toBe("hidden");
    addSheet();
    expect(body.style.overflow).toBe("auto");
    expect(bodyScrollLocks()).toBe(0);
  });

  it("the first sheet may close before the second: still locked until both are gone", () => {
    body.style.overflow = "";
    const a = lockBodyScroll();
    const b = lockBodyScroll();
    a();
    expect(body.style.overflow).toBe("hidden");
    b();
    expect(body.style.overflow).toBe("");
  });

  it("releasing twice releases once", () => {
    body.style.overflow = "";
    const a = lockBodyScroll();
    const b = lockBodyScroll();
    a();
    a();
    expect(bodyScrollLocks()).toBe(1);
    expect(body.style.overflow).toBe("hidden");
    b();
    expect(bodyScrollLocks()).toBe(0);
  });
});
