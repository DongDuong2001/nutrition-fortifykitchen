import { describe, expect, it } from "vitest";
import {
  SHARE_CSS_WIDTH,
  SHARE_MIN_CSS_HEIGHT,
  SHARE_MIN_HEIGHT,
  SHARE_SCALE,
  SHARE_WIDTH,
  buildShareModel,
  shareFilename,
  shareImageHeight,
  shareKey,
  shareMeals,
  shareName,
  shareNeedsName,
} from "../share-card";
import { entriesFromAdded, groupMeals, type HomeEntry } from "../home";
import { countedForLevel } from "../level-nutrients";
import { SAMPLE_DAY } from "../mock/sample-day";

const NOW = new Date("2026-10-15T10:00:00+07:00");
const TODAY = { ...SAMPLE_DAY, date: "2026-10-15" };

function entry(id: string, slot: HomeEntry["slot"], name: string): HomeEntry {
  return { id, name, qty: "100 g", grams: 100, slot, kcal: 100, protein: 1, carbs: 1, fat: 1, fiber: 1, nutrients: {}, quick: false };
}

function model(over: Partial<Parameters<typeof buildShareModel>[0]> = {}) {
  const entries = [entry("a", "breakfast", "Yến mạch"), entry("b", "dinner", "Cá hồi")];
  return buildShareModel({
    day: TODAY,
    entries,
    meals: groupMeals(entries),
    finished: false,
    now: NOW,
    displayName: "",
    level: 2,
    nutrientIds: countedForLevel(over.level ?? 2),
    ...over,
  });
}

describe("share image size", () => {
  it("is always 1080 wide, drawn at 390 CSS px", () => {
    expect(SHARE_WIDTH).toBe(1080);
    expect(SHARE_CSS_WIDTH).toBe(390);
    expect(SHARE_CSS_WIDTH * SHARE_SCALE).toBeCloseTo(1080, 9);
  });

  it("is never under 1920 high: a short page is filled up to 1920", () => {
    expect(SHARE_MIN_CSS_HEIGHT * SHARE_SCALE).toBeCloseTo(1920, 9);
    expect(shareImageHeight(300)).toBe(SHARE_MIN_HEIGHT);
    expect(shareImageHeight(SHARE_MIN_CSS_HEIGHT)).toBe(1920);
    expect(shareImageHeight(0)).toBe(1920);
    expect(shareImageHeight(Number.NaN)).toBe(1920);
  });

  it("grows with a long page and never cuts it (rounded up to a whole pixel)", () => {
    expect(shareImageHeight(800)).toBe(Math.ceil(800 * SHARE_SCALE));
    expect(shareImageHeight(800)).toBeGreaterThan(1920);
    expect(shareImageHeight(1000.2)).toBeGreaterThanOrEqual(1000.2 * SHARE_SCALE);
    // the page height is a whole number of image pixels over the scale: no extra row
    expect(shareImageHeight(2400 / SHARE_SCALE)).toBe(2400);
  });
});

