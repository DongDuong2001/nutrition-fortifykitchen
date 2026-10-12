"use client";

import React from "react";
import Link from "next/link";
import { useOverview } from "@/components/overview/overview-frame";
import { formatPeriodRange } from "@/lib/format";

/** A white card with a 16 px heading row. `aside` is a short caption at the right of the heading. */
export function OverviewCard({
  id,
  title,
  aside,
  className = "",
  children,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3 text-text ${className}`}
    >
      <div className="flex min-h-[44px] items-center justify-between gap-3">
        <h2 id={id} className="m-0 text-base font-bold lg:text-lg">
          {title}
        </h2>
        {aside ? <span className="text-[13px] font-semibold text-secondary">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

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
  const days = overview.averages.loggedDays;
  return (
    <section aria-labelledby="ov-empty" className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3 text-text">
      <h2 id="ov-empty" className="m-0 text-base font-bold lg:text-lg">
        Chưa đủ dữ liệu
      </h2>
      <p className="m-0 text-[13px] leading-snug text-secondary">
        Kỳ này có {days} ngày đã ghi. Cần ít nhất 3 ngày để xem trung bình, số ngày đạt và xu hướng.
      </p>
      <Link
        href="/diary"
        className="inline-flex min-h-[44px] items-center justify-center self-start rounded-full border border-card-border bg-card px-4 text-[15px] font-bold text-text no-underline active:scale-[0.97] motion-reduce:active:scale-100"
      >
        Xem nhật ký
      </Link>
    </section>
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

