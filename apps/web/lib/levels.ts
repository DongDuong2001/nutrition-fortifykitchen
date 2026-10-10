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
        return "#FF6B6B";
      case "trungbinh":
        return "#F5C518";
      case "ganDu":
        return "#4ADE80";
      case "dat":
        return "#5C86F2";
    }
  }

  // Light tone default
  switch (lvl) {
    case "thieu":
      return "#D93036";
    case "trungbinh":
      return "#D99A00";
    case "ganDu":
      return "#16A34A";
    case "dat":
      return "#1E55F0";
  }
}

export function getEmptySegmentColor(tone: SegmentTone = "light"): string {
  return tone === "dark" ? "#2B2D33" : "#E3E5E9";
}
