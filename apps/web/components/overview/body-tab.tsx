"use client";

import React from "react";
import { useOverview } from "@/components/overview/overview-frame";
import { useDiary } from "@/lib/diary-store";
import { formatNumber, formatSigned } from "@/lib/format";
import type { WeightPoint } from "@/lib/period";

const W = 340;
const H = 200;
const PAD_X = 24;
const PAD_TOP = 28;
const PAD_BOTTOM = 36;

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const kg = (v: number) => formatNumber(v, { decimals: 1 });

/** Weight over the period: a line through the weigh-ins, placed by date. Labels the first and the last. */
function WeightChart({ points, days }: { points: WeightPoint[]; days: string[] }) {
  const values = points.map((p) => p.kg);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const x = (iso: string) => {
    const index = Math.max(0, days.indexOf(iso));
    return PAD_X + (days.length > 1 ? (index / (days.length - 1)) * (W - 2 * PAD_X) : 0);
  };
  const y = (v: number) => PAD_TOP + ((high - v) / span) * (H - PAD_TOP - PAD_BOTTOM);
  const first = points[0];
  const last = points[points.length - 1];
  const line = points.map((p) => `${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const dots = points.length <= 10;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Cân nặng: ${kg(first.kg)} kg ngày ${ddmm(first.date)}, ${kg(last.kg)} kg ngày ${ddmm(last.date)}`}
      className="block h-auto w-full"
    >
      <line x1="10" y1={H - PAD_BOTTOM + 10} x2={W - 10} y2={H - PAD_BOTTOM + 10} className="stroke-divider" strokeWidth="1" />
      {points.length > 1 && <polyline points={line} fill="none" className="stroke-blue" strokeWidth="3" strokeLinejoin="round" />}
      {points.map((p, i) => {
        const isEnd = i === 0 || i === points.length - 1;
        if (!dots && !isEnd) return null;
        return <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r={isEnd ? 5 : 3.5} className="fill-blue" />;
      })}
      <text x={x(first.date)} y={y(first.kg) - 12} textAnchor={points.length > 1 ? "start" : "middle"} className="fill-secondary text-xs font-semibold">
        {kg(first.kg)}
      </text>
      {points.length > 1 && (
        <text x={x(last.date)} y={y(last.kg) - 12} textAnchor="end" className="fill-secondary text-xs font-semibold">
          {kg(last.kg)}
        </text>
      )}
      <text x={x(first.date)} y={H - 8} textAnchor={points.length > 1 ? "start" : "middle"} className="fill-secondary text-xs font-semibold">
        {ddmm(first.date)}
      </text>
      {points.length > 1 && (
        <text x={x(last.date)} y={H - 8} textAnchor="end" className="fill-secondary text-xs font-semibold">
          {ddmm(last.date)}
        </text>
      )}
    </svg>
  );
}

/** Cơ thể (/trends/body): weight chart from the weight log, the change in the period and since the first entry. */
export function BodyTab() {
  const { overview } = useOverview();
  const { profile } = useDiary();
  const { weight, period } = overview;

  return (
    <section aria-labelledby="bd-weight" className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3 text-text lg:max-w-[760px]">
      <div className="flex min-h-[44px] items-center justify-between gap-3">
        <h2 id="bd-weight" className="m-0 text-base font-bold lg:text-lg">
          Cân nặng
        </h2>
        <span className="inline-flex min-h-[28px] items-center rounded-full bg-page px-2.5 text-[13px] font-bold">Dữ liệu mẫu</span>
      </div>

      {weight.points.length > 0 ? (
        <WeightChart points={weight.points} days={period.days} />
      ) : (
        <p className="m-0 text-sm text-secondary">Chưa có số cân trong kỳ này.</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div data-align-group="overview-stats" className="flex min-w-0 flex-col gap-1">
          <span className="text-[13px] font-semibold text-secondary">Hiện tại</span>
          <span className="font-display italic font-black text-[26px] leading-none tabular-nums">
            {weight.latest === null ? "—" : kg(weight.latest)}
          </span>
          <span className="text-[13px] text-secondary">kg · hồ sơ {formatNumber(profile.weightKg)} kg</span>
        </div>
        <div data-align-group="overview-stats" className="flex min-w-0 flex-col gap-1">
          <span className="text-[13px] font-semibold text-secondary">Kỳ này</span>
          <span className="font-display italic font-black text-[26px] leading-none tabular-nums">
            {weight.change === null ? "—" : formatSigned(weight.change, { decimals: 1 })}
          </span>
          <span className="text-[13px] text-secondary">kg ({period.label})</span>
        </div>
        <div data-align-group="overview-stats" className="flex min-w-0 flex-col gap-1">
          <span className="text-[13px] font-semibold text-secondary">{weight.startDate ? `Từ ${ddmm(weight.startDate)}` : "Từ đầu"}</span>
          <span className="font-display italic font-black text-[26px] leading-none tabular-nums">
            {weight.sinceStart === null ? "—" : formatSigned(weight.sinceStart, { decimals: 1 })}
          </span>
          <span className="text-[13px] text-secondary">kg</span>
        </div>
      </div>

      <p className="m-0 text-[13px] leading-snug text-secondary">
        Số cân là dữ liệu mẫu cho đến khi có nhật ký cân thật.
      </p>
    </section>
  );
}
