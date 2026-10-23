import { describe, it, expect } from "vitest";
import { HOME_ROUTE, NAV_TABS, backFallback, homeRedirectFor, canGoBack, nextHistory, tabForPath } from "../nav";

describe("lib/nav tabs", () => {
  it("lists the four tabs in order (Hôm nay, Tổng quan, Khám phá, Cài đặt) with their routes", () => {
    expect(NAV_TABS.map((t) => [t.tab, t.href, t.label])).toEqual([
      ["today", "/app", "Hôm nay"],
      ["overview", "/trends", "Tổng quan"],
      ["explore", "/explore", "Khám phá"],
      ["settings", "/settings", "Cài đặt"],
    ]);
  });

  it("maps each tab route to itself, and the coach link page at / to no tab", () => {
    expect(tabForPath("/")).toBeNull();
    expect(tabForPath("/app")).toBe("today");
    expect(tabForPath("/trends")).toBe("overview");
    expect(tabForPath("/explore")).toBe("explore");
    expect(tabForPath("/settings")).toBe("settings");
  });

  it("highlights the owning tab on pushed screens", () => {
    expect(tabForPath("/micros")).toBe("today");
    expect(tabForPath("/micros/calcium")).toBe("today");
    expect(tabForPath("/training")).toBe("today");
    expect(tabForPath("/entry/item-1")).toBe("today");
    expect(tabForPath("/trends/micros")).toBe("overview");
    expect(tabForPath("/trends/body")).toBe("overview");
    expect(tabForPath("/foods/egg")).toBe("explore");
    expect(tabForPath("/foods/new")).toBe("explore");
    expect(tabForPath("/explore/calcium")).toBe("explore");
    expect(tabForPath("/settings/profile")).toBe("settings");
    expect(tabForPath("/settings/profile/weight")).toBe("settings");
    expect(tabForPath("/settings/language")).toBe("settings");
    expect(tabForPath("/documents")).toBe("explore");
    expect(tabForPath("/explore/documents/c-1/l-2")).toBe("explore");
  });

  it("keeps the day log and the add sheet under Hôm nay, since Nhật ký is no longer a tab", () => {
    expect(tabForPath("/diary")).toBe("today");
    expect(tabForPath("/add")).toBe("today");
  });

  it("ignores routes without the nav", () => {
    expect(tabForPath("/signin")).toBeNull();
    expect(tabForPath("/paywall")).toBeNull();
    expect(tabForPath(null)).toBeNull();
    expect(tabForPath("/signin")).toBeNull();
    expect(tabForPath("/paywall")).toBeNull();
    expect(tabForPath(null)).toBeNull();
  });

  it("matches whole path segments, not prefixes", () => {
    expect(tabForPath("/microscope")).toBeNull();
    expect(tabForPath("/diaryx")).toBeNull();
  });
});

describe("lib/nav, Dong's screens (cc-24)", () => {
  it("keeps the leaderboard and the coaches under Khám phá, the legal pages under Cài đặt", () => {
    expect(tabForPath("/explore/leaderboard")).toBe("explore");
    expect(tabForPath("/explore/coaches/coach-ha")).toBe("explore");
    expect(tabForPath("/privacy")).toBe("settings");
    expect(tabForPath("/terms")).toBe("settings");
  });

  it("keeps the review queue under Cài đặt, like the other sub-pages (cc-23)", () => {
    expect(tabForPath("/admin/review")).toBe("settings");
    expect(backFallback("/admin/review")).toBe("/settings");
  });

  it("sends a coach profile back to the directory, the legal pages back to Cài đặt", () => {
    expect(backFallback("/explore/coaches/coach-ha")).toBe("/explore/coaches");
    expect(backFallback("/explore/coaches")).toBe("/explore");
    expect(backFallback("/explore/leaderboard")).toBe("/explore");
    expect(backFallback("/privacy")).toBe("/settings");
    expect(backFallback("/documents")).toBe("/explore/documents");
    expect(backFallback("/explore/documents")).toBe("/explore");
    expect(backFallback("/explore/documents/c-1")).toBe("/explore/documents");
    expect(backFallback("/explore/documents/c-1/l-2")).toBe("/explore/documents/c-1");
    expect(backFallback("/terms")).toBe("/settings");
  });
});

describe("lib/nav, Ngày ăn mẫu (feat/ngay-mau)", () => {
  it("keeps the list and the editor under Khám phá, and Back goes editor to list to Khám phá", () => {
    expect(tabForPath("/explore/ngay-mau")).toBe("explore");
    expect(tabForPath("/explore/ngay-mau/dt-1")).toBe("explore");
    expect(backFallback("/explore/ngay-mau/dt-1")).toBe("/explore/ngay-mau");
    expect(backFallback("/explore/ngay-mau")).toBe("/explore");
  });
});

