"use client";

import React from "react";
import { getTrainingDurations, type TrainingDurationOption } from "@/lib/training";

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

  if (variant === "desktop") {
    return (
      <div
        role="group"
        aria-label="Thời gian tập"
        className={`flex flex-wrap gap-1 bg-divider/60 p-1 rounded-xl ${className}`}
      >
        {durations.map((d) => {
          const isSelected = value === d.id;
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(d.id, d.minutes)}
              className={`min-h-[44px] px-4.5 rounded-[9px] border-0 text-sm font-bold cursor-pointer transition-all active:scale-[0.97] ${
                isSelected
                  ? "bg-blue text-white shadow-xs"
                  : "bg-transparent text-text hover:bg-black/5"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Mobile layout: 3 columns grid per Training.dc.html
  return (
    <div
      role="group"
      aria-label="Thời gian tập"
      className={`grid grid-cols-3 gap-1.5 w-full ${className}`}
    >
      {durations.map((d) => {
        const isSelected = value === d.id;
        return (
          <button
            key={d.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(d.id, d.minutes)}
            className={`min-h-[44px] px-2 rounded-lg border-0 text-sm font-bold cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center ${
              isSelected
                ? "bg-blue text-white shadow-xs"
                : "bg-surface-dark text-grabber hover:text-white"
            }`}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}
