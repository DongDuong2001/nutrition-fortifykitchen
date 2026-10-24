/**
 * feat/sound-goals §5 T3: the ten sparks of the Đủ chất moment fly out of the column counter. The card is `overflow-hidden`, so
 * they live in a sibling layer, and each one stops where the card's edge plus 8 px would be, the dot included (the mockup's flat
 * 44 px put the upper ones about 15 px outside). Pure: the geometry in, one distance per angle out.
 */
export const SPARK_COUNT = 10;
/** How far outside the card a spark may end */
export const SPARK_MARGIN = 8;
/** The dot is 6 px wide */
export const SPARK_RADIUS = 3;

export interface SparkBox {
  /** The card's size */
  width: number;
  height: number;
  /** The counter's centre, from the card's top left */
  originX: number;
  originY: number;
}

/** The distance a spark at `angleDeg` (CSS rotate: 0 right, 90 down) may travel: the wanted one, cut by the card's edge ±8 px, whole pixels. */
export function sparkDistance(angleDeg: number, wanted: number, box: SparkBox): number {
  const reach = SPARK_MARGIN - SPARK_RADIUS;
  const dx = Math.cos((angleDeg * Math.PI) / 180);
  const dy = Math.sin((angleDeg * Math.PI) / 180);
  // The ray leaves the box [-reach, size + reach] on each axis; the nearer exit is the limit
  const limit = (d: number, origin: number, size: number) => (Math.abs(d) < 1e-9 ? Infinity : ((d > 0 ? size + reach : -reach) - origin) / d);
  const max = Math.min(limit(dx, box.originX, box.width), limit(dy, box.originY, box.height));
  return Math.max(0, Math.floor(Math.min(wanted, max) + 1e-9));
}

export interface Spark {
  /** Degrees, for the `--a` property */
  angle: number;
  /** Pixels, for the `--d` property */
  distance: number;
}

/** The mockup's ten: 36° apart from 8°, alternately 34 and 46 px, each cut to the card. */
export function sparks(box: SparkBox): Spark[] {
  return Array.from({ length: SPARK_COUNT }, (_, i) => {
    const angle = i * 36 + 8;
    return { angle, distance: sparkDistance(angle, i % 2 ? 46 : 34, box) };
  });
}