describe("lib/nav, compare foods (cc-23)", () => {
  it("keeps the compare page under Khám phá, like a food", () => {
    expect(tabForPath("/foods/compare")).toBe("explore");
  });

  it("sends compare back to the first food of the list, else to the add sheet", () => {
    expect(backFallback("/foods/compare", "?ids=food-cha-la,food-yen-mach")).toBe("/foods/food-cha-la");
    expect(backFallback("/foods/compare", "?ids=food-cha-la")).toBe("/foods/food-cha-la");
    expect(backFallback("/foods/compare", "?ids=,food-yen-mach")).toBe("/foods/food-yen-mach");
    expect(backFallback("/foods/compare", "")).toBe("/add");
    expect(backFallback("/foods/compare", null)).toBe("/add");
    expect(backFallback("/foods/compare", "?ids=")).toBe("/add");
    expect(backFallback("/foods/compare")).toBe("/add");
  });

  it("does not build a path from an id with odd characters", () => {
    expect(backFallback("/foods/compare", "?ids=../settings")).toBe("/add");
    // the odd one is skipped, the first clean id is used
    expect(backFallback("/foods/compare", "?ids=a/b,c")).toBe("/foods/c");
  });
});

describe("lib/nav backFallback", () => {
  it("sends Vi chất and Ngày tập back to the day log, and Tổng quan's sub-screens back to Tổng quan", () => {
    expect(backFallback("/micros")).toBe(HOME_ROUTE);
    expect(backFallback("/training")).toBe(HOME_ROUTE);
    expect(backFallback("/trends")).toBe(HOME_ROUTE);
    expect(backFallback("/trends/micros")).toBe("/trends");
    expect(backFallback("/trends/body")).toBe("/trends");
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

  it("keeps a past day's ?date= when the parent is a day screen", () => {
    expect(backFallback("/micros", "?date=2026-10-14")).toBe("/app?date=2026-10-14");
    expect(backFallback("/training", "?date=2026-10-14")).toBe("/app?date=2026-10-14");
    expect(backFallback("/micros/calcium", "?date=2026-10-14")).toBe("/micros?date=2026-10-14");
    expect(backFallback("/add", "?date=2026-10-14&meal=lunch")).toBe("/app?date=2026-10-14");
  });

  it("ignores a missing or malformed date and dates on screens that are not day screens", () => {
    expect(backFallback("/micros", "")).toBe(HOME_ROUTE);
    expect(backFallback("/micros", null)).toBe(HOME_ROUTE);
    expect(backFallback("/micros", "?date=hôm-qua")).toBe(HOME_ROUTE);
    expect(backFallback("/trends/micros", "?date=2026-10-14")).toBe("/trends");
    expect(backFallback("/foods/egg", "?date=2026-10-14")).toBe("/explore");
  });

  it("falls back to the owning tab for the add sheet and entry, and to the root otherwise", () => {
    expect(backFallback("/add")).toBe(HOME_ROUTE);
    expect(backFallback("/entry/item-1")).toBe(HOME_ROUTE);
    expect(backFallback("/anything-else")).toBe(HOME_ROUTE);
    expect(backFallback(null)).toBe(HOME_ROUTE);
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

describe("lib/nav homeRedirectFor", () => {
  it("sends an old Hôm nay link at / to /app with the whole query", () => {
    expect(homeRedirectFor({ date: "2026-10-15" })).toBe("/app?date=2026-10-15");
    expect(homeRedirectFor({ demo: "1", as: "coach", level: "2" })).toBe("/app?demo=1&as=coach&level=2");
    expect(homeRedirectFor({ meal: "lunch", utm: "zalo" })).toBe("/app?meal=lunch&utm=zalo");
    expect(homeRedirectFor({ demo: "" })).toBe("/app?demo=");
    expect(homeRedirectFor({ loading: "1" })).toBe("/app?loading=1");
    expect(homeRedirectFor({ date: ["2026-10-14", "2026-10-15"] })).toBe("/app?date=2026-10-14&date=2026-10-15");
  });

  it("keeps the link page for no query or a query that is not Hôm nay's", () => {
    expect(homeRedirectFor({})).toBeNull();
    expect(homeRedirectFor({ utm_source: "facebook" })).toBeNull();
    expect(homeRedirectFor({ date: undefined })).toBeNull();
  });
});
