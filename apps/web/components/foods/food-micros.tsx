import React from "react";
import type { MicroRow } from "@/lib/food-detail";
import { formatAmount, formatNumber } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { nutrientDot } from "@/lib/nutrient-colors";
import { getLevel, getLevelColor } from "@/lib/levels";

/** The 8 px dot before a nutrient's name, in the nutrient's colour (V3-SPEC §1). */
function NutrientDot({ id }: { id: string }) {
  return <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full align-[1px]" style={{ backgroundColor: nutrientDot(id) }} />;
}

/** Whole percent, with one decimal under 1 % ("0,1%"). */
function shareText(row: MicroRow): string {
  if (row.share === null) return "";
  if (row.share > 0 && row.share < 0.1) return "< 0,1%";
  return row.share > 0 && row.share < 1 ? `${formatNumber(row.share, { decimals: 1 })}%` : `${row.pct}%`;
}

/** The share of the daily target, capped at the full width, in the level colour of its percent (lib/levels: never a gradient). */
function ShareBar({ share, pct, label }: { share: number; pct: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-track">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, share))}%`, backgroundColor: getLevelColor(getLevel(pct)) }} />
    </div>
  );
}

function MicroLine({ row }: { row: MicroRow }) {
  const known = row.value !== null;
  const share = shareText(row);
  return (
    <li data-align-group="food-micros" className="flex min-h-11 flex-col justify-center gap-1 border-t border-divider py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-callout">
        <span className="font-semibold text-text">
          <NutrientDot id={row.id} />
          {row.name}
        </span>
        {known ? (
          <span className="shrink-0 tabular-nums text-secondary">
            <strong className="font-bold" style={{ color: nutrientDot(row.id) }}>
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
      {row.share !== null && <ShareBar share={row.share} pct={row.pct ?? 0} label={`${row.name}: ${share} mục tiêu ngày`} />}
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
    <Card as="section" aria-labelledby="good-sources" data-align-group="food-detail" className="flex flex-col gap-2">
      <SectionTitle id="good-sources">Nguồn tốt của</SectionTitle>
      <p className="m-0 text-cap leading-snug text-secondary">Từ 20% mục tiêu ngày mỗi khẩu phần</p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {rows.map((r) => (
          <li
            key={r.id}
            className="inline-flex min-h-[32px] items-center rounded-full bg-surface px-3 text-cap font-bold text-text"
          >
            <NutrientDot id={r.id} />
            {r.name} · {r.pct}%
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** The 22 counted nutrients for the chosen portion, as amount and % of the daily target. Unknown is "—". */
export function FoodMicros({ rows, unknown, portionLabel }: { rows: MicroRow[]; unknown: number; portionLabel: string }) {
  return (
    <Card as="section" aria-labelledby="food-micros" data-align-group="food-detail" className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <SectionTitle id="food-micros">Vi chất trong {portionLabel}</SectionTitle>
        <p className="m-0 text-cap leading-snug text-secondary">% mục tiêu ngày</p>
      </div>
      {GROUPS.map((g) => (
        <div key={g.key} className="flex flex-col">
          <SectionTitle as="h3" className="pb-1 pt-2">
            {g.title}
          </SectionTitle>
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
        <p className="m-0 text-cap leading-snug text-secondary">
          Chưa có dữ liệu cho {unknown} trong {rows.length} vi chất.
        </p>
      )}
    </Card>
  );
}
