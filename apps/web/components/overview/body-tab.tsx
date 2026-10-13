"use client";

import React, { useMemo, useState } from "react";
import { useOverview } from "@/components/overview/overview-frame";
import { HeroCard, HeroNumber } from "@/components/overview/parts/hero-card";
import { SectionTitle } from "@/components/ui/section-title";
import { useDiary } from "@/lib/diary-store";
import { formatNumber, formatRange, formatSigned } from "@/lib/format";
import { weekdayShort, weightDayNote } from "@/lib/overview-board";
import { weighIns, weightShift } from "@/lib/overview-detail";
import { weightSummary, type WeightPoint } from "@/lib/period";

const CHART_HEIGHT = "h-[176px]";
const PAD = 6; // percent of the chart width kept free at both ends
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const kg = (v: number) => formatNumber(v, { decimals: 1 });

/**
 * The weight line of the period: one dot per weigh-in placed by date, joined by a line. Each dot is a button
 * (a full-height column, so dense 30-day charts stay tappable); the stepper under the chart moves between
 * weigh-ins with 44 px buttons.
 */
function WeightLine({
  points,
  days,
  selected,
  onSelect,
}: {
  points: WeightPoint[];
  days: string[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  const values = points.map((p) => p.kg);
  const low = Math.min(...values) - 0.3;
  const high = Math.max(...values) + 0.3;
  const x = (iso: string) => PAD + (days.length > 1 ? (Math.max(0, days.indexOf(iso)) / (days.length - 1)) * (100 - 2 * PAD) : 50);
  const y = (v: number) => 12 + ((high - v) / (high - low)) * 76;
  const line = points.map((p) => `${x(p.date).toFixed(2)},${y(p.kg).toFixed(2)}`).join(" ");
  const columnWidth = `max(12px, ${(100 - 2 * PAD) / Math.max(days.length - 1, 1)}%)`;

  return (
    <div className="flex flex-col gap-2">
      <div className={`relative ${CHART_HEIGHT} border-b border-card-border`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
          {points.length > 1 && (
            <polyline points={line} fill="none" className="stroke-blue" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {points.map((p, i) => {
          const isSel = i === selected;
          return (
            <button
              key={p.date}
              type="button"
              aria-pressed={isSel}
              aria-label={`${weekdayShort(p.date)} ${dm(p.date)}: ${kg(p.kg)} kg`}
              onClick={() => onSelect(i)}
              className="absolute top-0 h-full -translate-x-1/2 cursor-pointer border-0 bg-transparent p-0"
              style={{ left: `${x(p.date)}%`, width: columnWidth }}
            >
              <span
                aria-hidden="true"
                className={`absolute left-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  isSel ? "h-4 w-4 bg-blue ring-4 ring-sky/50" : "h-2 w-2 bg-blue"
                }`}
                style={{ top: `${y(p.kg)}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs font-semibold text-secondary" aria-hidden="true">
        <span>{dm(days[0])}</span>
        <span>{dm(days[days.length - 1])}</span>
      </div>
    </div>
  );
}

/** Cơ thể (/trends/body): the latest weight, the weight line of the period, and what moves with it. */
export function BodyTab() {
  const { overview } = useOverview();
  const { profile, demo } = useDiary();
  const { weight, period, weightLog } = overview;
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  const previous = useMemo(() => weightSummary(weightLog, overview.previous), [weightLog, overview.previous]);
  const counted = useMemo(() => weighIns(period.days, weightLog), [period.days, weightLog]);
  const shift = useMemo(() => {
    if (weight.points.length < 2) return null;
    return weightShift(profile, weight.points[0].kg, weight.points[weight.points.length - 1].kg);
  }, [weight.points, profile]);

  const hasPoints = weight.points.length > 0;
  // The selected weigh-in by date, so a new period never points at another day: the last one by default
  const found = weight.points.findIndex((p) => p.date === pickedDate);
  const selected = found >= 0 ? found : weight.points.length - 1;
  const point = hasPoints ? weight.points[selected] : null;
  const pointNote = point ? weightDayNote(weightLog, point.date) : "";

  if (!hasPoints && weightLog.length === 0 && !demo) {
    return (
      <div className="flex flex-col gap-3 lg:max-w-[720px]">
        <HeroCard id="bd-hero" label="Cân nặng">
          <HeroNumber value="—" unit="kg" side={<p className="m-0">Hồ sơ {kg(profile.weightKg)} kg</p>} />
        </HeroCard>
        <section className="rounded-[18px] border border-card-border bg-card p-4 text-text">
          <p className="m-0 text-[15px] font-semibold">Chưa có số cân</p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-secondary">Chưa có số cân trong kỳ này. Mỗi lần cân bạn ghi sẽ hiện ở đây.</p>
        </section>
      </div>
    );
  }

  const periodChange = weight.change;
  const sincePrevious = weight.latest !== null && previous.latest !== null ? weight.latest - previous.latest : null;

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
      <div className="flex flex-col gap-3 lg:col-span-7 lg:gap-5">
        <HeroCard id="bd-hero" label="Cân nặng">
          <HeroNumber
            id="bd-hero-number"
            value={weight.latest === null ? "—" : kg(weight.latest)}
            unit="kg"
            side={
              <p className="m-0">
                Kỳ này{" "}
                <b className="font-bold text-on-dark tabular-nums">
                  {periodChange === null ? "—" : `${formatSigned(periodChange, { decimals: 1 })} kg`}
                </b>
                <br />
                Hồ sơ <b className="font-bold text-on-dark tabular-nums">{kg(profile.weightKg)} kg</b>
              </p>
            }
          />
          {demo && <p className="m-0 text-[13px] text-muted-subtitle">Dữ liệu mẫu cho đến khi có nhật ký cân thật.</p>}
        </HeroCard>

        <section aria-labelledby="bd-line" className="flex flex-col gap-3 rounded-[18px] border border-card-border bg-card p-4 text-text">
          <div className="flex min-h-[44px] items-center justify-between gap-3">
            <SectionTitle id="bd-line">Cân nặng {period.length} ngày</SectionTitle>
            {demo && <span className="inline-flex min-h-[28px] items-center rounded-full bg-page px-3 text-[13px] font-bold">Dữ liệu mẫu</span>}
          </div>
          {hasPoints && point ? (
            <>
              <WeightLine
                points={weight.points}
                days={period.days}
                selected={selected}
                onSelect={(i) => setPickedDate(weight.points[i].date)}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Lần cân trước"
                  disabled={selected === 0}
                  onClick={() => setPickedDate(weight.points[selected - 1].date)}
                  className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-card-border bg-card text-text active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-default disabled:opacity-45"
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <p aria-live="polite" className="m-0 flex min-w-0 flex-1 items-baseline justify-between gap-3 rounded-xl bg-page px-3 py-3">
                  <span className="whitespace-nowrap text-[13px] font-semibold text-secondary">
                    {weekdayShort(point.date)} {dm(point.date)}
                  </span>
                  <span className="text-right">
                    <span className="font-display text-2xl font-bold tabular-nums">{kg(point.kg)} kg</span>
                    {pointNote && <span className="ml-2 text-xs font-bold text-secondary">{pointNote}</span>}
                  </span>
                </p>
                <button
                  type="button"
                  aria-label="Lần cân sau"
                  disabled={selected === weight.points.length - 1}
                  onClick={() => setPickedDate(weight.points[selected + 1].date)}
                  className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-card-border bg-card text-text active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-default disabled:opacity-45"
                >
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            </>
          ) : (
            <p className="m-0 text-[15px] font-semibold">Chưa có số cân trong kỳ này.</p>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-3 lg:col-span-5 lg:gap-5">
        <section aria-labelledby="bd-facts" className="flex flex-col rounded-[18px] border border-card-border bg-card px-4 text-text">
          <SectionTitle id="bd-facts" className="py-3">Trong kỳ này</SectionTitle>
          <dl className="m-0 flex flex-col">
            <div data-align-group="overview-stats" className="flex min-h-[56px] items-center justify-between gap-3 border-t border-divider">
              <dt className="text-[15px]">Số lần cân</dt>
              <dd className="m-0 font-display text-[26px] font-bold tabular-nums">
                {counted.count}/{counted.of}
              </dd>
            </div>
            <div data-align-group="overview-stats" className="flex min-h-[56px] items-center justify-between gap-3 border-t border-divider">
              <dt className="text-[15px]">So với kỳ trước</dt>
              <dd className="m-0 font-display text-[26px] font-bold tabular-nums">
                {sincePrevious === null ? "—" : `${formatSigned(sincePrevious, { decimals: 1 })} kg`}
              </dd>
            </div>
            <div data-align-group="overview-stats" className="flex min-h-[56px] items-center justify-between gap-3 border-t border-divider">
              <dt className="text-[15px]">Từ lần cân đầu tiên</dt>
              <dd className="m-0 font-display text-[26px] font-bold tabular-nums">
                {weight.sinceStart === null ? "—" : `${formatSigned(weight.sinceStart, { decimals: 1 })} kg`}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="bd-shift" className="flex flex-col gap-3 rounded-[18px] border border-card-border bg-card p-4 text-text">
          <SectionTitle id="bd-shift">Mục tiêu theo cân nặng</SectionTitle>
          {shift === null ? (
            <p className="m-0 text-[13px] leading-snug text-secondary">Cần ít nhất hai lần cân trong kỳ để so sánh mục tiêu.</p>
          ) : (
            <>
              <p className="m-0 text-[13px] text-secondary">
                {kg(weight.points[0].kg)} kg → {kg(weight.points[weight.points.length - 1].kg)} kg
              </p>
              <ul className="m-0 flex list-none flex-col p-0">
                {shift.map((row, i) => (
                  <li key={row.key} className={`flex min-h-[56px] items-center justify-between gap-3 ${i > 0 ? "border-t border-divider" : ""}`}>
                    <span className="text-[15px] font-semibold">{row.label}</span>
                    <span className="text-right text-[15px] font-bold tabular-nums">
                      {row.changed ? (
                        <>
                          <span className="font-semibold text-secondary">{formatRange(row.before.min, row.before.max)}</span> →{" "}
                          {formatRange(row.now.min, row.now.max)} {row.unit}
                        </>
                      ) : (
                        <>
                          {formatRange(row.now.min, row.now.max)} {row.unit}
                          <span className="ml-2 text-xs font-semibold text-secondary">không đổi</span>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
