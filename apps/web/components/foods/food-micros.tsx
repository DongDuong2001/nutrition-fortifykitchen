import React from "react";
import type { MicroRow } from "@/lib/food-detail";
import { formatAmount, formatNumber } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

/** Whole percent, with one decimal under 1 % ("0,1 %"). */
function shareText(row: MicroRow): string {
  if (row.share === null) return "";
  return row.share > 0 && row.share < 1 ? `${formatNumber(row.share, { decimals: 1 })} %` : `${row.pct} %`;
}

/** Single-colour blue bar: the share of the daily target, capped at the full width. */
function ShareBar({ share, label }: { share: number; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="h-1.5 w-full overflow-hidden rounded-full bg-level-empty"
    >
      <div className="h-full rounded-full bg-blue" style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
    </div>
  );
}

function MicroLine({ row }: { row: MicroRow }) {
  const known = row.value !== null;
  const share = shareText(row);
  return (
    <li className="flex min-h-[44px] flex-col justify-center gap-1.5 border-t border-divider py-2">
      <div className="flex items-baseline justify-between gap-2 text-[15px]">
        <span className="font-semibold text-text">{row.name}</span>
        {known ? (
          <span className="shrink-0 tabular-nums text-secondary">
            <strong className="font-bold text-text">
              {formatAmount(row.value as number, row.unit)} {row.unit}
            </strong>
            {share && ` · ${share}`}
          </span>
        ) : (
          <span className="shrink-0 text-secondary" aria-label="Chưa có dữ liệu">
            —
          </span>
        )}
      </div>
      {row.share !== null && <ShareBar share={row.share} label={`${row.name}: ${share} mục tiêu ngày`} />}
    </li>
  );
}

const GROUPS: { key: MicroRow["group"]; title: string }[] = [
  { key: "minerals", title: "Khoáng chất" },
  { key: "vitamins", title: "Vitamin" },
];

/** "Nguồn tốt của": counted nutrients at 20 % of the daily target or more for the portion. Nothing when none. */
export function GoodSources({ rows }: { rows: MicroRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Card as="section" aria-labelledby="good-sources" className="flex flex-col gap-2">
      <SectionTitle id="good-sources">Nguồn tốt của</SectionTitle>
      <p className="m-0 text-[13px] leading-snug text-secondary">Từ 20 % mục tiêu ngày mỗi khẩu phần</p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {rows.map((r) => (
          <li
            key={r.id}
            className="inline-flex min-h-[32px] items-center rounded-full bg-page px-3 text-[13px] font-bold text-text"
          >
            {r.name} · {r.pct} %
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** The 22 counted nutrients for the chosen portion, as amount and % of the daily target. Unknown is "—". */
export function FoodMicros({ rows, unknown, portionLabel }: { rows: MicroRow[]; unknown: number; portionLabel: string }) {
  return (
    <Card as="section" aria-labelledby="food-micros" className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <SectionTitle id="food-micros">Vi chất trong {portionLabel}</SectionTitle>
        <p className="m-0 text-[13px] leading-snug text-secondary">% mục tiêu ngày</p>
      </div>
      {GROUPS.map((g) => (
        <div key={g.key} className="flex flex-col">
          <h3 className="m-0 pt-2 text-[13px] font-semibold text-secondary">{g.title}</h3>
          <ul className="m-0 flex list-none flex-col p-0">
            {rows
              .filter((r) => r.group === g.key)
              .map((r) => (
                <MicroLine key={r.id} row={r} />
              ))}
          </ul>
        </div>
      ))}
      {unknown > 0 && (
        <p className="m-0 text-[13px] leading-snug text-secondary">
          Chưa có dữ liệu cho {unknown} trong {rows.length} vi chất.
        </p>
      )}
    </Card>
  );
}
