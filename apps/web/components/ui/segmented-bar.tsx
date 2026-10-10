import React from "react";
import {
  calculateSegments,
  getLevel,
  getLevelColor,
  getEmptySegmentColor,
  type SegmentTone,
} from "@/lib/levels";

export interface SegmentedBarProps {
  percentage?: number;
  filledSegments?: number;
  totalSegments?: number;
  tone?: SegmentTone;
  color?: string; // Optional override
  className?: string;
  gap?: number;
}

/**
 * H1T MICRO 10-segment nutrient bar.
 * Automatic level colouring:
 *  - <50%: red (#D93036 on light / #FF6B6B on dark)
 *  - 50–79%: yellow (#D99A00 on light / #F5C518 on dark)
 *  - 80–99%: green (#16A34A on light / #4ADE80 on dark)
 *  - >=100%: blue (#1E55F0 on light / #5C86F2 on dark)
 */
export function SegmentedBar({
  percentage,
  filledSegments,
  totalSegments = 10,
  tone = "light",
  className = "",
  gap = 2,
}: SegmentedBarProps) {
  const pct =
    percentage !== undefined
      ? percentage
      : filledSegments !== undefined
      ? (filledSegments / totalSegments) * 100
      : 0;

  const n = calculateSegments(pct);
  const lvl = getLevel(pct);
  const filledColor = getLevelColor(lvl, tone);
  const emptyColor = getEmptySegmentColor(tone);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`grid grid-cols-10 items-center w-full ${className}`}
      style={{ gap: `${gap}px` }}
    >
      {Array.from({ length: 10 }).map((_, idx) => (
        <div
          key={idx}
          className="h-[6px] rounded-[2px] transition-colors duration-150"
          style={{ backgroundColor: idx < n ? filledColor : emptyColor }}
        />
      ))}
    </div>
  );
}
