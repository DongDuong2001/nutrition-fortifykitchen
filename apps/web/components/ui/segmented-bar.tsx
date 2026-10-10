import React from "react";

interface SegmentedBarProps {
  totalSegments?: number;
  filledSegments?: number;
  percentage?: number;
  color?: "gold" | "blue" | "coral" | "emerald";
  className?: string;
}

export function SegmentedBar({
  totalSegments = 8,
  filledSegments,
  percentage,
  color = "gold",
  className = "",
}: SegmentedBarProps) {
  // Calculate filled segments from percentage if filledSegments not directly given
  const calculatedFilled =
    filledSegments !== undefined
      ? Math.min(Math.max(filledSegments, 0), totalSegments)
      : percentage !== undefined
      ? Math.min(Math.round((percentage / 100) * totalSegments), totalSegments)
      : 0;

  const colorClasses = {
    gold: "bg-[#EAB308]",
    blue: "bg-[#2563EB]",
    coral: "bg-[#EF4444]",
    emerald: "bg-[#10B981]",
  }[color];

  return (
    <div className={`flex items-center gap-1.5 w-full ${className}`}>
      {Array.from({ length: totalSegments }).map((_, idx) => {
        const isFilled = idx < calculatedFilled;
        return (
          <div
            key={idx}
            className={`h-2.5 flex-1 rounded-sm transition-all duration-200 ${
              isFilled ? colorClasses : "bg-neutral-800/80"
            }`}
          />
        );
      })}
    </div>
  );
}
