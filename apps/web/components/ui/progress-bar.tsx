import React from "react";

export interface ProgressBarProps {
  value: number; // Percentage
  max?: number;
  label?: string;
  consumedLabel?: string;
  color?: "blue" | "green" | "yellow" | "red" | "emerald" | "amber" | "rose";
  className?: string;
}

export function ProgressBar({
  value,
  label,
  consumedLabel,
  color = "blue",
  className = "",
}: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  const colorStyles = {
    blue: "bg-blue",
    green: "bg-level-green",
    emerald: "bg-level-green",
    yellow: "bg-level-yellow",
    amber: "bg-level-yellow",
    red: "bg-level-red",
    rose: "bg-level-red",
  }[color];

  return (
    <div className={`w-full ${className}`}>
      {(label || consumedLabel) && (
        <div className="flex justify-between items-center text-xs mb-1 font-semibold text-secondary">
          {label && <span>{label}</span>}
          {consumedLabel && <span className="tabular-nums">{consumedLabel}</span>}
        </div>
      )}
      <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={Math.round(clampedValue)}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`h-full transition-all duration-300 rounded-full ${colorStyles}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
