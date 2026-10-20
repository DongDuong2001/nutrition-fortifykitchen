import { describe, expect, it } from "vitest";
import { isLowEndDevice, navKind, transitionClass } from "../nav-direction";

const PUSH = { back: false, sheetClosed: false };
const BACK = { back: true, sheetClosed: false };

describe("navKind (cc-55 route direction)", () => {
  it("a screen opened on top is a push; Back from it reverses", () => {
    expect(navKind("/app", "/foods/food-cha-la", PUSH)).toBe("push");
    expect(navKind("/settings", "/settings/profile", PUSH)).toBe("push");
    expect(navKind("/foods/food-cha-la", "/app", BACK)).toBe("back");
    expect(navKind("/settings/profile", "/settings", BACK)).toBe("back");
  });

  it("a screen's own back button that replaces it with its parent slides back too", () => {
    expect(navKind("/settings/profile/weight", "/settings/profile", PUSH)).toBe("back");
    expect(navKind("/settings/profile", "/settings", PUSH)).toBe("back");
  });

  it("tabs never slide, by the nav or by Back", () => {
    expect(navKind("/app", "/trends", PUSH)).toBe("tab");
    expect(navKind("/trends", "/app", BACK)).toBe("tab");
    // the bottom nav from a pushed screen goes to the tab, not back
    expect(navKind("/foods/food-cha-la", "/explore", PUSH)).toBe("tab");
  });

  it("Tổng quan's sub-tabs are siblings of one frame: no slide, by a tap or by Back (cc-57)", () => {
    expect(navKind("/trends", "/trends/energy", PUSH)).toBe("tab");
    expect(navKind("/trends/energy", "/trends/micros", PUSH)).toBe("tab");
    expect(navKind("/trends/micros", "/trends", PUSH)).toBe("tab");
    expect(navKind("/trends/body", "/trends/energy", BACK)).toBe("tab");
    expect(navKind("/trends/micros?p=30", "/trends/body?p=30", PUSH)).toBe("tab");
    // leaving Tổng quan for a pushed screen still pushes
    expect(navKind("/trends/micros", "/micros", PUSH)).toBe("push");
  });

  it("/add is a sheet: it opens itself, Back slides its panel down, its own ✕ leaves nothing to animate", () => {
    expect(navKind("/app", "/add", PUSH)).toBe("sheet-up");
    expect(navKind("/add", "/app", BACK)).toBe("sheet-down");
    expect(navKind("/add", "/app", { back: true, sheetClosed: true })).toBe("none");
    expect(navKind("/add", "/app", PUSH)).toBe("none");
  });

  it("the first screen and a query change have none", () => {
    expect(navKind(null, "/app", PUSH)).toBe("none");
    expect(navKind("/app", "/app?date=2026-10-17", PUSH)).toBe("none");
  });

  it("maps to the view-transition classes in globals.css", () => {
    expect(transitionClass("push")).toBe("m-vt-push");
    expect(transitionClass("back")).toBe("m-vt-back");
    expect(transitionClass("sheet-down")).toBe("m-vt-sheet-down");
    expect(transitionClass("tab")).toBe("none");
    expect(transitionClass("sheet-up")).toBe("none");
  });
});

describe("isLowEndDevice (cc-64 P5, hard cut instead of a slide)", () => {
  it("cuts only when deviceMemory is reported and at most 2 GB", () => {
    expect(isLowEndDevice({ deviceMemory: 0.5 })).toBe(true);
    expect(isLowEndDevice({ deviceMemory: 1 })).toBe(true);
    expect(isLowEndDevice({ deviceMemory: 2 })).toBe(true);
    expect(isLowEndDevice({ deviceMemory: 4 })).toBe(false);
    expect(isLowEndDevice({ deviceMemory: 8 })).toBe(false);
  });

  it("never decides by core count: Safari reports no deviceMemory, so iPhones keep the slide", () => {
    expect(isLowEndDevice({})).toBe(false);
    expect(isLowEndDevice({ hardwareConcurrency: 4 } as { deviceMemory?: number })).toBe(false);
    expect(isLowEndDevice({ deviceMemory: 4, hardwareConcurrency: 2 } as { deviceMemory?: number })).toBe(false);
  });
});
