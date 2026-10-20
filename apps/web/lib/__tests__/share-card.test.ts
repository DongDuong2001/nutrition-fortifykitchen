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
  shareImageSize,
  SHARE_MAX_HEIGHT,
  shareKey,
  shareMeals,
  shareName,
  shareFontsEmbedded,
  shareNeedsName,
  keepInShareImage,
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
    expect(shareName("  Học viên A  ")).toBe("Học viên A");
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
    expect(m.kcalTarget).toEqual({ min: 2275, max: 2275 });
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
    expect(alt).toContain("1.041 / 2.275 kcal, 46%");
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
  it("is the four levels with their thresholds, today and past days alike", () => {
    const key = shareKey();
    expect(key.map((k) => k.label)).toEqual(["Thiếu <50%", "Trung bình", "Gần đủ", "Đạt ≥100%"]);
    expect(new Set(key.map((k) => k.color)).size).toBe(4);
  });

  it("the model carries the same key whether the day is open or finished", () => {
    expect(model({ finished: false }).key).toHaveLength(4);
    expect(model({ finished: true }).key).toEqual(model({ finished: false }).key);
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
    expect(shareNeedsName("Học viên A")).toBe(false);
    expect(shareNeedsName("  A ")).toBe(false);
  });

  it("the model of a named profile carries the name (the no-name branch is only a fallback)", () => {
    expect(model({ displayName: "Học viên A" }).name).toBe("Học viên A");
    expect(model({ displayName: "" }).name).toBeNull();
  });
});

describe("share image size cap", () => {
  it("is 1080 wide and as tall as the page up to 12,000 px", () => {
    expect(shareImageSize(2000)).toEqual({ scale: SHARE_SCALE, width: 1080, height: Math.ceil(2000 * SHARE_SCALE - 1e-6) });
    expect(shareImageSize(100).height).toBe(1920);
    expect(SHARE_MAX_HEIGHT).toBe(12000);
  });

  it("draws a taller page smaller so the height stops at the cap", () => {
    const size = shareImageSize(8000);
    expect(size.height).toBe(12000);
    expect(size.scale).toBeCloseTo(1.5, 5);
    expect(size.width).toBeLessThan(1080);
    expect(size.width).toBe(Math.floor(390 * size.scale));
  });
});

describe("keepInShareImage", () => {
  it("drops a node marked data-export=hide and keeps every other node, text nodes included", () => {
    expect(keepInShareImage({ dataset: { export: "hide" } })).toBe(false);
    expect(keepInShareImage({ dataset: {} })).toBe(true);
    expect(keepInShareImage({})).toBe(true);
    expect(keepInShareImage(null)).toBe(true);
  });
});

describe("shareFontsEmbedded", () => {
  const face = (family: string, src: string) => `@font-face { font-family: ${family}; font-weight: 400; src: url(${src}) format("woff2"); }`;
  const manrope = face("Manrope", '"data:font/woff2;base64,d09GMgABAAAA"');
  const saira = face("'Saira Condensed'", "data:application/font-woff;base64,d09GMgABAAAA");

  it("is true when both families are there and every face is inlined", () => {
    expect(shareFontsEmbedded(manrope + saira)).toBe(true);
  });

  it("is false without the CSS or without one of the two families", () => {
    expect(shareFontsEmbedded(undefined)).toBe(false);
    expect(shareFontsEmbedded("")).toBe(false);
    expect(shareFontsEmbedded(manrope)).toBe(false);
    expect(shareFontsEmbedded(saira)).toBe(false);
  });

  it("is false when a face's file did not load (html-to-image leaves url() empty and only warns)", () => {
    expect(shareFontsEmbedded(manrope + saira + face("Manrope", ""))).toBe(false);
    expect(shareFontsEmbedded(manrope + saira + face("Manrope", '""'))).toBe(false);
    expect(shareFontsEmbedded(manrope + saira + face("Manrope", "data:font/woff2;base64,"))).toBe(false);
  });

  it("is false when a face still points at a file: the picture cannot fetch it", () => {
    expect(shareFontsEmbedded(manrope + saira + face("Manrope", "/_next/static/media/x.woff2"))).toBe(false);
  });
});