describe("share model", () => {
  it("labels the date with the shared helper", () => {
    expect(model().dateLabel).toBe("Hôm nay 15/10");
    expect(model({ day: { ...SAMPLE_DAY, date: "2026-10-14" }, finished: true }).dateLabel).toBe("Hôm qua 14/10");
    expect(
      model({ day: { ...SAMPLE_DAY, date: "2026-10-14" }, finished: true, now: new Date("2026-10-16T10:00:00+07:00") }).dateLabel
    ).toBe("Thứ Tư 14/10");
  });

  it("carries the name trimmed, or null when none is set", () => {
    expect(shareName("  Hào  ")).toBe("Hào");
    expect(shareName("")).toBeNull();
    expect(shareName("   ")).toBeNull();
    expect(shareName(undefined)).toBeNull();
    expect(model({ displayName: " Linh " }).name).toBe("Linh");
    expect(model({ displayName: "" }).name).toBeNull();
  });

  it("the hero label counts the day's foods in sentence case", () => {
    expect(model().heroLabel).toBe("Cả ngày · 2 món");
  });

  it("shows the whole day's numbers and targets (as Hôm nay does)", () => {
    const m = model();
    expect(m.values.kcal).toBe(1041);
    expect(m.kcalTarget).toEqual({ min: 1950, max: 2275 });
    expect(m.macroTargets.protein).not.toBeNull();
    expect(Object.keys(m.nutrientTargets)).toEqual(countedForLevel(2));
  });

  it("leaves out meals with no food", () => {
    const all = groupMeals([entry("a", "breakfast", "Yến mạch"), entry("b", "dinner", "Cá hồi")]);
    expect(all).toHaveLength(4);
    expect(shareMeals(all).map((x) => x.slot)).toEqual(["breakfast", "dinner"]);
    expect(model().meals.map((x) => x.slot)).toEqual(["breakfast", "dinner"]);
  });

  it("names the file h1t-micro-YYYY-MM-DD.png", () => {
    expect(shareFilename("2026-10-15")).toBe("h1t-micro-2026-10-15.png");
    expect(model().filename).toBe("h1t-micro-2026-10-15.png");
  });

  it("describes the image for a screen reader with the same numbers", () => {
    const alt = model({ displayName: "Linh" }).alt;
    expect(alt).toContain("Ảnh tóm tắt Hôm nay 15/10 của Linh");
    expect(alt).toContain("1.041 / 1.950–2.275 kcal, 53%");
    expect(alt).toMatch(/Vi chất đạt \d+\/14/);
  });

  it("holds nothing private: no email, weight or profile numbers", () => {
    const text = JSON.stringify(model({ displayName: "Linh" }));
    expect(text).not.toContain(TODAY.user.email);
    expect(text).not.toMatch(/\bkg\b/);
    expect(text).not.toMatch(/birthYear|weightKg|trainingMinutes/);
  });

  it("carries the Level for the badge and its own lists and counts", () => {
    expect(model({ level: 0 }).level).toBe(0);
    expect(model({ level: 0 }).summary.total).toBe(8);
    expect(model({ level: 2 }).summary.total).toBe(14);
    expect(model({ level: 3 }).summary.total).toBe(18);
    expect(model({ level: 5 }).summary.total).toBe(22);
    expect(model({ level: 1 }).groups.map((g) => g.title)).toEqual(["Khoáng chất", "Vitamin"]);
    expect(model({ level: 3 }).groups.map((g) => g.title)).toEqual(["Chi tiết béo & xơ", "Khoáng chất", "Vitamin"]);
  });

  it("works from added entries too (a past day)", () => {
    expect(entriesFromAdded([])).toEqual([]);
  });
});

describe("share colour key", () => {
  it("today: one entry, cobalt for reached", () => {
    const key = shareKey(false);
    expect(key).toHaveLength(1);
    expect(key[0].label).toBe("Xanh: đạt mục tiêu");
    expect(key[0].color).toContain("var(--color-");
  });

  it("past day: the four levels with their thresholds", () => {
    const key = shareKey(true);
    expect(key.map((k) => k.label)).toEqual(["Thiếu <50%", "Trung bình", "Gần đủ", "Đạt ≥100%"]);
    expect(new Set(key.map((k) => k.color)).size).toBe(4);
  });

  it("model picks the key by day state", () => {
    expect(model({ finished: false }).key).toHaveLength(1);
    expect(model({ finished: true }).key).toHaveLength(4);
  });
});

describe("the share image always has a name", () => {
  it("the sheet blocks drawing while the display name is blank", () => {
    expect(shareNeedsName("")).toBe(true);
    expect(shareNeedsName("   ")).toBe(true);
    expect(shareNeedsName(null)).toBe(true);
    expect(shareNeedsName(undefined)).toBe(true);
  });

  it("a name lets it draw", () => {
    expect(shareNeedsName("Vũ Minh Hào")).toBe(false);
    expect(shareNeedsName("  A ")).toBe(false);
  });

  it("the model of a named profile carries the name (the no-name branch is only a fallback)", () => {
    expect(model({ displayName: "Vũ Minh Hào" }).name).toBe("Vũ Minh Hào");
    expect(model({ displayName: "" }).name).toBeNull();
  });
});
