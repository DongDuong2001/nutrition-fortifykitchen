import { describe, expect, it } from "vitest";
import { DEFAULT_FLAGS, markSeenIn, markTourStartedIn, markUsedIn, parseFlags, setTipsOffIn, tourOpenOn, type OnboardingFlags } from "../onboarding-flags";
import { TIPS, pickTip, type TipContext } from "../tips";

const ctx = (over: Partial<TipContext> = {}): TipContext => ({ pathname: "/", pastDay: false, foodsToday: 2, ...over });
const flags = (over: Partial<OnboardingFlags> = {}): OnboardingFlags => ({ ...DEFAULT_FLAGS, ...over });
const ids = (c: TipContext, f = flags()) => pickTip({ ctx: c, flags: f, tourActive: false })?.id ?? null;

describe("the tips table", () => {
  it("has the 15 tips of the design boards, each with the card copy", () => {
    expect(TIPS.map((t) => t.id)).toEqual([
      "home-logged", "meal-add", "home-share", "past-day", "multi-select", "add-tray", "food-detail", "compare",
      "food-new", "training", "micros", "trends-micros", "explore", "overview", "leaderboard",
    ]);
    for (const t of TIPS) {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.body.length).toBeGreaterThan(0);
      expect(t.target.length).toBeGreaterThan(0);
      expect(t.used.length).toBeGreaterThan(0);
    }
  });

  it("every id is unique", () => {
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length);
  });
});

describe("pickTip", () => {
  it("shows the tip of a screen on its first visit", () => {
    expect(ids(ctx({ pathname: "/training" }))).toBe("training");
    expect(ids(ctx({ pathname: "/micros" }))).toBe("micros");
    expect(ids(ctx({ pathname: "/explore" }))).toBe("explore");
    expect(ids(ctx({ pathname: "/trends" }))).toBe("overview");
    expect(ids(ctx({ pathname: "/trends/micros" }))).toBe("trends-micros");
    expect(ids(ctx({ pathname: "/add" }))).toBe("add-tray");
    expect(ids(ctx({ pathname: "/foods/new" }))).toBe("food-new");
    expect(ids(ctx({ pathname: "/foods/food-cha-la" }))).toBe("food-detail");
    expect(ids(ctx({ pathname: "/foods/compare" }))).toBe("compare");
    expect(ids(ctx({ pathname: "/explore/leaderboard" }))).toBe("leaderboard");
  });

  it("not on a second visit: a tip that was seen stays quiet", () => {
    expect(ids(ctx({ pathname: "/training" }), flags({ seen: ["training"] }))).toBeNull();
  });

  it("not when the user has already used the feature", () => {
    expect(ids(ctx({ pathname: "/training" }), flags({ used: ["training-minutes"] }))).toBeNull();
    expect(ids(ctx({ pathname: "/add" }), flags({ used: ["tray-add"] }))).toBeNull();
  });

  it("not when tips are off, and not while the tour runs", () => {
    expect(ids(ctx({ pathname: "/training" }), flags({ tipsOff: true }))).toBeNull();
    expect(pickTip({ ctx: ctx({ pathname: "/training" }), flags: flags(), tourActive: true })).toBeNull();
  });

  it("one tip per visit: Hôm nay with foods offers one, the next visit offers the next", () => {
    const first = ids(ctx());
    expect(first).toBe("home-logged");
    const second = ids(ctx(), flags({ seen: ["home-logged"] }));
    expect(second).toBe("meal-add");
    expect(ids(ctx(), flags({ seen: ["home-logged", "meal-add"] }))).toBeNull();
  });

  it("Hôm nay tips wait for the first food, and the past-day tip is for a past day only", () => {
    expect(ids(ctx({ foodsToday: 0 }))).toBeNull();
    expect(ids(ctx({ pastDay: true, foodsToday: 2 }))).toBe("past-day");
    expect(ids(ctx({ pastDay: true }), flags({ seen: ["past-day"] }))).toBeNull();
  });

  it("the multi-select tip is shown when select mode opens, never on its own", () => {
    expect(ids(ctx({ selectMode: true }))).toBe("multi-select");
    expect(ids(ctx({ selectMode: true }), flags({ used: ["multi-select-action"] }))).toBeNull();
  });

  it("an unknown screen has no tip", () => {
    expect(ids(ctx({ pathname: "/settings" }))).toBeNull();
    expect(ids(ctx({ pathname: "/signin" }))).toBeNull();
  });
});

