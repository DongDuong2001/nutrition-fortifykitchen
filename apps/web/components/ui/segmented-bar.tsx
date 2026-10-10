import React from "react";
import {
  calculateSegments,
  getLevel,
  getLevelColor,
  getEmptySegmentColor,
  type SegmentTone,
} from "@/lib/levels";

export interface SegmentedBarProps {
  "aria-label": string;
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
 * Automatic level colouring across 4 tiers (thiếu, trung bình, gần đủ, đạt).
 */
export function SegmentedBar({
  "aria-label": ariaLabel,
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
  const clampedValueNow = Math.min(100, Math.max(0, Math.round(pct)));

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={clampedValueNow}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${totalSegments}, minmax(0, 1fr))`,
        gap: `${gap}px`,
        alignItems: "center",
      }}
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
