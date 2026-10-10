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

export function getLevelColor(lvl: NutrientLevel, tone: SegmentTone = "light"): string {
  if (tone === "dark") {
    switch (lvl) {
      case "thieu":
        return "#E5484D";
      case "trungbinh":
        return "#E8A400";
      case "ganDu":
        return "#1FA971";
      case "dat":
        return "#5C86F2";
    }
  }

  // Light tone default
  switch (lvl) {
    case "thieu":
      return "#D93F44";
    case "trungbinh":
      return "#B07800";
    case "ganDu":
      return "#17945F";
    case "dat":
      return "#1238D6";
  }
}

export function getEmptySegmentColor(tone: SegmentTone = "light"): string {
  return tone === "dark" ? "#2A2C31" : "#E6E1D7";
}
