"use client";

import React from "react";
import { NotEnoughData, OverviewCard } from "@/components/overview/overview-parts";
import { useOverview } from "@/components/overview/overview-frame";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import type { DayTotals } from "@/lib/day-totals";
import { formatNumber, formatRange } from "@/lib/format";
import { weekdayShortVi } from "@/lib/nutrient-detail";
import { kcalOnTarget } from "@/lib/trends";

const RING_RADIUS = 44;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const STRIPES = "repeating-linear-gradient(135deg, var(--color-blue) 0 3px, var(--color-sky) 3px 6px)";

/** Donut of the kcal split. The three arcs use the blue, sky and ink tokens; the rows beside it carry the numbers. */
function CompositionRing({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const parts = [
    { key: "protein", share: protein, stroke: "stroke-blue" },
    { key: "carbs", share: carbs, stroke: "stroke-sky" },
    { key: "fat", share: fat, stroke: "stroke-ink" },
  ];
  let offset = 0;
  return (
    <div
      role="img"
      aria-label={`Đạm ${protein} %, tinh bột ${carbs} %, béo ${fat} % của kcal trung bình`}
      className="relative h-[120px] w-[120px] shrink-0 lg:h-[168px] lg:w-[168px]"
    >
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <g transform="rotate(-90 60 60)" fill="none" strokeWidth="16">
          {parts.map((part) => {
            const length = (part.share / 100) * RING_LENGTH;
            const circle = (
              <circle
                key={part.key}
                cx="60"
                cy="60"
                r={RING_RADIUS}
                className={part.stroke}
                strokeDasharray={`${length} ${RING_LENGTH - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return circle;
          })}
        </g>
      </svg>
    </div>
  );
}

/** One bar per day with the target band behind them. Above the band is on target; only below the minimum is "Thiếu". */
function KcalDayChart({ days, todayIso, min, max }: { days: DayTotals[]; todayIso: string; min: number; max: number }) {
  const values = days.map((d) => d.calories ?? 0);
  const top = Math.max(2500, ...values.map((v) => v * 1.08));
  const pct = (v: number) => `${(v / top) * 100}%`;
  const long = days.length > 7;

  return (
    <div>
      <div className="relative h-[176px] pt-5 lg:h-[240px]" role="group" aria-label="Kcal mỗi ngày">
        <div className="relative h-full">
          {/* target band */}
          <div
            aria-hidden="true"
            className="absolute -inset-x-1 border-y-2 border-dashed border-ink bg-ink/5"
            style={{ bottom: pct(min), height: `${((max - min) / top) * 100}%` }}
          />
          <div className={`absolute inset-0 flex items-stretch ${long ? "gap-0.5" : "gap-2"}`}>
            {days.map((d) => {
              const isToday = d.date === todayIso;
              const kcal = d.calories;
              const known = kcal !== null;
              const onTarget = known && kcalOnTarget(kcal, min);
              const state = isToday ? "đang ghi" : !known ? "chưa ghi" : onTarget ? "trong mục tiêu hoặc trên" : "thiếu";
              const label = `${weekdayShortVi(d.date)} ${d.date.slice(8, 10)}: ${known ? `${formatNumber(kcal)} kcal, ` : ""}${state}`;
              const barClass = isToday ? "border border-sky" : !known ? "bg-level-empty" : onTarget ? "bg-blue" : "bg-level-red";
              return (
                <div key={d.date} aria-label={label} title={label} className="relative min-w-0 flex-1">
                  {known && !long && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap bg-card px-0.5 text-xs font-bold tabular-nums lg:text-[13px]"
                      style={{ bottom: `calc(${pct(kcal)} + 2px)` }}
                    >
                      {formatNumber(kcal)}
                    </span>
                  )}
                  <span
                    className={`absolute bottom-0 left-1/2 block w-full -translate-x-1/2 rounded-t-[4px] ${long ? "max-w-[14px]" : "max-w-[30px] lg:max-w-[56px]"} ${barClass}`}
                    style={{
                      height: known ? pct(kcal) : "4px",
                      minHeight: "4px",
                      backgroundImage: isToday ? STRIPES : undefined,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className={`mt-1 flex ${long ? "gap-0.5" : "gap-2"}`} aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.date} className="min-w-0 flex-1 text-center text-xs font-semibold leading-tight text-secondary lg:text-[13px]">
            {long && i % 5 !== 0 && d.date !== todayIso ? "" : (
              <>
                {weekdayShortVi(d.date)}
                <br />
                {d.date.slice(8, 10)}
              </>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Năng lượng (/trends): kcal composition, kcal per day against the target band, protein. */
export function EnergyTab() {
  const { overview, todayIso, targets } = useOverview();
  const { averages, composition, targetDays, days } = overview;

  if (!overview.enough || composition === null || averages.calories === null) return <NotEnoughData />;

  const kcal = targets.calories;
  const protein = targets.protein;
  const fat = targets.fat;
  const proteinAvg = averages.protein ?? 0;
  const proteinPct = protein.min > 0 ? Math.round((proteinAvg / protein.min) * 100) : 0;
  const underDays = targetDays.protein.of - targetDays.protein.met;

  const rows = [
    {
      key: "protein",
      name: "Đạm",
      swatch: "bg-blue",
      sub: `TB ${formatNumber(Math.round(averages.protein ?? 0))} g · mục tiêu ${formatRange(protein.min, protein.max)} g`,
      share: composition.protein,
      kcal: Math.round((averages.protein ?? 0) * 4),
    },
    {
      key: "carbs",
      name: "Tinh bột",
      swatch: "bg-sky",
      sub: `TB ${formatNumber(Math.round(averages.carbs ?? 0))} g · phần còn lại của kcal`,
      share: composition.carbs,
      kcal: Math.round((averages.carbs ?? 0) * 4),
    },
    {
      key: "fat",
      name: "Béo",
      swatch: "bg-ink",
      sub: `TB ${formatNumber(Math.round(averages.fat ?? 0))} g · mục tiêu ${formatRange(fat.min, fat.max)} g`,
      share: composition.fat,
      kcal: Math.round((averages.fat ?? 0) * 9),
    },
  ];

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
      <OverviewCard id="en-comp" title="Thành phần kcal" aside={`TB ${formatNumber(Math.round(averages.calories))} kcal`} className="lg:col-span-5">
        <div className="flex items-center gap-4 lg:gap-7">
          <CompositionRing protein={composition.protein} carbs={composition.carbs} fat={composition.fat} />
          <ul className="m-0 flex min-w-0 flex-1 list-none flex-col p-0">
            {rows.map((row, i) => (
              <li
                key={row.key}
                data-align-group="overview-comp"
                className={`flex min-h-[52px] items-center justify-between gap-3 py-2 lg:min-h-[60px] ${i > 0 ? "border-t border-divider" : ""}`}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[15px] font-semibold">
                    <span aria-hidden="true" className={`inline-block h-3 w-3 shrink-0 rounded-[3px] ${row.swatch}`} />
                    {row.name}
                  </span>
                  <span className="block text-[13px] leading-snug text-secondary">{row.sub}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end text-right">
                  <span className="text-[15px] font-bold tabular-nums">{row.share} %</span>
                  <span className="text-[13px] font-semibold tabular-nums text-secondary">{formatNumber(row.kcal)} kcal</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </OverviewCard>

      <section
        aria-labelledby="en-kcal"
        className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3 text-text lg:col-span-7"
      >
        <h2 id="en-kcal" className="m-0 text-base font-bold lg:text-lg">
          Kcal mỗi ngày
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className="inline-block h-3 w-3 rounded-[3px] bg-blue" />
            Trong mục tiêu hoặc trên
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className="inline-block h-3 w-3 rounded-[3px] bg-level-red" />
            Thiếu
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className="inline-block h-3 w-3 rounded-[3px]" style={{ backgroundImage: STRIPES }} />
            Đang ghi
          </span>
        </div>
        <KcalDayChart days={days} todayIso={todayIso} min={kcal.min} max={kcal.max} />
        <div className="flex min-h-[56px] items-center justify-between gap-3 border-t border-divider pt-2">
          <span>
            <span className="block text-[15px] font-semibold">Trung bình {formatNumber(Math.round(averages.calories))} kcal</span>
            <span className="block text-[13px] text-secondary">
              Mục tiêu {formatRange(kcal.min, kcal.max)} kcal. Trên mục tiêu vẫn tính là đạt.
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end text-right">
            <span className="text-[15px] font-bold tabular-nums">
              {targetDays.calories.met}/{targetDays.calories.of}
            </span>
            <span className="text-[13px] font-semibold text-secondary">ngày đạt</span>
          </span>
        </div>
      </section>

      <OverviewCard id="en-protein" title="Đạm" aside={`Mục tiêu ${formatRange(protein.min, protein.max)} g`} className="lg:col-span-12">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] font-semibold text-secondary">Trung bình</span>
            <span className="font-display italic font-black text-[26px] leading-none tabular-nums lg:text-[34px]">
              {formatNumber(Math.round(proteinAvg))} g
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] font-semibold text-secondary">Ngày đạt</span>
            <span className="font-display italic font-black text-[26px] leading-none tabular-nums lg:text-[34px]">
              {targetDays.protein.met}/{targetDays.protein.of}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] font-semibold text-secondary">Dưới mục tiêu</span>
            <span className="font-display italic font-black text-[26px] leading-none tabular-nums lg:text-[34px]">
              {underDays} ngày
            </span>
          </div>
        </div>
        <SegmentedBar aria-label={`Đạm trung bình ${proteinPct} % mục tiêu`} percentage={proteinPct} tone="light" />
      </OverviewCard>
    </div>
  );
}
