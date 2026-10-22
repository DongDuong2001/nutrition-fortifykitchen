export type NutrientLevel = "thieu" | "trungbinh" | "ganDu" | "dat";
export type SegmentTone = "light" | "dark";

export function calculateSegments(pct: number): number {
  if (!(pct > 0)) return 0; // 0, a negative and NaN
  return Math.min(10, Math.floor(pct / 10));
}

export function getLevel(pct: number): NutrientLevel {
  // Written so a NaN falls to the lowest level, not the highest
  if (!(pct >= 50)) return "thieu";
  if (!(pct >= 80)) return "trungbinh";
  if (!(pct >= 100)) return "ganDu";
  return "dat";
}

export function getLevelLabel(lvl: NutrientLevel): string {
  switch (lvl) {
    case "thieu":
      return "Thiếu";
    case "trungbinh":
      return "Trung bình";
    case "ganDu":
      return "Gần đủ";
    case "dat":
      return "Đạt";
  }
}

// The colours are the level tokens in app/globals.css (@theme), so no hex lives here
export function getLevelColor(lvl: NutrientLevel, tone: SegmentTone = "light"): string {
  // One palette on light and on ink (17/10), named by meaning (V3 22/10: gần đủ mint, đạt green); `tone` still picks the empty track below
  switch (lvl) {
    case "thieu":
      return "var(--color-level-thieu)";
    case "trungbinh":
      return "var(--color-level-trungbinh)";
    case "ganDu":
      return "var(--color-level-gandu)";
    case "dat":
      return "var(--color-level-dat)";
  }
}

export function getEmptySegmentColor(tone: SegmentTone = "light"): string {
  return tone === "dark" ? "var(--color-level-empty-dark)" : "var(--color-level-empty)";
}

/** Segments of a home bar: like calculateSegments, but any value above 0 lights at least one segment. */
export function homeSegments(pct: number): number {
  if (!(pct > 0)) return 0;
  return Math.max(1, Math.min(10, Math.floor(pct / 10)));
}

/**
 * The home bars use the four levels everywhere, today included (Hao, 16/10): red under 50%, yellow 50 to 79%, mint
 * 80 to 99%, green from 100% (V3, 22/10). An unknown value is an empty bar and never gets a colour (HomeBar).
 */
export function homeBarTone(pct: number): NutrientLevel {
  return getLevel(pct);
}

/** The fill colour of a home bar. */
export function homeBarColor(tone: NutrientLevel, surface: SegmentTone = "light"): string {
  return getLevelColor(tone, surface);
}
