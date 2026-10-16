import { describe, expect, it } from "vitest";
import { DEFAULT_FLAGS, markSeenIn, markUsedIn, parseFlags, setTipsOffIn, type OnboardingFlags } from "../onboarding-flags";
import { TIPS, pickTip, type TipContext } from "../tips";

const ctx = (over: Partial<TipContext> = {}): TipContext => ({ pathname: "/", pastDay: false, foodsToday: 2, ...over });
const flags = (over: Partial<OnboardingFlags> = {}): OnboardingFlags => ({ ...DEFAULT_FLAGS, ...over });
const ids = (c: TipContext, f = flags()) => pickTip({ ctx: c, flags: f, tourActive: false })?.id ?? null;

describe("the tips table", () => {
  it("has the 14 tips of the design boards, each with the card copy", () => {
    expect(TIPS.map((t) => t.id)).toEqual([
      "home-logged", "meal-add", "past-day", "multi-select", "add-tray", "food-detail", "compare",
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
    expect(DEFAULT_FLAGS).toEqual({ tourDone: false, tipsOff: false, seen: [], used: [], replayOpened: false });
  });

  it("read from storage, with anything wrong ignored", () => {
    expect(parseFlags({ tourDone: true, tipsOff: true, seen: ["a", 3, "b"], used: "x", replayOpened: true })).toEqual({
      tourDone: true,
      tipsOff: true,
      seen: ["a", "b"],
      used: [],
      replayOpened: true,
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
