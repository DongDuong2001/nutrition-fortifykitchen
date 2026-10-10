import React from "react";

interface CalorieDialProps {
  current: number;
  target: number;
  targetMax?: number;
  size?: number;
  strokeWidth?: number;
  ariaLabel?: string;
  className?: string;
}

export function CalorieDial({
  current,
  target,
  targetMax,
  size = 100,
  strokeWidth = 10,
  ariaLabel,
  className = "",
}: CalorieDialProps) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius; // 326.72
  const progress = target > 0 ? Math.min(Math.max(current / target, 0), 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const defaultLabel = targetMax
    ? `Năng lượng ${current.toLocaleString("vi-VN")} trên mục tiêu ${target.toLocaleString("vi-VN")} đến ${targetMax.toLocaleString("vi-VN")} kcal`
    : `Năng lượng ${current.toLocaleString("vi-VN")} trên mục tiêu ${target.toLocaleString("vi-VN")} kcal`;

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
        {/* Background Track */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-level-empty-dark"
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
            strokeDasharray={`${(circumference * progress).toFixed(1)} ${circumference.toFixed(1)}`}
            transform="rotate(-90 60 60)"
            className="text-blue"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span className="font-saira italic font-extrabold text-2xl text-white leading-tight tracking-tight">
          {current.toLocaleString("vi-VN")}
        </span>
        <span className="text-[13px] text-muted-dark leading-none">
          kcal
        </span>
      </div>
    </div>
  );
}
