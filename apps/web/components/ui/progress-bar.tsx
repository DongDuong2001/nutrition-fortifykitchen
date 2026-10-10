import React from "react";

interface ProgressBarProps {
  value: number; // Percentage
  max?: number;
  label?: string;
  consumedLabel?: string;
  color?: "emerald" | "amber" | "blue" | "rose";
}

export function ProgressBar({
  value,
  label,
  consumedLabel,
  color = "emerald",
}: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  const colorStyles = {
    emerald: "bg-[#10B981]",
    amber: "bg-[#F59E0B]",
    blue: "bg-[#3B82F6]",
    rose: "bg-[#F43F5E]",
  }[color];

  return (
    <div className="w-full">
      {(label || consumedLabel) && (
        <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
          {label && <span className="uppercase tracking-wider text-[#F8FAFC]">{label}</span>}
          {consumedLabel && <span className="text-[#94A3B8] font-mono text-[11px]">{consumedLabel}</span>}
        </div>
      )}
      <div className="w-full h-3.5 bg-[#0B0F17] border-2 border-black rounded-[4px] shadow-[2px_2px_0px_0px_#000] overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${colorStyles} ${
            clampedValue > 0 ? "border-r-2 border-black" : ""
          }`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
