"use client";

import React from "react";
import { type TrainingPhase } from "@/lib/training";

export interface PhaseChecklistProps {
  phases: TrainingPhase[];
  checkedState: Record<string, boolean>;
  onToggle: (itemId: string) => void;
  variant?: "mobile" | "desktop";
  className?: string;
}

export function PhaseChecklist({
  phases,
  checkedState,
  onToggle,
  variant = "mobile",
  className = "",
}: PhaseChecklistProps) {
  if (phases.length === 0) return null;

  if (variant === "desktop") {
    return (
      <div
        data-align-group="training-content"
        data-align-edge="left"
        className={`bg-card border border-card-border rounded-[18px] px-5.5 pt-2 pb-3 flex flex-col ${className}`}
      >
        {phases.map((ph, idx) => {
          const completedCount = ph.items.filter(
            (it) => checkedState[it.id] ?? it.defaultDone
          ).length;
          const totalCount = ph.items.length;

          return (
            <div key={ph.id} className={idx > 0 ? "pt-4 border-t border-divider mt-2" : "pt-2"}>
              <div className="flex justify-between items-baseline pb-1">
                <h2 className="m-0 text-lg font-bold text-text">{ph.name}</h2>
                <span className="text-sm font-semibold text-secondary tabular-nums">
                  {completedCount} / {totalCount}
                </span>
              </div>

              <div className="flex flex-col">
                {ph.items.map((it) => {
                  const isChecked = checkedState[it.id] ?? it.defaultDone;
                  return (
                    <label
                      key={it.id}
                      className="flex items-center gap-3.5 min-h-[56px] cursor-pointer border-t border-divider first:border-t-0 hover:bg-black/[0.02] -mx-2 px-2 rounded-lg transition-colors active:scale-[0.99]"
                    >
                      <span className="w-11 h-11 -ml-2.5 flex items-center justify-center shrink-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggle(it.id)}
                          aria-label={it.label}
                          className="w-[22px] h-[22px] rounded accent-blue shrink-0 cursor-pointer"
                        />
                      </span>
                      <span className="flex-1 flex flex-col py-1.5 min-w-0">
                        <span className="text-[15px] font-semibold text-text leading-snug">
                          {it.label}
                        </span>
                        {it.note ? (
                          <span className="text-[13px] text-secondary leading-normal">
                            {it.note}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-bold text-[15px] tabular-nums text-text shrink-0">
                        {it.dose}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Mobile layout: each phase in its own rounded card
  return (
    <div className={`flex flex-col gap-2.5 w-full ${className}`}>
      {phases.map((ph) => {
        const completedCount = ph.items.filter(
          (it) => checkedState[it.id] ?? it.defaultDone
        ).length;
        const totalCount = ph.items.length;

        return (
          <div
            key={ph.id}
            className="bg-card border border-card-border rounded-[18px] px-4 pt-2.5 pb-1 flex flex-col"
          >
            <div className="flex justify-between items-baseline pb-1">
              <h2 className="m-0 text-base font-bold text-text">{ph.name}</h2>
              <span className="text-[13px] font-semibold text-secondary tabular-nums">
                {completedCount} / {totalCount}
              </span>
            </div>

            <div className="flex flex-col">
              {ph.items.map((it) => {
                const isChecked = checkedState[it.id] ?? it.defaultDone;
                return (
                  <label
                    key={it.id}
                    className="flex items-center gap-3 min-h-[48px] cursor-pointer border-t border-divider first:border-t-0 active:scale-[0.99] transition-transform"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggle(it.id)}
                      className="w-[22px] h-[22px] rounded accent-blue shrink-0 cursor-pointer"
                    />
                    <span className="flex-1 flex flex-col py-1 min-w-0">
                      <span className="text-sm font-semibold text-text leading-snug">
                        {it.label}
                      </span>
                      {it.note ? (
                        <span className="text-[13px] text-secondary leading-normal">
                          {it.note}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-bold text-[15px] tabular-nums text-text shrink-0">
                      {it.dose}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
