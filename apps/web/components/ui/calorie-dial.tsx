"use client";

import React, { useEffect, useState } from "react";
import { formatNumber } from "@/lib/format";

interface CalorieDialProps {
  current: number;
  target: number;
  targetMax?: number;
  size?: number;
  strokeWidth?: number;
  ariaLabel?: string;
  className?: string;
}

/**
 * H1T MICRO Calorie Ring Dial (Cobalt Sign).
 * On load, ring fills in 600ms ease-out (disabled under prefers-reduced-motion).
 */
export function CalorieDial({
  current,
  target,
  targetMax,
  size = 100,
  strokeWidth = 10,
  ariaLabel,
  className = "",
}: CalorieDialProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const radius = 52;
  const circumference = 2 * Math.PI * radius; // 326.72
  const progress = target > 0 ? Math.min(Math.max(current / target, 0), 1) : 0;
  const targetOffset = circumference * (1 - progress);
  const strokeDashoffset = mounted ? targetOffset : circumference;

  const defaultLabel = targetMax
    ? `Năng lượng ${formatNumber(current)} trên mục tiêu ${formatNumber(target)} đến ${formatNumber(targetMax)} kcal`
    : `Năng lượng ${formatNumber(current)} trên mục tiêu ${formatNumber(target)} kcal`;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        role="img"
        aria-label={ariaLabel || defaultLabel}
      >
        {/* Background Track: track-on-dark, 3.14:1 on ink (WCAG 1.4.11 needs 3:1) */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-track-on-dark"
        />
        {/* Active Progress */}
        {progress > 0 && (
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference.toFixed(1)}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
            className="text-blue transition-[stroke-dashoffset] duration-[600ms] ease-out motion-reduce:transition-none"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span className="font-display italic font-black text-2xl text-white leading-tight tracking-tight tabular-nums">
          {formatNumber(current)}
        </span>
        <span className="text-[13px] text-muted-on-dark leading-none">
          kcal
        </span>
      </div>
    </div>
  );
}
