"use client";

import React from "react";
import { getTrainingDurations } from "@/lib/training";
import { ChipGroup, type ChipGroupItem } from "@/components/ui/chip-group";

export interface DurationSelectorProps {
  value: string;
  onChange: (id: string, minutes: number) => void;
  variant?: "mobile" | "desktop";
  className?: string;
}

export function DurationSelector({
  value,
  onChange,
  variant = "mobile",
  className = "",
}: DurationSelectorProps) {
  const durations = getTrainingDurations();

  const items: ChipGroupItem[] = durations.map((d) => ({
    id: d.id,
    label: d.label,
    active: value === d.id,
    onClick: () => onChange(d.id, d.minutes),
  }));

  if (variant === "desktop") {
    return (
      <div className={`w-[460px] max-w-full ${className}`}>
        <ChipGroup
          items={items}
          columns={5}
          columnsLg={5}
          tone="light"
          size="md"
        />
      </div>
    );
  }

  // Mobile layout: 3 columns phone, 5 columns desktop per prompt requirement
  return (
    <div className={`w-full ${className}`}>
      <ChipGroup
        items={items}
        columns={3}
        columnsLg={5}
        tone="dark"
        size="md"
      />
    </div>
  );
}
