"use client";

import React from "react";
import Link from "next/link";
import { useOverview } from "@/components/overview/overview-frame";
import { formatPeriodRange } from "@/lib/format";
import { summaryAddHref } from "@/lib/first-run";
import { HOME_ROUTE } from "@/lib/nav";
import { Card } from "@/components/ui/card";

export function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-secondary">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/**
 * "Chưa đủ dữ liệu": shown instead of averages, days on target and charts when the period has fewer than
 * 3 finished logged days. No empty bars and no zero averages.
 */
export function NotEnoughData() {
  const { overview } = useOverview();
  // Today counts here when it has an entry (the averages still leave it out, see periodNote)
  const days = overview.days.filter((d) => d.logged).length;
  if (days === 0) return <NothingLogged current={overview.period.isCurrent} />;
  return (
    <Card as="section" aria-labelledby="ov-empty" className="flex flex-col gap-3">
      <h2 id="ov-empty" className="m-0 text-base font-bold lg:text-lg">
        Chưa đủ dữ liệu
      </h2>
      <p className="m-0 text-cap leading-snug text-secondary">
        Kỳ này có {days} ngày đã ghi. Cần ít nhất 3 ngày để xem trung bình, số ngày đạt và xu hướng.
      </p>
      <Link
        href={HOME_ROUTE}
        className="inline-flex min-h-11 items-center justify-center self-start rounded-full border border-card-border bg-card px-4 text-callout font-bold text-text no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100"
      >
        Xem hôm nay
      </Link>
    </Card>
  );
}

/** No day of the period is logged: one fact, and for the current period one link to the first meal. */
function NothingLogged({ current }: { current: boolean }) {
  return (
    <Card as="section" aria-labelledby="ov-empty" className="flex flex-col gap-3">
      <h2 id="ov-empty" className="m-0 text-base font-bold lg:text-lg">
        Chưa có ngày nào được ghi
      </h2>
      {current && (
        <Link
          href={summaryAddHref(new Date())}
          className="inline-flex min-h-11 items-center justify-center self-start rounded-full border border-card-border bg-card px-4 text-callout font-bold text-cobalt no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100"
        >
          Thêm bữa đầu tiên
        </Link>
      )}
    </Card>
  );
}

/**
 * The note under a period's averages: how many finished days they cover, and that today is not counted.
 * "Trung bình 6 ngày đã ghi xong (06–11/10). 12/10 đang ghi, không tính."
 */
export function periodNote(
  period: { start: string; end: string; isCurrent: boolean },
  loggedDays: number,
  todayIso: string,
  yesterdayIso: string
): string {
  const lastFinished = period.end < todayIso ? period.end : yesterdayIso;
  const range = formatPeriodRange(period.start, lastFinished);
  const [, month, day] = todayIso.split("-");
  const base = `Trung bình ${loggedDays} ngày đã ghi xong (${range}).`;
  return period.isCurrent ? `${base} ${day}/${month} đang ghi, không tính.` : base;
}

