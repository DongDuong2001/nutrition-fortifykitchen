"use client";

import React from "react";
import { dayFill } from "@/components/overview/parts/day-fill";
import { formatNumber, formatRange } from "@/lib/format";
import { dayNote, weightDayNote } from "@/lib/overview-board";
import type { ScoreRowData } from "@/lib/overview-detail";

const CHART_HEIGHT = "h-[84px]";

function barMetrics(row: ScoreRowData): { toPct: (v: number) => number; bandLo: number; bandHi: number } | null {
  const values = row.days.map((d) => d.value).filter((v): v is number => v !== null);
  if (row.target) {
    const top = Math.max(...values, row.target.max ?? row.target.min, 1) * 1.1;
    const toPct = (v: number) => Math.max(4, Math.min(100, (v / top) * 100));
    return { toPct, bandLo: (row.target.min / top) * 100, bandHi: ((row.target.max ?? row.target.min) / top) * 100 };
  }
  if (values.length === 0) return null;
  // Weight: the bars start just under the lightest weigh-in so a 0,1 kg step is visible
  const lo = Math.min(...values) - 0.4;
  const hi = Math.max(...values) + 0.2;
  return { toPct: (v) => Math.max(8, ((v - lo) / (hi - lo)) * 100), bandLo: 0, bandHi: 0 };
}

/**
 * Seven day bars over the target band, and the line for the selected day. Each bar is a button that names its
 * day. Green = met, red = under (level colours in `levels`), grey = still being logged; a day with nothing logged is a thin tick.
 */
export function DayBars({
  row,
  selected,
  onSelect,
  levels = false,
}: {
  row: ScoreRowData;
  selected: number;
  onSelect: (i: number) => void;
  /** Bars in the four level colours, a "Mục tiêu" label on the line (Năng lượng) instead of met / not met (Tóm tắt) */
  levels?: boolean;
}) {
  const metrics = barMetrics(row);
  const day = row.days[selected];
  const hasBand = row.target !== null && metrics !== null && row.target.max !== null && row.target.max > row.target.min;
  const missing = row.key === "weight" ? "chưa cân" : "chưa ghi";

  let note = "";
  let noteClass = "text-secondary";
  if (day.value === null) {
    note = missing;
  } else if (row.target && day.inProgress) {
    note = "đang ghi";
  } else if (row.target) {
    const n = dayNote(day.value, row.target.min, row.unit);
    note = n.text;
    noteClass = n.tone === "met" ? "text-success" : "text-destructive-text";
  } else if (row.weightLog) {
    note = weightDayNote(row.weightLog, day.iso);
  }
  const shown = day.value === null ? "—" : `${formatNumber(day.value, { decimals: row.decimals })} ${row.unit}`;

  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      <div className="relative">
        <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 ${CHART_HEIGHT} border-b border-card-border`}>
          {hasBand && metrics && (
            <div className="absolute inset-x-0 bg-cobalt/10" style={{ bottom: `${metrics.bandLo}%`, height: `${Math.max(0, Math.min(100, metrics.bandHi) - metrics.bandLo)}%` }} />
          )}
          {row.target && metrics && (
            <div
              className={`absolute inset-x-0 border-t-[1.5px] border-dashed ${levels ? "border-cobalt" : "border-secondary opacity-70"}`}
              style={{ bottom: `${metrics.bandLo}%` }}
            />
          )}
          {levels && row.target && metrics && (
            <span
              className="absolute right-0 bg-card px-1 text-xs font-bold tabular-nums text-cobalt"
              style={{ bottom: `calc(${metrics.bandLo}% + 2px)` }}
            >
              Mục tiêu {formatRange(row.target.min, row.target.max ?? row.target.min)}
            </span>
          )}
        </div>
        <div className="relative flex">
          {row.days.map((d, i) => {
            const isSel = i === selected;
            let color = "bg-ink";
            if (row.target) color = d.inProgress ? "bg-secondary" : dayFill(d, row, levels);
            const aria =
              d.value === null
                ? `${d.dateLabel}: ${missing}`
                : `${d.dateLabel}: ${formatNumber(d.value, { decimals: row.decimals })} ${row.unit}`;
            return (
              <button
                key={d.iso}
                type="button"
                aria-label={aria}
                aria-pressed={isSel}
                onClick={() => onSelect(i)}
                className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-stretch border-0 bg-transparent p-0"
              >
                <span className={`flex ${CHART_HEIGHT} items-end px-1`}>
                  {d.value !== null && metrics ? (
                    <span
                      className={`block w-full rounded-t-[4px] transition-opacity motion-reduce:transition-none ${color} ${isSel ? "opacity-100" : levels ? "opacity-85" : "opacity-45"}`}
                      style={{ height: `${metrics.toPct(d.value)}%` }}
                    />
                  ) : (
                    <span className="block h-1 w-full rounded-[1px] bg-level-empty" />
                  )}
                </span>
                <span className={`flex h-8 items-center justify-center text-xs ${isSel ? "font-bold text-text" : "font-semibold text-secondary"}`}>
                  {d.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p aria-live="polite" className="m-0 flex items-baseline justify-between gap-3 rounded-xl bg-surface p-3">
        <span className="text-cap font-semibold text-secondary">{day.dateLabel}</span>
        <span className="text-right">
          <span className="font-display text-2xl font-extrabold tabular-nums tracking-display">{shown}</span>
          {note && <span className={`ml-2 text-xs font-bold ${noteClass}`}>{note}</span>}
        </span>
      </p>
    </div>
  );
}
