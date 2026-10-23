"use client";

import React from "react";
import { DayBars } from "@/components/overview/parts/day-bars";
import { Expand } from "@/components/ui/expand";
import { dayFill } from "@/components/overview/parts/day-fill";
import type { ScoreRowData } from "@/lib/overview-detail";

function Chevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="m-chevron shrink-0 text-secondary"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * One scoreboard row: title, the change in words, the Saira value with its target, seven day dots and the
 * caption. The whole row is a button (`aria-expanded`); open, it draws its seven day bars. Rows live inside a
 * <ul> card (see Scoreboard), so a ScoreRow renders the <li>.
 */
export function ScoreRow({
  row,
  first,
  open,
  selected,
  onToggle,
  onSelect,
  alignGroup,
  levels = false,
}: {
  row: ScoreRowData;
  first: boolean;
  open: boolean;
  selected: number;
  onToggle: () => void;
  onSelect: (i: number) => void;
  alignGroup?: string;
  /** Day squares and bars in the four level colours (Năng lượng) instead of met / not met (Tóm tắt) */
  levels?: boolean;
}) {
  const panelId = `ov-score-${row.key}`;
  return (
    <li data-align-group={alignGroup} className={first ? "" : "border-t border-divider"}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={onToggle}
        className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-0 bg-transparent p-4 text-left font-sans text-text active:bg-surface motion-reduce:active:bg-transparent"
      >
        <span className="text-callout font-bold">{row.title}</span>
        <span className="text-right text-cap font-semibold text-secondary">{row.change}</span>
        {/* The number and the days share one row that wraps: with large text the days go under the number instead of over it */}
        <span className="col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-1">
            <span className={`font-display font-extrabold leading-none tabular-nums tracking-display ${levels ? "text-[2.5rem]" : "text-[2.75rem]"}`}>{row.value}</span>
            {/* The period's average of a day (overnight 22→23/10) */}
            {row.valueNote && row.value !== "—" && <span className="text-cap font-semibold text-secondary">{row.valueNote}</span>}
          </span>
          <span className="block text-cap text-secondary">{row.sub}</span>
        </span>
        <span className={`ml-auto flex flex-col items-end justify-center ${levels ? "gap-2" : "gap-1"}`}>
          {row.target && (
            <span aria-hidden="true" className="flex gap-1">
              {row.days.map((d) => (
                <span
                  key={d.iso}
                  className={`box-border h-3 w-3 rounded-[3px] ${d.inProgress ? "border border-secondary" : dayFill(d, row, levels)}`}
                />
              ))}
            </span>
          )}
          <span className="flex items-center gap-2 text-cap font-bold">
            {row.caption}
            <Chevron />
          </span>
        </span>
        </span>
      </button>
      <Expand open={open} id={panelId}>
        <DayBars row={row} selected={selected} onSelect={onSelect} levels={levels} />
      </Expand>
    </li>
  );
}
