"use client";

import React from "react";
import { getTrainingDurations } from "@/lib/training";
import { ChipGroup, type ChipGroupItem } from "@/components/ui/chip-group";

export interface DurationSelectorProps {
  value: string;
  onChange: (id: string, minutes: number) => void;
  variant?: "mobile" | "desktop";
  /** Read-only (a past day): no chip can be pressed */
  disabled?: boolean;
  className?: string;
}

/**
 * Equal columns. Desktop: five in one row. Phone: three columns (the design's grid), so each label fits on one
 * line at 390 px; five columns there would wrap "60 phút" and "120 phút" onto two lines.
 */
export function DurationSelector({
  value,
  onChange,
  variant = "mobile",
  disabled = false,
  className = "",
}: DurationSelectorProps) {
  const items: ChipGroupItem[] = getTrainingDurations().map((d) => ({
    id: d.id,
    label: d.label,
    active: value === d.id,
    disabled,
    onClick: () => onChange(d.id, d.minutes),
  }));

  return (
    <div role="group" aria-label="Thời gian tập" className={`${variant === "desktop" ? "w-[460px] max-w-full" : "w-full"} ${className}`}>
      <ChipGroup
        items={items}
        columns={variant === "desktop" ? 5 : 3}
        tone={variant === "desktop" ? "light" : "dark"}
        size="md"
      />
    </div>
  );
}
