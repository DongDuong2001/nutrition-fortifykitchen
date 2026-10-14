"use client";

import React from "react";
import { type TrainingCheckItem, type TrainingPhase } from "@/lib/training";

export interface PhaseChecklistProps {
  phases: TrainingPhase[];
  /** Ids ticked on this day */
  ticked: string[];
  onToggle: (itemId: string) => void;
  /** A past day: the ticks show as saved and cannot change */
  readOnly?: boolean;
  variant?: "mobile" | "desktop";
  className?: string;
}

export function PhaseChecklist({
  phases,
  ticked,
  onToggle,
  readOnly = false,
  variant = "mobile",
  className = "",
}: PhaseChecklistProps) {
  if (phases.length === 0) return null;

  const isDesktop = variant === "desktop";

  const renderItem = (it: TrainingCheckItem) => {
    const isChecked = ticked.includes(it.id);
    return (
      <label
        key={it.id}
        className={`flex items-center border-t border-divider first:border-t-0 transition-transform ${
          readOnly ? "cursor-default" : "cursor-pointer active:scale-[0.99]"
        } ${isDesktop ? "gap-4 min-h-[56px] -mx-2 px-2 rounded-lg hover:bg-hover" : "gap-3 min-h-[48px]"}`}
      >
        <span className="w-11 h-11 -ml-2.5 flex items-center justify-center shrink-0">
          <input
            type="checkbox"
            checked={isChecked}
            disabled={readOnly}
            onChange={() => onToggle(it.id)}
            aria-label={it.label}
            className={`w-[22px] h-[22px] rounded accent-blue shrink-0 ${readOnly ? "" : "cursor-pointer"}`}
          />
        </span>
        <span className="flex-1 flex flex-col py-1 min-w-0">
          <span className={`${isDesktop ? "text-[15px]" : "text-sm"} font-semibold text-text leading-snug`}>
            {it.label}
          </span>
          {it.note ? <span className="text-[13px] text-secondary leading-normal">{it.note}</span> : null}
        </span>
        <span className="font-bold text-[15px] tabular-nums text-text shrink-0">{it.dose}</span>
      </label>
    );
  };

  const cardClass = isDesktop
    ? "bg-card border border-card-border rounded-[18px] px-5 pt-2 pb-3 flex flex-col"
    : "bg-card border border-card-border rounded-[18px] px-4 pt-3 pb-1 flex flex-col";

  return (
    <div
      data-align-group={isDesktop ? "training-content" : undefined}
      data-align-edge={isDesktop ? "left" : undefined}
      className={`${isDesktop ? cardClass : "flex flex-col gap-2 w-full"} ${className}`}
    >
      {phases.map((ph, idx) => {
        const completedCount = ph.items.filter((it) => ticked.includes(it.id)).length;
        const totalCount = ph.items.length;
        const sectionClass = isDesktop
          ? idx > 0
            ? "pt-4 border-t border-divider mt-2"
            : "pt-2"
          : cardClass;

        return (
          <div key={ph.id} data-align-group={isDesktop ? undefined : "training-content"} className={sectionClass}>
            <div className="flex justify-between items-baseline pb-1">
              <h2 className={`m-0 font-bold text-text ${isDesktop ? "text-lg" : "text-base"}`}>{ph.name}</h2>
              <span className={`font-semibold text-secondary tabular-nums ${isDesktop ? "text-sm" : "text-[13px]"}`}>
                {completedCount} / {totalCount}
              </span>
            </div>
            <div className="flex flex-col">{ph.items.map(renderItem)}</div>
          </div>
        );
      })}
    </div>
  );
}
