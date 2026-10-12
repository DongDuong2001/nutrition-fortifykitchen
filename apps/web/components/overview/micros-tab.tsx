"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { NotEnoughData } from "@/components/overview/overview-parts";
import { useOverview } from "@/components/overview/overview-frame";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import { formatAmount, formatPercent, formatRange } from "@/lib/format";
import { microRows } from "@/lib/overview";

/**
 * Vi chất (/trends/micros): the period average of each of the 22 counted nutrients as a share of its target,
 * lowest first, with how many days reached the target. A row opens the nutrient's detail.
 */
export function MicrosTab() {
  const { overview, targets } = useOverview();
  const rows = useMemo(() => microRows(overview.averages, overview.targetDays, targets), [overview, targets]);

  if (!overview.enough) return <NotEnoughData />;

  const withoutAverage = rows.filter((r) => r.average === null).length;

  return (
    <section aria-labelledby="mi-list" className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3 text-text">
      <div className="flex min-h-[44px] items-center justify-between gap-3">
        <h2 id="mi-list" className="m-0 text-base font-bold lg:text-lg">
          Vi chất · % mục tiêu
        </h2>
        <span className="text-[13px] font-semibold text-secondary">Thấp nhất trước</span>
      </div>

      <ul className="m-0 grid list-none grid-cols-1 p-0 lg:grid-cols-2 lg:gap-x-8">
        {rows.map((row, i) => {
          const range = row.targetMin === null ? null : row.targetMax ? formatRange(row.targetMin, row.targetMax) : formatAmount(row.targetMin, row.unit);
          const detail =
            row.average === null
              ? "Chưa có số liệu trong kỳ này"
              : `TB ${formatAmount(row.average, row.unit)} ${row.unit}${range ? ` · mục tiêu ${range} ${row.unit}` : ""}${row.of > 0 ? ` · ${row.met}/${row.of} ngày đạt` : ""}`;
          return (
            <li key={row.key} className={i > 0 ? "border-t border-divider lg:[&:nth-child(2)]:border-t-0" : ""}>
              <Link
                href={`/micros/${row.key}`}
                data-align-group={i % 2 === 0 ? "overview-micro-l" : "overview-micro-r"}
                className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-2.5 text-text no-underline active:scale-[0.99]"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold">{row.name}</span>
                  <span className="block text-[13px] leading-snug text-secondary">{detail}</span>
                </span>
                <span className="font-display italic font-black text-[22px] leading-none tabular-nums">
                  {row.percentage === null ? "—" : formatPercent(row.percentage)}
                </span>
                <span className="col-span-2">
                  <SegmentedBar aria-label={`${row.name}: ${row.percentage === null ? "chưa có số liệu" : `${row.percentage} % mục tiêu`}`} percentage={row.percentage ?? 0} tone="light" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="m-0 text-[13px] leading-snug text-secondary">
        Mỗi thanh có 10 đoạn; đoạn đầy khi đạt 10 % mục tiêu. Chạm một chất để mở chi tiết.
        {withoutAverage > 0 ? ` ${withoutAverage} chất chưa có số liệu trong kỳ này, nên chưa có trung bình.` : ""}
      </p>
    </section>
  );
}
