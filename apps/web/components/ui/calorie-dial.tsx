import React from "react";

interface CalorieDialProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}

export function CalorieDial({
  current,
  target,
  size = 110,
  strokeWidth = 9,
}: CalorieDialProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(Math.max(current / target, 0), 1) : 0;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        aria-hidden="true"
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1F2937"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Active Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2563EB"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black italic tracking-tighter text-white font-mono leading-none">
          {current.toLocaleString("vi-VN")}
        </span>
        <span className="text-[11px] font-bold text-neutral-400 mt-1">
          kcal
        </span>
      </div>
    </div>
  );
}
