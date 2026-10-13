"use client";

import React, { useState } from "react";
import { dayNote, weightDayNote, type BoardDay } from "@/lib/overview-board";
import type { WeightPoint } from "@/lib/period";
import { formatNumber } from "@/lib/format";

/** One scoreboard row: Kcal, Đạm or Cân nặng. Everything is already formatted; the row only draws it. */
export interface ScoreRowData {
  key: "calories" | "protein" | "weight";
  title: string;
  /** The period average (or the latest weight), formatted; "—" when unknown */
  value: string;
  /** "kcal / 1.950–2.275" */
  sub: string;
  /** The change in words */
  change: string;
  /** Seven days; value null = nothing logged */
  days: BoardDay[];
  unit: string;
  /** Target minimum and maximum for the band and the day note; null for weight */
  target: { min: number; max: number | null } | null;
  /** Dots and "n/7 ngày đạt" (targets only) */
  caption: string;
  /** Weight only: the log, for the change against the day before */
  weightLog?: WeightPoint[];
  decimals: number;
}

const CHART_HEIGHT = "h-[84px]";

function barMetrics(row: ScoreRowData): { toPct: (v: number) => number; bandLo: number; bandHi: number } | null {
  const values = row.days.map((d) => d.value).filter((v): v is number => v !== null);
  if (row.target) {
    const top = Math.max(...values, row.target.max ?? row.target.min, 1) * 1.1;
    const toPct = (v: number) => Math.max(4, Math.min(100, (v / top) * 100));
    return { toPct, bandLo: (row.target.min / top) * 100, bandHi: ((row.target.max ?? row.target.min) / top) * 100 };
  }
  if (values.length === 0) return null;
  // Weight: the bars are drawn from just under the lightest weigh-in so a 0,1 kg step is visible
  const lo = Math.min(...values) - 0.4;
  const hi = Math.max(...values) + 0.2;
  return { toPct: (v) => Math.max(8, ((v - lo) / (hi - lo)) * 100), bandLo: 0, bandHi: 0 };
}

function Chevron({ open }: { open: boolean }) {
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
      className={`shrink-0 text-secondary transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function DayChart({
  row,
  selected,
  onSelect,
}: {
  row: ScoreRowData;
  selected: number;
  onSelect: (i: number) => void;
}) {
  const metrics = barMetrics(row);
  const day = row.days[selected];
  const hasBand = row.target !== null && metrics !== null && row.target.max !== null && row.target.max > row.target.min;

  let note = "";
  let noteClass = "text-secondary";
  if (day.value === null) {
    note = row.key === "weight" ? "chưa cân" : "chưa ghi";
  } else if (row.target && day.inProgress) {
    note = "đang ghi";
  } else if (row.target) {
    const n = dayNote(day.value, row.target.min, row.unit);
    note = n.text;
    noteClass = n.tone === "met" ? "text-blue" : "text-destructive-text";
  } else if (row.weightLog) {
    note = weightDayNote(row.weightLog, day.iso);
  }
  const shown = day.value === null ? "—" : `${formatNumber(day.value, { decimals: row.decimals })} ${row.unit}`;

  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      <div className="relative">
        <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 ${CHART_HEIGHT} border-b border-card-border`}>
          {hasBand && metrics && (
            <div
              className="absolute inset-x-0 border-y border-dashed border-blue bg-sky/30"
              style={{ bottom: `${metrics.bandLo}%`, height: `${Math.max(0, Math.min(100, metrics.bandHi) - metrics.bandLo)}%` }}
            />
          )}
        </div>
        <div className="relative flex">
          {row.days.map((d, i) => {
            const isSel = i === selected;
            let color = "bg-ink";
            if (row.target) color = d.inProgress ? "bg-muted-dark" : d.met ? "bg-blue" : "bg-destructive";
            const aria =
              d.value === null
                ? `${d.dateLabel}: ${row.key === "weight" ? "chưa cân" : "chưa ghi"}`
                : `${d.dateLabel}: ${formatNumber(d.value, { decimals: row.decimals })} ${row.unit}`;
            return (
              <button
                key={d.iso}
                type="button"
                aria-label={aria}
                aria-pressed={isSel}
                onClick={() => onSelect(i)}
                className="flex min-h-[44px] min-w-0 flex-1 cursor-pointer flex-col items-stretch border-0 bg-transparent p-0"
              >
                <span className={`flex ${CHART_HEIGHT} items-end px-1`}>
                  {d.value !== null && metrics ? (
                    <span
                      className={`block w-full rounded-t-[4px] transition-opacity motion-reduce:transition-none ${color} ${isSel ? "opacity-100" : "opacity-45"}`}
                      style={{ height: `${metrics.toPct(d.value)}%` }}
                    />
                  ) : (
                    <span className="block h-1 w-full rounded-[1px] bg-level-empty" />
                  )}
                </span>
                <span className={`flex h-8 items-center justify-center text-xs ${isSel ? "font-extrabold text-text" : "font-semibold text-secondary"}`}>
                  {d.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p aria-live="polite" className="m-0 flex items-baseline justify-between gap-3 rounded-xl bg-page px-3 py-3">
        <span className="text-[13px] font-semibold text-secondary">{day.dateLabel}</span>
        <span className="text-right">
          <span className="font-display text-2xl font-bold tabular-nums">{shown}</span>
          {note && <span className={`ml-2 text-xs font-bold ${noteClass}`}>{note}</span>}
        </span>
      </p>
    </div>
  );
}

/**
 * The scoreboard of Tóm tắt: one white card, three rows (Kcal, Đạm, Cân nặng). Each row is a button that opens
 * its seven days as bars over the target band (one open at a time); a bar is a button that names its day.
 * Only the open row draws its chart.
 */
export function Scoreboard({ rows }: { rows: ScoreRowData[] }) {
  const [open, setOpen] = useState<ScoreRowData["key"] | null>("calories");
  // The selected day per row; the last day of the period until the user picks another
  const [picked, setPicked] = useState<Partial<Record<ScoreRowData["key"], number>>>({});

  return (
    <section
      aria-label="Bảng điểm"
      className="overflow-hidden rounded-[18px] border border-card-border bg-card text-text"
    >
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((row, ri) => {
          const isOpen = open === row.key;
          const sel = Math.min(picked[row.key] ?? row.days.length - 1, row.days.length - 1);
          const panelId = `ov-score-${row.key}`;
          return (
            <li key={row.key} data-align-group="overview-rows" className={ri > 0 ? "border-t border-divider" : ""}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : row.key)}
                className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-0 bg-transparent p-4 text-left font-sans text-text active:bg-page motion-reduce:active:bg-transparent"
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
                        <span key={d.iso} className={`h-3 w-3 rounded-[3px] ${d.met ? "bg-blue" : d.inProgress ? "border border-card-border" : "bg-card-border"}`} />
                      ))}
                    </span>
                  )}
                  <span className="flex items-center gap-2 text-[13px] font-bold">
                    {row.caption}
                    <Chevron open={isOpen} />
                  </span>
                </span>
              </button>
              {isOpen && (
                <div id={panelId}>
                  <DayChart row={row} selected={sel} onSelect={(i) => setPicked((p) => ({ ...p, [row.key]: i }))} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
