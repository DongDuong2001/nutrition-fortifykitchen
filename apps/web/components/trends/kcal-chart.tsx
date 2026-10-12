"use client";

import React from "react";
import { formatNumber } from "@/lib/format";
import type { DailyTrendEntry } from "@/lib/mock/trends";
import { kcalOnTarget } from "@/lib/trends";

interface KcalChartProps {
  entries: DailyTrendEntry[];
  targetMin: number;
  targetMax: number;
}

export function KcalChart({ entries, targetMin, targetMax }: KcalChartProps) {
  const is30Days = entries.length > 7;

  // Finished days with entries; a day with nothing logged is unknown, not 0
  const completedEntries = entries.filter((e): e is DailyTrendEntry & { calories: number } => !e.isToday && e.calories !== null);
  const completedCount = completedEntries.length;
  // A day above the range is on target (product rule), so only days below the minimum count as off
  const inBandCount = completedEntries.filter((e) => kcalOnTarget(e.calories, targetMin)).length;

  const totalCalories = completedEntries.reduce((sum, e) => sum + e.calories, 0);
  const avgCalories =
    completedCount > 0 ? Math.round(totalCalories / completedCount) : 0;

  // Scaling: max kcal in chart ~ 2500
  const maxScaleKcal = Math.max(2500, ...entries.map((e) => (e.calories ?? 0) * 1.08));
  const chartHeightPx = 164;
  const scale = chartHeightPx / maxScaleKcal;

  const lineHi = Math.round(targetMax * scale);
  const lineLo = Math.round(targetMin * scale);

  const chartLabel = `Biểu đồ năng lượng ${entries.length} ngày, mục tiêu ${formatNumber(
    targetMin
  )} đến ${formatNumber(targetMax)} kcal. Trung bình ${formatNumber(
    avgCalories
  )} kcal, ${inBandCount} trên ${completedCount} ngày trong mục tiêu.`;

  return (
    <section
      aria-labelledby="t-energy"
      className="bg-card border border-card-border rounded-[18px] p-3.5 md:p-4 flex flex-col gap-2.5 shadow-xs"
    >
      <div className="flex items-center justify-between">
        <h2 id="t-energy" className="m-0 text-base font-bold text-text">
          Năng lượng
        </h2>
        <span className="text-xs text-secondary font-medium">
          Mục tiêu: {formatNumber(targetMin)}–{formatNumber(targetMax)} kcal
        </span>
      </div>

      {/* Chart container */}
      <div
        role="img"
        aria-label={chartLabel}
        className="flex gap-1.5 w-full select-none"
      >
        {/* Bars and dashed guide lines */}
        <div
          className={`flex-1 min-w-0 relative h-[164px] ${
            is30Days ? "overflow-x-auto pb-1" : ""
          }`}
        >
          {/* Target band lines */}
          <div
            aria-hidden="true"
            style={{ bottom: `${lineHi}px` }}
            className="absolute left-0 right-0 border-t border-dashed border-muted-subtitle pointer-events-none"
          />
          <div
            aria-hidden="true"
            style={{ bottom: `${lineLo}px` }}
            className="absolute left-0 right-0 border-t border-dashed border-muted-subtitle pointer-events-none"
          />

          {/* Bar columns */}
          <div
            className={`absolute inset-0 flex items-end ${
              is30Days
                ? "min-w-[620px] justify-between gap-1 px-1"
                : "grid grid-cols-7"
            }`}
          >
            {entries.map((b) => {
              const kcal = b.calories;
              const known = kcal !== null;
              const inBand = kcal !== null && kcalOnTarget(kcal, targetMin);
              const isToday = !!b.isToday;
              const state = isToday
                ? "đang ghi"
                : !known
                ? "chưa ghi"
                : inBand
                ? "trong mục tiêu"
                : "thiếu";
              const barHeight = Math.max(8, Math.round((kcal ?? 0) * scale));

              return (
                <div
                  key={b.date}
                  aria-label={
                    kcal !== null
                      ? `${b.dayLabel} ${b.dateNumber}: ${formatNumber(kcal)} kcal, ${state}`
                      : `${b.dayLabel} ${b.dateNumber}: chưa ghi`
                  }
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                >
                  {/* Value on top of bar */}
                  <div
                    className={`text-[11px] font-semibold tabular-nums text-text pb-0.5 leading-none transition-opacity ${
                      is30Days
                        ? "opacity-0 group-hover:opacity-100 group-focus:opacity-100"
                        : "opacity-100"
                    }`}
                  >
                    {kcal !== null ? formatNumber(kcal) : "—"}
                  </div>

                  {/* Bar shape */}
                  <div
                    style={{
                      height: `${barHeight}px`,
                      backgroundImage: isToday
                        ? "repeating-linear-gradient(135deg, var(--color-sky) 0px 6px, var(--color-paper) 6px 12px)"
                        : undefined,
                    }}
                    className={`w-full max-w-[28px] rounded-t-md rounded-b-xs transition-all ${
                      isToday
                        ? "border border-sky"
                        : !known
                        ? "bg-level-empty"
                        : inBand
                        ? "bg-blue"
                        : "bg-destructive"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Y-axis labels */}
        <div
          aria-hidden="true"
          className="w-10 shrink-0 relative h-[164px] select-none"
        >
          <div
            style={{ bottom: `${lineHi - 7}px` }}
            className="absolute right-0 text-[11px] md:text-xs text-secondary tabular-nums leading-none"
          >
            {formatNumber(targetMax)}
          </div>
          <div
            style={{ bottom: `${lineLo - 7}px` }}
            className="absolute right-0 text-[11px] md:text-xs text-secondary tabular-nums leading-none"
          >
            {formatNumber(targetMin)}
          </div>
        </div>
      </div>

      {/* Date labels below bars */}
      <div
        className={`flex gap-1.5 ${
          is30Days ? "overflow-x-auto pr-10" : "grid grid-cols-7 pr-11"
        }`}
      >
        {entries.map((b, i) => {
          if (is30Days && i % 3 !== 0 && !b.isToday) {
            return (
              <div
                key={b.date}
                className="flex-1 min-w-[16px] text-center text-[10px] text-secondary opacity-0"
              >
                ·
              </div>
            );
          }

          return (
            <div
              key={b.date}
              className={`flex-1 min-w-0 text-center text-[11px] text-secondary leading-tight ${
                is30Days ? "min-w-[32px]" : ""
              }`}
            >
              <div>{b.dayLabel}</div>
              <div className="text-[10px] tabular-nums">
                {b.isToday ? `${b.dateNumber} · nay` : b.dateNumber}
              </div>
            </div>
          );
        })}
      </div>

      {/* Average & on-target summary */}
      <div className="text-sm font-semibold tabular-nums text-text pt-1">
        TB {formatNumber(avgCalories)} kcal · {inBandCount}/{completedCount} ngày trong mục tiêu
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-xs bg-blue shrink-0"
          />
          Trong mục tiêu
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-xs bg-destructive shrink-0"
          />
          Thiếu
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, var(--color-sky) 0px 4px, var(--color-paper) 4px 8px)",
            }}
            className="w-2.5 h-2.5 rounded-xs border border-sky shrink-0"
          />
          Hôm nay (đang ghi)
        </span>
      </div>
    </section>
  );
}
