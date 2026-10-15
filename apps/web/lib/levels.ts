export type NutrientLevel = "thieu" | "trungbinh" | "ganDu" | "dat";
export type SegmentTone = "light" | "dark";

export function calculateSegments(pct: number): number {
  if (pct <= 0) return 0;
  return Math.min(10, Math.floor(pct / 10));
}

export function getLevel(pct: number): NutrientLevel {
  if (pct < 50) return "thieu";
  if (pct < 80) return "trungbinh";
  if (pct < 100) return "ganDu";
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
  if (tone === "dark") {
    switch (lvl) {
      case "thieu":
        return "var(--color-level-red-dark)";
      case "trungbinh":
        return "var(--color-level-yellow-dark)";
      case "ganDu":
        return "var(--color-level-green-dark)";
      case "dat":
        return "var(--color-level-blue-dark)";
    }
  }

  // Light tone default
  switch (lvl) {
    case "thieu":
      return "var(--color-level-red)";
    case "trungbinh":
      return "var(--color-level-yellow)";
    case "ganDu":
      return "var(--color-level-green)";
    case "dat":
      return "var(--color-level-blue)";
  }
}

export function getEmptySegmentColor(tone: SegmentTone = "light"): string {
  return tone === "dark" ? "var(--color-level-empty-dark)" : "var(--color-level-empty)";
}

/** Segments of a home bar: like calculateSegments, but any value above 0 lights at least one segment. */
export function homeSegments(pct: number): number {
  if (pct <= 0) return 0;
  return Math.max(1, Math.min(10, Math.floor(pct / 10)));
}

export type HomeBarTone = NutrientLevel | "neutral";

/**
 * The home bars are two-tone while the day is still open: neutral under 100%, blue once reached.
 * A finished day (before today) uses the four levels.
 */
export function homeBarTone(pct: number, finished: boolean): HomeBarTone {
  if (finished) return getLevel(pct);
  return pct >= 100 ? "dat" : "neutral";
}

/** The fill colour of a home bar; neutral is the secondary text colour (muted-on-dark on ink). */
export function homeBarColor(tone: HomeBarTone, surface: SegmentTone = "light"): string {
  if (tone === "neutral") return surface === "dark" ? "var(--color-muted-on-dark)" : "var(--color-secondary)";
  return getLevelColor(tone, surface);
}
