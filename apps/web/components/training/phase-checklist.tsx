"use client";

import React from "react";
import { type TrainingCheckItem, type TrainingPhase } from "@/lib/training";
import { IconButton } from "@/components/ui/icon-button";
import { GoalCheck, GoalLabel } from "@/components/ui/goal-label";
import { SectionHeader } from "@/components/ui/section-title";
import type { DayDone } from "@/hooks/use-training-moment";

// V3 Training: the salt rows and the fast-carb row carry their macro's colour (a dot before the name, the dose in text colour)
function macroTone(id: string): { dot: string; text: string } | null {
  if (id.startsWith("intra-salt")) return { dot: "bg-macro-muoi-text", text: "text-macro-muoi-text" };
  if (id === "intra-carb") return { dot: "bg-macro-tinhbot-text", text: "text-macro-tinhbot-text" };
  return null;
}

export interface PhaseChecklistProps {
  phases: TrainingPhase[];
  /** Ids ticked on this day */
  ticked: string[];
  onToggle: (item: TrainingCheckItem) => void;
  /** cc-52: "+ Thêm món" at the bottom of a phase, and the remove button of the user's own items */
  onAddItem?: (phase: TrainingPhase) => void;
  onRemoveItem?: (item: TrainingCheckItem) => void;
  /** The item tapped while the catalogue is still loading: its row says so until the sheet opens */
  busyId?: string | null;
  /** A past day: the ticks show as saved and cannot change */
  readOnly?: boolean;
  variant?: "mobile" | "desktop";
  className?: string;
  /** feat/sound-goals: Ngày tập done, on the phase whose tick completed the day */
  dayDone?: DayDone | null;
  onPopEnd?: () => void;
}

export function PhaseChecklist({
  phases,
  ticked,
  onToggle,
  onAddItem,
  onRemoveItem,
  busyId = null,
  readOnly = false,
  variant = "mobile",
  className = "",
  dayDone = null,
  onPopEnd,
}: PhaseChecklistProps) {
  if (phases.length === 0) return null;

  const isDesktop = variant === "desktop";
  const rowClass = `flex items-center border-t border-divider first:border-t-0 ${isDesktop ? "min-h-14 -mx-2 px-2 rounded-lg hover:bg-hover" : "min-h-12"}`;

  const renderItem = (it: TrainingCheckItem) => {
    const isChecked = ticked.includes(it.id);
    const removable = it.own && !readOnly && onRemoveItem;
    const busy = busyId === it.id;
    const tone = macroTone(it.id);
    return (
      <div key={it.id} className={rowClass} aria-busy={busy || undefined}>
        <label
          className={`flex flex-1 min-w-0 items-center self-stretch transition-transform ${
            readOnly ? "cursor-default" : "cursor-pointer m-tint transition-press"
          } ${isDesktop ? "gap-4" : "gap-3"}`}
        >
          <span className="w-11 h-11 -ml-2.5 flex items-center justify-center shrink-0">
            <input
              type="checkbox"
              checked={isChecked}
              disabled={readOnly}
              onChange={() => onToggle(it)}
              aria-label={it.label}
              className={`w-[22px] h-[22px] rounded accent-cobalt shrink-0 ${readOnly ? "" : "cursor-pointer"}`}
            />
          </span>
          <span className="flex-1 flex flex-col py-1 min-w-0">
            <span title={it.own ? it.label : undefined} className="text-callout font-semibold text-text leading-snug line-clamp-2 break-words">
              {tone && <span aria-hidden="true" className={`mr-2 inline-block h-2 w-2 rounded-full align-[1px] ${tone.dot}`} />}
              {it.label}
            </span>
            {busy ? (
              <span role="status" className="text-cap text-secondary leading-normal">Đang tải danh mục…</span>
            ) : it.note ? (
              <span className="text-cap text-secondary leading-normal">{it.note}</span>
            ) : null}
          </span>
          {busy && (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-cobalt animate-spin motion-reduce:animate-none">
              <path d="M12 3a9 9 0 1 0 9 9" />
            </svg>
          )}
          <span className={`font-bold text-callout tabular-nums shrink-0 ${tone ? tone.text : "text-text"}`}>{it.dose}</span>
        </label>
        {removable && (
          <IconButton
            onClick={() => onRemoveItem(it)}
            label={`Bỏ ${it.label} khỏi danh sách`}
            className="-mr-2.5 ml-1 text-secondary hover:bg-hover"
          >
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </IconButton>
        )}
      </div>
    );
  };

  const cardClass = isDesktop
    ? "bg-card rounded-card border border-transparent shadow-ring lg:shadow-card px-5 pt-2 pb-3 flex flex-col"
    : "bg-card rounded-card border border-transparent shadow-ring lg:shadow-card px-4 pt-3 pb-1 flex flex-col";

  return (
    <div
      data-align-group={isDesktop ? "training-content" : undefined}
      data-align-edge={isDesktop ? "left" : undefined}
      data-tour="training-checklist"
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
              <SectionHeader>
                {dayDone?.phaseId === ph.id ? (
                  dayDone.text ? (
                    <GoalLabel key={dayDone.key}>
                      <GoalCheck size={16} />
                      {dayDone.text}
                    </GoalLabel>
                  ) : (
                    <GoalLabel key={dayDone.key} plain>
                      {ph.name}
                    </GoalLabel>
                  )
                ) : (
                  ph.name
                )}
              </SectionHeader>
              <span
                onAnimationEnd={dayDone?.phaseId === ph.id && dayDone.pop ? onPopEnd : undefined}
                className={`font-semibold text-secondary tabular-nums ${isDesktop ? "text-sm" : "text-cap"} ${dayDone?.phaseId === ph.id && dayDone.pop ? "m-goal-pop" : ""}`}
              >
                {completedCount} / {totalCount}
              </span>
            </div>
            <div className="flex flex-col">
              {ph.items.map(renderItem)}
              {!readOnly && onAddItem && (
                <div className={rowClass}>
                  <button
                    type="button"
                    onClick={() => onAddItem(ph)}
                    data-tour={idx === 0 ? "training-add-item" : undefined}
                    className="-ml-1 flex min-h-11 cursor-pointer items-center rounded-full border-0 bg-transparent px-1 text-sm font-semibold text-cobalt active:scale-[0.97] transition-press motion-reduce:active:scale-100"
                  >
                    + Thêm món
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
