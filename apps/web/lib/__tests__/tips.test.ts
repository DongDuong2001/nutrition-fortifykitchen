import { describe, expect, it, vi } from "vitest";
import { canVibrate } from "../haptics";
import { DEFAULT_FLAGS, markSeenIn, markShareLaterIn, markTipShownIn, markTourStartedIn, markUsedIn, parseFlags, setTipsOffIn, tourOpenOn, type OnboardingFlags } from "../onboarding-flags";
import { TIPS, pickTip, type TipContext } from "../tips";

const ctx = (over: Partial<TipContext> = {}): TipContext => ({ pathname: "/app", pastDay: false, foodsToday: 2, ...over });
const flags = (over: Partial<OnboardingFlags> = {}): OnboardingFlags => ({ ...DEFAULT_FLAGS, ...over });
const ids = (c: TipContext, f = flags()) => pickTip({ ctx: c, flags: f, tourActive: false })?.id ?? null;

describe("the tips table", () => {
  it("has the 15 tips of the design boards, cc-49's Chưa lưu, the sheet, offline and cc-53b's portion tips, each with the card copy", () => {
    expect(TIPS.map((t) => t.id)).toEqual([
      "sheet-drag", "sync-offline", "unsaved", "home-share", "home-logged", "meal-add", "day-template", "pull-refresh", "nutrient-sources", "past-day", "multi-select", "add-tray", "add-shortlists", "haptics",
      "food-detail", "cook-state", "egg-mode", "portion-multiply", "tray-row", "quantity-stepper", "compare",
      "food-new", "food-new-nutrients", "training", "training-size", "training-add-item", "micros", "trends-micros", "explore", "overview", "leaderboard",
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

describe("pickTip: the ×N stepper", () => {
  // A supplement or an egg: on its food page, in the add screen's portion panel, in the entry editor
  const page = "/foods/food-trung-ga";
  it("shows once the stepper is on screen, for a supplement and for an egg", () => {
    const settled = flags({ seen: ["food-detail", "add-tray", "add-shortlists"] });
    expect(ids(ctx({ pathname: page, stepper: true }), settled)).toBe("quantity-stepper");
    expect(ids(ctx({ pathname: "/foods/sup-canprev-mag", stepper: true }), settled)).toBe("quantity-stepper");
    expect(ids(ctx({ pathname: "/add", stepper: true }), settled)).toBe("quantity-stepper");
    expect(ids(ctx({ pathname: page, stepper: false }), settled)).toBeNull();
  });
  it("no longer waits for a unit toggle tip (cc-53b retired it: normal foods go by grams)", () => {
    expect(TIPS.some((t) => t.id === "unit-toggle")).toBe(false);
    expect(ids(ctx({ pathname: page, stepper: true }), flags({ seen: ["food-detail"] }))).toBe("quantity-stepper");
  });
  it("only once, and never after the user stepped a count", () => {
    const settled = ["food-detail"];
    expect(ids(ctx({ pathname: page, stepper: true }), flags({ seen: [...settled, "quantity-stepper"] }))).toBeNull();
    expect(ids(ctx({ pathname: page, stepper: true }), flags({ seen: settled, used: ["quantity-step"] }))).toBeNull();
  });
  it("also inside a sheet (the add tray), where the page's tips wait", () => {
    expect(ids(ctx({ pathname: "/add", stepper: true, sheetOpen: true }), flags({ seen: ["sheet-drag"] }))).toBe("quantity-stepper");
  });
  it("points at the stepper's one stable target, unit-stepper (cc-53)", () => {
    expect(TIPS.find((t) => t.id === "quantity-stepper")?.target).toBe("unit-stepper");
  });
});

describe("pickTip: the portion sheet's controls (cc-53b)", () => {
  const inSheet = (over: Partial<TipContext>) => ctx({ pathname: "/add", sheetOpen: true, ...over });
  const settled = flags({ seen: ["sheet-drag", "add-tray", "add-shortlists"] });
  it("Sống | Chín first, then ×N, each once and never after it was used", () => {
    expect(ids(inSheet({ cook: true, multiply: true }), settled)).toBe("cook-state");
    expect(ids(inSheet({ cook: true, multiply: true }), flags({ seen: [...settled.seen, "cook-state"] }))).toBe("portion-multiply");
    expect(ids(inSheet({ cook: true, multiply: true }), flags({ seen: settled.seen, used: ["cook-state", "portion-multiply"] }))).toBeNull();
  });
  it("an egg gets its Quả | Gam tip, the tray its row tip", () => {
    expect(ids(inSheet({ egg: true }), settled)).toBe("egg-mode");
    expect(ids(inSheet({ tray: true }), settled)).toBe("tray-row");
    expect(ids(inSheet({ tray: true }), flags({ seen: settled.seen, used: ["tray-row"] }))).toBeNull();
  });
});

describe("pickTip: drag a sheet down to close", () => {
  it("on the first sheet opened on a phone, before any other tip", () => {
    expect(ids(ctx({ sheetOpen: true, touch: true }))).toBe("sheet-drag");
    expect(ids(ctx({ sheetOpen: true, touch: true, stepper: true }))).toBe("sheet-drag");
  });
  it("never with a mouse, once seen, or after a drag", () => {
    expect(ids(ctx({ sheetOpen: true, touch: false }))).toBeNull();
    expect(ids(ctx({ sheetOpen: true, touch: true }), flags({ seen: ["sheet-drag"] }))).toBeNull();
    expect(ids(ctx({ sheetOpen: true, touch: true }), flags({ used: ["sheet-drag"] }))).toBeNull();
  });
  it("while a sheet is open, the page's own tips wait (they would point under it)", () => {
    expect(ids(ctx({ sheetOpen: true, touch: true }), flags({ seen: ["sheet-drag"] }))).toBeNull();
    expect(ids(ctx({ pathname: "/training", sheetOpen: true }))).toBeNull();
    expect(ids(ctx({ pathname: "/training", sheetOpen: false }))).toBe("training");
  });
});

describe("pickTip: offline", () => {
  it("on today's Hôm nay with no network, pointing at the header sync status", () => {
    expect(ids(ctx({ offline: true }))).toBe("sync-offline");
    expect(ids(ctx({ offline: true, foodsToday: 0 }))).toBe("sync-offline");
    expect(TIPS.find((t) => t.id === "sync-offline")?.target).toBe("sync-status");
  });
  it("not online, not on a past day, not in select mode, not once seen", () => {
    expect(ids(ctx({ offline: false }))).toBe("home-share");
    expect(ids(ctx({ offline: true, pastDay: true }))).toBe("past-day");
    expect(ids(ctx({ offline: true, selectMode: true }))).toBe("multi-select");
    expect(ids(ctx({ offline: true }), flags({ seen: ["sync-offline"] }))).toBe("home-share");
  });
});

describe("pickTip: Món tự tính", () => {
  it("says the dish is saved to the account", () => {
    expect(TIPS.find((t) => t.id === "food-new")?.body).toContain("Món lưu vào tài khoản");
  });
});

describe("pickTip: pull to refresh (cc-51)", () => {
  const seen = flags({ seen: ["home-logged", "meal-add"], used: ["share-day"] });
  it("on a touch screen, once the first tips of Hôm nay were seen", () => {
    expect(ids(ctx({ touch: true, foodsToday: 1 }), seen)).toBe("pull-refresh");
  });
  it("never with a mouse, never on a past day, never after a pull", () => {
    // cc-51: the nutrient tip comes next on Hôm nay for everyone
    expect(ids(ctx({ touch: false, foodsToday: 1 }), seen)).toBe("nutrient-sources");
    expect(ids(ctx({ touch: true, foodsToday: 1, pastDay: true }), seen)).toBe("past-day");
    expect(ids(ctx({ touch: true, foodsToday: 1 }), flags({ seen: ["home-logged", "meal-add", "nutrient-sources"], used: ["pull-refresh", "share-day"] }))).toBe(null);
  });
});

describe("pickTip: tap a nutrient (cc-51)", () => {
  it("on today once the first tips were seen, never on a past day, never after a tap", () => {
    const seen = flags({ seen: ["home-logged", "meal-add"], used: ["share-day"] });
    expect(ids(ctx({ foodsToday: 1 }), seen)).toBe("nutrient-sources");
    expect(ids(ctx({ foodsToday: 1, pastDay: true }), seen)).toBe("past-day");
    expect(ids(ctx({ foodsToday: 1 }), flags({ seen: ["home-logged", "meal-add"], used: ["nutrient-sources", "share-day"] }))).toBe(null);
  });
});

describe("pickTip: Rung khi chạm (cc-51)", () => {
  it("on Cài đặt where the phone can vibrate; never on iOS (no vibrate); never after the switch was used", () => {
    expect(ids(ctx({ pathname: "/settings", vibrate: true }))).toBe("haptics");
    expect(ids(ctx({ pathname: "/settings", vibrate: false }))).toBe(null);
    expect(ids(ctx({ pathname: "/settings", vibrate: true }), flags({ used: ["haptics-switch"] }))).toBe(null);
  });
  it("review 07:00: never on desktop Chrome (navigator.vibrate exists, but no touch screen)", () => {
    vi.stubGlobal("navigator", { vibrate: () => true });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    try {
      expect(ids(ctx({ pathname: "/settings", vibrate: canVibrate() }))).toBe(null);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("pickTip: Chưa lưu (cc-49)", () => {
  it("shows first on Hôm nay when an entry of today is not saved yet", () => {
    expect(ids(ctx({ unsaved: 1 }))).toBe("unsaved");
  });
  it("not without an unsaved entry, not on a past day, not in select mode", () => {
    expect(ids(ctx({ unsaved: 0 }))).toBe("home-share");
    expect(ids(ctx({ unsaved: 1, pastDay: true }))).toBe("past-day");
    expect(ids(ctx({ unsaved: 1, selectMode: true }))).toBe("multi-select");
  });
  it("not once the user tapped Thử lại", () => {
    expect(ids(ctx({ unsaved: 1 }), flags({ used: ["retry-unsaved"] }))).toBe("home-share");
  });
  it("review 07:00: the copy also tells about the Chưa lưu button at the top", () => {
    expect(TIPS.find((t) => t.id === "unsaved")?.body).toBe(
      "Món có chữ Chưa lưu vẫn nằm trên máy này. App tự gửi lại khi có mạng và mỗi lần mở app; chạm Chưa lưu ở đầu trang để gửi ngay."
    );
  });
});

describe("pickTip: Ngày tập (cc-52)", () => {
  const training = (over: Partial<TipContext> = {}) => ctx({ pathname: "/training", ...over });
  it("the Bự / Bé chip after the minutes tip, then + Thêm món, one per visit", () => {
    expect(ids(training())).toBe("training");
    expect(ids(training(), flags({ seen: ["training"] }))).toBe("training-size");
    expect(ids(training(), flags({ seen: ["training", "training-size"] }))).toBe("training-add-item");
  });
  it("never once the control was used, never on a past day (view-only, no chip, no + Thêm món)", () => {
    expect(ids(training(), flags({ used: ["training-minutes", "training-size"] }))).toBe("training-add-item");
    expect(ids(training(), flags({ used: ["training-minutes", "training-size", "training-add-item"] }))).toBeNull();
    expect(ids(training({ pastDay: true }), flags({ used: ["training-minutes"] }))).toBeNull();
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
    // + Thêm vi chất khác: only while Tự nhập shows the button, after the create tip, until a nutrient was added once
    const created = flags({ used: ["create-food"] });
    expect(ids(ctx({ pathname: "/foods/new" }), created)).toBe(null);
    expect(ids(ctx({ pathname: "/foods/new", "add-nutrient": true }), created)).toBe("food-new-nutrients");
    expect(ids(ctx({ pathname: "/foods/new", "add-nutrient": true }), flags({ used: ["create-food", "add-nutrient"] }))).toBe(null);
    expect(ids(ctx({ pathname: "/foods/food-cha-la" }))).toBe("food-detail");
    expect(ids(ctx({ pathname: "/foods/compare" }))).toBe("compare");
    expect(ids(ctx({ pathname: "/explore/leaderboard" }))).toBe("leaderboard");
  });

  const trainingDone = ["training-minutes", "training-size", "training-add-item"];

  it("not on a second visit: a tip that was seen stays quiet", () => {
    expect(ids(ctx({ pathname: "/training" }), flags({ seen: ["training", "training-size", "training-add-item"] }))).toBeNull();
  });

  it("not when the user has already used the feature", () => {
    expect(ids(ctx({ pathname: "/training" }), flags({ used: trainingDone }))).toBeNull();
    // cc-51: then the shortlist tip is next on /add, until a one-tap add from Gần đây or Hay ăn
    expect(ids(ctx({ pathname: "/add" }), flags({ used: ["tray-add"] }))).toBe("add-shortlists");
    expect(ids(ctx({ pathname: "/add" }), flags({ used: ["tray-add", "shortlist-add"] }))).toBeNull();
  });

  it("not when tips are off, and not while the tour runs", () => {
    expect(ids(ctx({ pathname: "/training" }), flags({ tipsOff: true }))).toBeNull();
    expect(pickTip({ ctx: ctx({ pathname: "/training" }), flags: flags(), tourActive: true })).toBeNull();
  });

  it("one tip per visit: Hôm nay with foods offers one, the next visit offers the next", () => {
    expect(ids(ctx())).toBe("home-share");
    const shared = (seen: string[]) => flags({ seen, used: ["share-day"] });
    expect(ids(ctx(), shared([]))).toBe("home-logged");
    expect(ids(ctx(), shared(["home-logged"]))).toBe("meal-add");
    expect(ids(ctx(), shared(["home-logged", "meal-add"]))).toBe("nutrient-sources");
    expect(ids(ctx(), shared(["home-logged", "meal-add", "nutrient-sources"]))).toBeNull();
  });

  it("Hôm nay tips wait for the first food (an empty day has only Chép ngày ăn mẫu), and the past-day tip is for a past day only", () => {
    expect(ids(ctx({ foodsToday: 0 }))).toBe("day-template");
    expect(ids(ctx({ foodsToday: 0 }), flags({ seen: ["day-template"] }))).toBeNull();
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
    expect(DEFAULT_FLAGS).toEqual({
      tourDone: false,
      tipsOff: false,
      seen: [],
      used: [],
      replayOpened: false,
      tourStartedIso: null,
      whatsNewSeen: null,
      tipShownAt: null,
      shareLater: 0,
      shareTipIso: null,
      shareNudgeIso: null,
    });
  });

  it("read from storage, with anything wrong ignored", () => {
    expect(parseFlags({ tourDone: true, tipsOff: true, seen: ["a", 3, "b"], used: "x", replayOpened: true, whatsNewSeen: 7 })).toEqual({
      tourDone: true,
      tipsOff: true,
      seen: ["a", "b"],
      used: [],
      replayOpened: true,
      tourStartedIso: null,
      whatsNewSeen: null,
      tipShownAt: null,
      shareLater: 0,
      shareTipIso: null,
      shareNudgeIso: null,
    });
    expect(parseFlags({ whatsNewSeen: "2026-10-17" }).whatsNewSeen).toBe("2026-10-17");
    // share-spotlight: the count of "Để sau" and the two days, anything wrong ignored
    expect(parseFlags({ shareLater: 1, shareTipIso: "2026-10-22", shareNudgeIso: "2026-10-21" })).toMatchObject({ shareLater: 1, shareTipIso: "2026-10-22", shareNudgeIso: "2026-10-21" });
    expect(parseFlags({ shareLater: -1, shareTipIso: "today", shareNudgeIso: 3 })).toMatchObject({ shareLater: 0, shareTipIso: null, shareNudgeIso: null });
    expect(parseFlags({ shareLater: 1.5 }).shareLater).toBe(0);
    expect(markShareLaterIn(markShareLaterIn(DEFAULT_FLAGS)).shareLater).toBe(2);
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

describe("the share tip (share-spotlight)", () => {
  it("is the first tip of Hôm nay today once it holds one food (an empty day makes an empty image)", () => {
    expect(ids(ctx({ foodsToday: 1 }))).toBe("home-share");
    expect(ids(ctx({ foodsToday: 7 }))).toBe("home-share");
    expect(ids(ctx({ foodsToday: 0 }))).toBe("day-template");
  });

  it("not on a past day, in select mode or on another screen", () => {
    expect(ids(ctx({ foodsToday: 5, pastDay: true }))).toBe("past-day");
    expect(ids(ctx({ foodsToday: 5, pastDay: true }), flags({ seen: ["past-day"] }))).toBeNull();
    expect(ids(ctx({ foodsToday: 5, selectMode: true }))).toBe("multi-select");
    expect(ids(ctx({ foodsToday: 5, pathname: "/explore" }))).toBe("explore");
  });

  it("again after it was seen, until Để sau twice; never after a share or Thử ngay; never with tips off", () => {
    expect(ids(ctx(), flags({ seen: ["home-share"] }))).toBe("home-share");
    expect(ids(ctx(), flags({ seen: ["home-share"], shareLater: 1 }))).toBe("home-share");
    expect(ids(ctx(), flags({ seen: ["home-share"], shareLater: 2 }))).toBe("home-logged");
    expect(ids(ctx(), flags({ used: ["share-day"] }))).toBe("home-logged");
    expect(ids(ctx(), flags({ used: ["share-tip-try"] }))).toBe("home-logged");
    expect(ids(ctx(), flags({ tipsOff: true }))).toBeNull();
  });

  it("counts as the day's one tip: nothing within 24 h of the last tip", () => {
    const now = Date.parse("2026-10-22T12:00:00+07:00");
    expect(pickTip({ ctx: ctx(), flags: flags({ tipShownAt: now - 3600_000 }), tourActive: false, now })?.id ?? null).toBeNull();
    expect(pickTip({ ctx: ctx(), flags: flags({ tipShownAt: now - 25 * 3600_000 }), tourActive: false, now })?.id).toBe("home-share");
  });

  it("is the one tip that may follow Có gì mới: after it, no other tip", () => {
    const after = (c: TipContext, f = flags()) => pickTip({ ctx: c, flags: f, tourActive: false, afterWhatsNew: true })?.id ?? null;
    expect(after(ctx())).toBe("home-share");
    expect(after(ctx({ foodsToday: 0 }))).toBeNull();
    expect(after(ctx(), flags({ used: ["share-day"] }))).toBeNull();
    expect(after(ctx({ pathname: "/explore" }))).toBeNull();
    expect(TIPS.filter((t) => t.afterWhatsNew).map((t) => t.id)).toEqual(["home-share"]);
  });

  it("never during the tour", () => {
    expect(pickTip({ ctx: ctx(), flags: flags(), tourActive: true })).toBeNull();
  });

  it("has the bubble copy, a box around the Chia sẻ pill, Thử ngay and Để sau", () => {
    const tip = TIPS.find((t) => t.id === "home-share");
    expect(`${tip?.title} — ${tip?.body}`).toBe("Chia sẻ ngày ăn của bạn — Ảnh tóm tắt đẹp, gửi ngay cho bạn bè hoặc HLV.");
    expect(tip?.tryLabel).toBe("Thử ngay");
    expect(tip?.laterLabel).toBe("Để sau");
    expect(tip?.round).toBeUndefined();
    expect(tip?.target).toBe("home-share");
  });
});

// design-floor (V3, 22/10): at most one tip a day. The same tips, triggers and "used" events; only how often changes.
describe("pickTip: one tip per 24 h", () => {
  const HOUR = 3600_000;
  const now = Date.parse("2026-10-22T10:00:00+07:00");

  it("picks as before when no clock is given (the old behaviour holds)", () => {
    const before = ids(ctx());
    expect(pickTip({ ctx: ctx(), flags: flags({ tipShownAt: now - HOUR }), tourActive: false })?.id ?? null).toBe(before);
  });

  it("picks as before when no tip was shown yet", () => {
    expect(pickTip({ ctx: ctx(), flags: flags(), tourActive: false, now })?.id ?? null).toBe(ids(ctx()));
  });

  it("shows nothing within 24 h of the last tip, and the next one after", () => {
    expect(pickTip({ ctx: ctx(), flags: flags({ tipShownAt: now - 23 * HOUR }), tourActive: false, now })).toBeNull();
    expect(pickTip({ ctx: ctx(), flags: flags({ tipShownAt: now - 24 * HOUR }), tourActive: false, now })?.id ?? null).toBe(ids(ctx()));
  });

  it("marking a tip shown adds it to seen and stamps the time; markSeenIn is unchanged", () => {
    const shown = markTipShownIn(flags(), "meal-add", now);
    expect(shown.seen).toEqual(["meal-add"]);
    expect(shown.tipShownAt).toBe(now);
    expect(markSeenIn(flags(), "meal-add")).toEqual({ ...flags(), seen: ["meal-add"] });
  });

  it("reads the stamp back from storage, and anything else as none", () => {
    expect(parseFlags({ tipShownAt: now }).tipShownAt).toBe(now);
    expect(parseFlags({ tipShownAt: "x" }).tipShownAt).toBeNull();
    expect(parseFlags({}).tipShownAt).toBeNull();
  });
});

describe("the Chép ngày ăn mẫu tip (feat/ngay-mau)", () => {
  const tip = TIPS.find((t) => t.id === "day-template");

  it("points at the pill and is done once the pill has been used", () => {
    expect(tip?.target).toBe("day-template-pill");
    expect(tip?.used).toEqual(["day-template"]);
    expect(ids(ctx({ foodsToday: 0 }), flags({ used: ["day-template"] }))).toBeNull();
  });

  it("is for an empty day that can be added to: not a day with food, not a past day, not select mode, not a sheet over it", () => {
    expect(ids(ctx({ foodsToday: 1 }), flags({ seen: ["home-logged", "meal-add", "nutrient-sources"], used: ["share-day"] }))).toBeNull();
    expect(ids(ctx({ foodsToday: 0, pastDay: true }))).toBe("past-day");
    expect(ids(ctx({ foodsToday: 0, selectMode: true }))).toBe("multi-select");
    expect(ids(ctx({ foodsToday: 0, sheetOpen: true }))).toBeNull();
    expect(ids(ctx({ foodsToday: 0, pathname: "/explore" }), flags({ seen: ["explore"] }))).toBeNull();
  });

  it("copy has no colon, like the other tips", () => {
    expect(tip?.body).not.toContain(":");
    expect(tip?.title).not.toContain(":");
  });
});
