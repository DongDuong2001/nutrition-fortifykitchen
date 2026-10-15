import { describe, expect, it } from "vitest";
import { drawShareCard, SHARE_HEIGHT, SHARE_WIDTH, type ShareTheme } from "../home/share-card-canvas";
import { buildShareCard } from "../../lib/share-card";
import { SAMPLE_DAY } from "../../lib/mock/sample-day";

const theme: ShareTheme = { color: (v) => v, display: "Saira", sans: "Manrope" };

/** A recording stand-in for the 2D context: every method is a no-op, fillText and fillRect are kept. */
function recorder() {
  const texts: { value: string; x: number; y: number }[] = [];
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  const state: Record<string, unknown> = {};
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop === "fillText") return (value: string, x: number, y: number) => texts.push({ value, x, y });
      if (prop === "fillRect") return (x: number, y: number, w: number, h: number) => rects.push({ x, y, w, h });
      if (prop === "measureText") return (value: string) => ({ width: value.length * 12 });
      if (prop in target) return target[prop];
      return () => undefined;
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, rects };
}

const NOW = new Date("2026-10-15T10:00:00+07:00");

describe("share card drawing", () => {
  it("draws the whole summary and nothing private", () => {
    const { ctx, texts } = recorder();
    const day = { ...SAMPLE_DAY, date: "2026-10-15" };
    drawShareCard(ctx, buildShareCard({ day, finished: false, now: NOW }), theme);
    const all = texts.map((t) => t.value).join("|");
    for (const expected of ["Hôm nay 15/10", "1.041", "/ 1.950–2.275 kcal", "Đạm", "Tinh bột", "Chất béo", "Chất xơ", "Vi chất đạt 8/22", "Thiếu nhiều nhất", "Vitamin D"]) {
      expect(all).toContain(expected);
    }
    expect(all).not.toContain(day.user.email);
    expect(all).not.toMatch(/\bkg\b/);
    for (const meal of day.meals) for (const item of meal.items) expect(all).not.toContain(item.name);
  });

  it("keeps every line inside the 1420 px safe area, centred on the 1920 px story", () => {
    const { ctx, texts } = recorder();
    drawShareCard(ctx, buildShareCard({ day: SAMPLE_DAY, finished: false, now: NOW }), theme);
    const ys = texts.map((t) => t.y);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(250);
    expect(Math.max(...ys)).toBeLessThanOrEqual(SHARE_HEIGHT - 250);
    for (const t of texts) expect(t.x).toBeLessThanOrEqual(SHARE_WIDTH);
  });

  it("draws 10 segments for every bar: 5 bars", () => {
    const { ctx, rects } = recorder();
    drawShareCard(ctx, buildShareCard({ day: SAMPLE_DAY, finished: true, now: NOW }), theme);
    // 1 background + 5 bars × 10 segments
    expect(rects).toHaveLength(1 + 50);
  });
});
