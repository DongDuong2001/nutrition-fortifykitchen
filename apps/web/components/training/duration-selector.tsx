"use client";

import React from "react";
import { getTrainingDurations } from "@/lib/training";

export interface DurationSelectorProps {
  value: string;
  onChange: (id: string, minutes: number) => void;
  variant?: "mobile" | "desktop";
  /** Read-only (a past day): no segment can be pressed */
  disabled?: boolean;
  className?: string;
}

/**
 * The V3 segmented control (the same track and pill as components/ui/segmented: a #E3E3E8 track, 4 px padding, 12 px
 * corners, the selected pill white with a hairline ring), five equal columns on the phone and on desktop. Built here
 * because a past day shows it read-only (`disabled`), which Segmented has no state for; the labels are 12 px with no
 * side padding so "120 phút" stays on one line in a 70 px column at 390 px; at a large text size a label wraps instead of pushing the page sideways.
 */
export function DurationSelector({
  value,
  onChange,
  variant = "mobile",
  disabled = false,
  className = "",
}: DurationSelectorProps) {
  const items = getTrainingDurations();

  return (
    <div
      role="group"
      aria-label="Thời gian tập"
      data-tour="training-minutes"
      className={`grid grid-cols-5 rounded-xl bg-seg-track p-1 ${variant === "desktop" ? "w-[460px] max-w-full" : "w-full"} ${className}`}
    >
      {items.map((d) => {
        const on = value === d.id;
        return (
          <button
            key={d.id}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(d.id, d.minutes)}
            className="-my-1 flex min-h-11 min-w-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-press active:scale-[0.97] disabled:cursor-default disabled:active:scale-100 motion-reduce:active:scale-100"
          >
            <span
              className={`flex min-h-9 w-full items-center justify-center rounded-[9px] px-0.5 py-1 text-center text-xs leading-tight transition-press ${
                on ? "bg-raised font-bold text-text shadow-[0_0_0_1px_var(--color-card-border)]" : "font-semibold text-secondary"
              }`}
            >
              {d.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
