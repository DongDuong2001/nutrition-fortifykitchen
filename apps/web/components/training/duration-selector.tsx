"use client";

import React from "react";
import { CUSTOM_DURATION_ID, getTrainingDurations } from "@/lib/training";

export interface DurationSelectorProps {
  value: string;
  onChange: (id: string, minutes: number) => void;
  variant?: "mobile" | "desktop";
  /** Read-only (a past day): no segment can be pressed */
  disabled?: boolean;
  className?: string;
  /** Tùy chỉnh: opens the minutes picker. Without it there is no Tùy chỉnh chip. */
  onCustom?: () => void;
}

/**
 * The V3 segmented control (the same track and pill as components/ui/segmented: a #E3E3E8 track, 4 px padding, 12 px
 * corners, the selected pill white with a hairline ring), five equal columns on the phone and on desktop (six with Tùy chỉnh). Built here
 * because a past day shows it read-only (`disabled`), which Segmented has no state for; the labels are 12 px with no
 * side padding so "120 phút" and "Tùy chỉnh" stay on one line in a 58 px column (six columns) at 390 px; at a large text size a label wraps instead of pushing the page sideways.
 */
export function DurationSelector({
  value,
  onChange,
  variant = "mobile",
  disabled = false,
  className = "",
  onCustom,
}: DurationSelectorProps) {
  const items = getTrainingDurations();
  // feat/training-custom-minutes: any minutes that are not a preset chip show on the Tùy chỉnh chip ("150 phút"), which stays picked
  const customOn = value !== "" && value !== "rest" && !items.some((d) => d.id === value);
  const chips = [
    ...items.map((d) => ({ id: d.id, label: d.label, on: value === d.id, onClick: () => onChange(d.id, d.minutes), custom: false, ariaLabel: undefined as string | undefined })),
    ...(onCustom
      ? [
          {
            id: CUSTOM_DURATION_ID,
            label: customOn ? `${value} phút` : "Tùy chỉnh",
            on: customOn,
            onClick: onCustom,
            custom: true,
            ariaLabel: customOn ? `Tùy chỉnh, ${value} phút` : "Tùy chỉnh thời gian tập",
          },
        ]
      : []),
  ];

  return (
    <div
      role="group"
      aria-label="Thời gian tập"
      data-tour="training-minutes"
      className={`grid ${onCustom ? "grid-cols-6" : "grid-cols-5"} rounded-xl bg-seg-track p-1 ${variant === "desktop" ? "w-[460px] max-w-full" : "w-full"} ${className}`}
    >
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={c.on}
          aria-haspopup={c.custom ? "dialog" : undefined}
          aria-label={c.ariaLabel}
          disabled={disabled}
          onClick={c.onClick}
          className="-my-1 flex min-h-11 min-w-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-press active:scale-[0.97] disabled:cursor-default disabled:active:scale-100 motion-reduce:active:scale-100"
        >
          <span
            className={`flex min-h-9 w-full items-center justify-center rounded-[9px] py-1 text-center text-xs leading-tight transition-press ${
              c.on ? "bg-raised font-bold text-text shadow-[0_0_0_1px_var(--color-card-border)]" : "font-semibold text-secondary"
            }`}
          >
            {c.label}
          </span>
        </button>
      ))}
    </div>
  );
}
