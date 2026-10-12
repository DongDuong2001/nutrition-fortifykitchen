import { describe, it, expect } from "vitest";
import { NAV_TABS, backFallback, canGoBack, nextHistory, tabForPath } from "../nav";

describe("lib/nav tabs", () => {
  it("lists the four tabs in IA-v2 order with their routes", () => {
    expect(NAV_TABS.map((t) => [t.tab, t.href, t.label])).toEqual([
      ["overview", "/", "Tổng quan"],
      ["diary", "/diary", "Nhật ký"],
      ["explore", "/explore", "Khám phá"],
      ["settings", "/settings", "Cài đặt"],
    ]);
  });

  it("maps each tab route to itself", () => {
    expect(tabForPath("/")).toBe("overview");
    expect(tabForPath("/diary")).toBe("diary");
    expect(tabForPath("/explore")).toBe("explore");
    expect(tabForPath("/settings")).toBe("settings");
  });

  it("highlights the owning tab on pushed screens", () => {
    expect(tabForPath("/micros")).toBe("overview");
    expect(tabForPath("/micros/calcium")).toBe("overview");
    expect(tabForPath("/training")).toBe("overview");
    expect(tabForPath("/trends")).toBe("overview");
    expect(tabForPath("/foods/egg")).toBe("explore");
    expect(tabForPath("/foods/new")).toBe("explore");
    expect(tabForPath("/explore/calcium")).toBe("explore");
    expect(tabForPath("/settings/profile")).toBe("settings");
    expect(tabForPath("/settings/profile/weight")).toBe("settings");
    expect(tabForPath("/settings/language")).toBe("settings");
  });

  it("puts the add sheet and entry editor under the diary and ignores other routes", () => {
    expect(tabForPath("/add")).toBe("diary");
    expect(tabForPath("/entry/item-1")).toBe("diary");
    expect(tabForPath("/signin")).toBeNull();
    expect(tabForPath("/paywall")).toBeNull();
    expect(tabForPath(null)).toBeNull();
  });

  it("matches whole path segments, not prefixes", () => {
    expect(tabForPath("/microscope")).toBeNull();
    expect(tabForPath("/diaryx")).toBeNull();
  });
});

describe("lib/nav backFallback", () => {
  it("sends Vi chất, Xu hướng and Ngày tập back to Tổng quan", () => {
    expect(backFallback("/micros")).toBe("/");
    expect(backFallback("/trends")).toBe("/");
    expect(backFallback("/training")).toBe("/");
  });

  it("sends a nutrient detail back to the Vi chất list", () => {
    expect(backFallback("/micros/calcium")).toBe("/micros");
  });

  it("sends foods to Khám phá and settings pages to their parent", () => {
    expect(backFallback("/foods/egg")).toBe("/explore");
    expect(backFallback("/foods/new")).toBe("/explore");
    expect(backFallback("/explore/calcium")).toBe("/explore");
    expect(backFallback("/settings/profile")).toBe("/settings");
    expect(backFallback("/settings/profile/weight")).toBe("/settings/profile");
    expect(backFallback("/settings/language")).toBe("/settings");
    expect(backFallback("/settings/delete-account")).toBe("/settings");
  });

  it("falls back to the owning tab for the add sheet and entry, and to the root otherwise", () => {
    expect(backFallback("/add")).toBe("/diary");
    expect(backFallback("/entry/item-1")).toBe("/diary");
    expect(backFallback("/anything-else")).toBe("/");
    expect(backFallback(null)).toBe("/");
  });
});

describe("lib/nav history", () => {
  it("starts with no history on the first page", () => {
    const stack = nextHistory([], "/micros");
    expect(stack).toEqual(["/micros"]);
    expect(canGoBack(stack)).toBe(false);
  });

  it("can go back after an in-app navigation", () => {
    const stack = nextHistory(nextHistory([], "/"), "/micros");
    expect(stack).toEqual(["/", "/micros"]);
    expect(canGoBack(stack)).toBe(true);
  });

  it("pops when the path is the one before (browser back)", () => {
    const stack = nextHistory(["/", "/micros", "/trends"], "/micros");
    expect(stack).toEqual(["/", "/micros"]);
    expect(canGoBack(stack)).toBe(true);
    expect(canGoBack(nextHistory(stack, "/"))).toBe(false);
  });

  it("ignores a repeat of the current path", () => {
    expect(nextHistory(["/", "/micros"], "/micros")).toEqual(["/", "/micros"]);
  });

  it("keeps the stack bounded", () => {
    let stack: string[] = [];
    for (let i = 0; i < 100; i++) stack = nextHistory(stack, `/p${i}`);
    expect(stack.length).toBeLessThanOrEqual(50);
    expect(stack[stack.length - 1]).toBe("/p99");
  });
});
