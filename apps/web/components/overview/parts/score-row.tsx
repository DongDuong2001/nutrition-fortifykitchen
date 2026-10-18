"use client";

import React from "react";
import { DayBars } from "@/components/overview/parts/day-bars";
import { Expand } from "@/components/ui/expand";
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
}: {
  row: ScoreRowData;
  first: boolean;
  open: boolean;
  selected: number;
  onToggle: () => void;
  onSelect: (i: number) => void;
  alignGroup?: string;
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
        <span className="text-[15px] font-bold">{row.title}</span>
        <span className="text-right text-[13px] font-semibold text-secondary">{row.change}</span>
        <span className="min-w-0">
          <span className="font-display text-[44px] font-bold leading-none tabular-nums">{row.value}</span>
          <span className="block text-[13px] text-secondary">{row.sub}</span>
        </span>
        <span className="flex flex-col items-end justify-center gap-1">
          {row.target && (
            <span aria-hidden="true" className="flex gap-1">
              {row.days.map((d) => (
                <span
                  key={d.iso}
                  className={`h-3 w-3 rounded-[3px] ${d.met ? "bg-blue" : d.inProgress ? "border border-card-border" : "bg-card-border"}`}
                />
              ))}
            </span>
          )}
          <span className="flex items-center gap-2 text-[13px] font-bold">
            {row.caption}
            <Chevron />
          </span>
        </span>
      </button>
      <Expand open={open} id={panelId}>
        <DayBars row={row} selected={selected} onSelect={onSelect} />
      </Expand>
    </li>
  );
}