describe("the flags", () => {
  it("start empty: tour not done, tips on, nothing seen or used", () => {
    expect(DEFAULT_FLAGS).toEqual({ tourDone: false, tipsOff: false, seen: [], used: [], replayOpened: false, tourStartedIso: null });
  });

  it("read from storage, with anything wrong ignored", () => {
    expect(parseFlags({ tourDone: true, tipsOff: true, seen: ["a", 3, "b"], used: "x", replayOpened: true })).toEqual({
      tourDone: true,
      tipsOff: true,
      seen: ["a", "b"],
      used: [],
      replayOpened: true,
      tourStartedIso: null,
    });
    expect(parseFlags(null)).toEqual(DEFAULT_FLAGS);
    expect(parseFlags("nope")).toEqual(DEFAULT_FLAGS);
  });

  it("markSeen and markUsed add once, never twice", () => {
    const a = markSeenIn(markSeenIn(DEFAULT_FLAGS, "x"), "x");
    expect(a.seen).toEqual(["x"]);
    const b = markUsedIn(markUsedIn(DEFAULT_FLAGS, "tray-add"), "tray-add");
    expect(b.used).toEqual(["tray-add"]);
  });

  it("turning tips back on forgets what was seen, but not what was used", () => {
    const off = setTipsOffIn(flags({ seen: ["a", "b"], used: ["tray-add"] }), true);
    expect(off.tipsOff).toBe(true);
    expect(off.seen).toEqual(["a", "b"]);
    const on = setTipsOffIn(off, false);
    expect(on).toEqual({ ...off, tipsOff: false, seen: [] });
    expect(on.used).toEqual(["tray-add"]);
  });
});

describe("the tour day", () => {
  it("is open from the day it starts until it is finished or skipped", () => {
    const started = markTourStartedIn(DEFAULT_FLAGS, "2026-10-17");
    expect(tourOpenOn(started, "2026-10-17")).toBe(true);
    expect(tourOpenOn({ ...started, tourDone: true }, "2026-10-17")).toBe(false);
  });

  it("is not open on another day, or when it never started", () => {
    expect(tourOpenOn(DEFAULT_FLAGS, "2026-10-17")).toBe(false);
    expect(tourOpenOn(markTourStartedIn(DEFAULT_FLAGS, "2026-10-16"), "2026-10-17")).toBe(false);
  });

  it("reads the day from storage and ignores a wrong value", () => {
    expect(parseFlags({ tourStartedIso: "2026-10-17" }).tourStartedIso).toBe("2026-10-17");
    expect(parseFlags({ tourStartedIso: 5 }).tourStartedIso).toBeNull();
    expect(parseFlags({ tourStartedIso: "yesterday" }).tourStartedIso).toBeNull();
  });
});

describe("the share tip", () => {
  const seenFirst = flags({ seen: ["home-logged", "meal-add"] });

  it("shows on Hôm nay today once it holds 3 foods", () => {
    expect(ids(ctx({ foodsToday: 3 }), seenFirst)).toBe("home-share");
    expect(ids(ctx({ foodsToday: 7 }), seenFirst)).toBe("home-share");
  });

  it("not at 2 foods, none, or on a past day or in select mode", () => {
    expect(ids(ctx({ foodsToday: 2 }), seenFirst)).toBeNull();
    expect(ids(ctx({ foodsToday: 0 }), seenFirst)).toBeNull();
    expect(ids(ctx({ foodsToday: 5, pastDay: true }), seenFirst)).toBe("past-day");
    expect(ids(ctx({ foodsToday: 5, pastDay: true }), flags({ seen: ["past-day"] }))).toBeNull();
    expect(ids(ctx({ foodsToday: 5, selectMode: true }), seenFirst)).toBe("multi-select");
  });

  it("not on another screen", () => {
    expect(ids(ctx({ foodsToday: 5, pathname: "/explore" }), seenFirst)).toBe("explore");
  });

  it("not after the account has shared (a successful share or export), once seen, or with tips off", () => {
    expect(ids(ctx({ foodsToday: 3 }), flags({ ...seenFirst, used: ["share-day"] }))).toBeNull();
    expect(ids(ctx({ foodsToday: 3 }), flags({ seen: ["home-logged", "meal-add", "home-share"] }))).toBeNull();
    expect(ids(ctx({ foodsToday: 3 }), flags({ ...seenFirst, tipsOff: true }))).toBeNull();
  });

  it("never during the tour, and one tip per visit: the earlier tips come first", () => {
    expect(pickTip({ ctx: ctx({ foodsToday: 3 }), flags: seenFirst, tourActive: true })).toBeNull();
    expect(ids(ctx({ foodsToday: 3 }))).toBe("home-logged");
    expect(ids(ctx({ foodsToday: 3 }), flags({ seen: ["home-logged"] }))).toBe("meal-add");
  });

  it("has the card copy, a round hole and the Thử ngay button", () => {
    const tip = TIPS.find((t) => t.id === "home-share");
    expect(tip?.title).toBe("Chia sẻ ngày ăn của bạn");
    expect(tip?.body).toBe("Chạm biểu tượng chia sẻ để tạo ảnh tóm tắt ngày: tên, Level, kcal và vi chất. Chia sẻ cho HLV hoặc đăng lên mạng xã hội nhanh chóng.");
    expect(tip?.tryLabel).toBe("Thử ngay");
    expect(tip?.round).toBe(true);
    expect(tip?.target).toBe("home-share");
  });
});
