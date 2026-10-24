import { describe, expect, it } from "vitest";
import { SPARK_COUNT, SPARK_MARGIN, SPARK_RADIUS, sparkDistance, sparks, type SparkBox } from "../goal-sparks";

// feat/sound-goals §5 T3: the ten sparks stay within the card ±8 px (the mockup's 44 px put the upper ones ~15 px outside).

/** The column card on a phone: the counter's centre is 32 px below the card's top and 40 px from its left edge. */
const card: SparkBox = { width: 358, height: 420, originX: 40, originY: 32 };
const rad = (deg: number) => (deg * Math.PI) / 180;

describe("sparkDistance", () => {
  it("straight up: the card's top is 32 px away, the +8 px margin less the 3 px dot leaves 37 px", () => {
    expect(sparkDistance(-90, 46, card)).toBe(37);
  });
  it("straight left: 40 + 5 = 45 px, so a 46 px spark is cut and a 34 px one is kept", () => {
    expect(sparkDistance(180, 46, card)).toBe(45);
    expect(sparkDistance(180, 34, card)).toBe(34);
  });
  it("right and down have room: the wanted distance", () => {
    expect(sparkDistance(0, 46, card)).toBe(46);
    expect(sparkDistance(90, 46, card)).toBe(46);
  });
  it("a diagonal is cut by whichever edge it meets first", () => {
    // 45° up-left: 32 + 5 = 37 px up and 45 px left; the top edge comes first at 37 / sin 45°
    expect(sparkDistance(-135, 60, card)).toBe(Math.floor(37 / Math.SQRT1_2));
  });
  it("never negative, even for an origin outside the allowed box", () => {
    expect(sparkDistance(-90, 46, { ...card, originY: -20 })).toBe(0);
  });
  it("whole pixels, rounded down, so a spark never ends a fraction outside", () => {
    expect(Number.isInteger(sparkDistance(-100, 46, card))).toBe(true);
  });
});

describe("sparks (the ten of the Đủ chất moment)", () => {
  it("makes ten, 36° apart from 8°, alternating 34 and 46 px as the mockup", () => {
    const wide: SparkBox = { width: 2000, height: 2000, originX: 1000, originY: 1000 };
    const list = sparks(wide);
    expect(list).toHaveLength(SPARK_COUNT);
    expect(SPARK_COUNT).toBe(10);
    expect(list.map((s) => s.angle)).toEqual(Array.from({ length: 10 }, (_, i) => i * 36 + 8));
    expect(list.map((s) => s.distance)).toEqual([34, 46, 34, 46, 34, 46, 34, 46, 34, 46]);
  });

  it.each([
    ["a phone card", card],
    ["a desktop aside", { width: 400, height: 560, originX: 40, originY: 32 }],
    ["a small card", { width: 200, height: 120, originX: 40, originY: 32 }],
  ])("every spark of %s ends within the card ±8 px, dot included", (_name, box) => {
    for (const { angle, distance } of sparks(box)) {
      const x = box.originX + distance * Math.cos(rad(angle));
      const y = box.originY + distance * Math.sin(rad(angle));
      expect(x - SPARK_RADIUS).toBeGreaterThanOrEqual(-SPARK_MARGIN);
      expect(y - SPARK_RADIUS).toBeGreaterThanOrEqual(-SPARK_MARGIN);
      expect(x + SPARK_RADIUS).toBeLessThanOrEqual(box.width + SPARK_MARGIN);
      expect(y + SPARK_RADIUS).toBeLessThanOrEqual(box.height + SPARK_MARGIN);
    }
  });

  it("the mockup's flat 44 px would have broken that on the phone card (why the distance is per angle)", () => {
    const outside = sparks(card).filter(({ angle }) => card.originY + 44 * Math.sin(rad(angle)) - SPARK_RADIUS < -SPARK_MARGIN);
    expect(outside.length).toBeGreaterThan(0);
  });
});
