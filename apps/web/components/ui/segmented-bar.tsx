"use client";

import React, { useEffect, useState } from "react";
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
 * H1T MICRO 10-segment nutrient bar (Cobalt Sign motif).
 * Slanted segments (skewX(-14deg), radius 1px, gap 3px).
 * Automatic level colouring across 4 tiers (thiếu, trung bình, gần đủ, đạt).
 * Bars fill left to right with a 20ms stagger on load (disabled under prefers-reduced-motion).
 */
export function SegmentedBar({
  "aria-label": ariaLabel,
  percentage,
  filledSegments,
  totalSegments = 10,
  tone = "light",
  className = "",
  gap = 3,
}: SegmentedBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      {Array.from({ length: totalSegments }).map((_, idx) => {
        const isFilled = idx < n;
        const bg = mounted ? (isFilled ? filledColor : emptyColor) : emptyColor;

        return (
          <div
            key={idx}
            className="h-[6px] transition-colors duration-200 motion-reduce:transition-none"
            style={{
              backgroundColor: bg,
              transform: "skewX(-14deg)",
              borderRadius: "1px",
              transitionDelay: mounted && isFilled ? `${idx * 20}ms` : "0ms",
            }}
          />
        );
      })}
    </div>
  );
}
