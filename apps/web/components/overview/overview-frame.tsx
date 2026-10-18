"use client";

import React, { Suspense, createContext, useContext, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Period } from "@/lib/period";
import { markUsed } from "@/lib/onboarding-store";
import { AppHeader } from "@/components/ui/app-header";
import { useDiary } from "@/lib/diary-store";
import type { MockDayData } from "@/lib/mock/sample-day";
import { buildOverview, type Overview } from "@/lib/overview";
import { periodHeading } from "@/lib/overview-board";
import { parsePeriodParams, periodQuery, type PeriodLength } from "@/lib/period";
import type { CompleteTargets } from "@/lib/targets";

export type OverviewTab = "summary" | "energy" | "micros" | "body";

const TABS: { id: OverviewTab; href: string; label: string }[] = [
  { id: "summary", href: "/trends", label: "Tóm tắt" },
  { id: "energy", href: "/trends/energy", label: "Năng lượng" },
  { id: "micros", href: "/trends/micros", label: "Vi chất" },
  { id: "body", href: "/trends/body", label: "Cơ thể" },
];

interface OverviewContextValue {
  overview: Overview;
  todayIso: string;
  /** Today as the diary holds it (with the user's edits) */
  today: MockDayData;
  targets: CompleteTargets;
  /** A link inside Tổng quan that keeps the period (?p= and ?o=) */
  hrefWithPeriod: (path: string) => string;
}

const OverviewContext = createContext<OverviewContextValue | null>(null);

/** The period data of the sub-tab being shown. Only available inside the frame's content. */
export function useOverview(): OverviewContextValue {
  const ctx = useContext(OverviewContext);
  if (!ctx) throw new Error("useOverview must be used inside OverviewFrame");
  return ctx;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

/**
 * The period heading and its controls: ‹ › step the period, 7|30 changes its length. The period is in the URL.
 * `compact` (Tóm tắt) is one row: ‹ heading › and the 7|30 group.
 */
export function PeriodControl({
  heading,
  period,
  length,
  compact = false,
}: {
  heading: string;
  period: Period | undefined;
  length: PeriodLength;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Keep "dd/mm – dd/mm" on one line at 390 px (no break at the dash).
  const label = heading.replace(" – ", " – ");
  const go = (nextLength: PeriodLength, nextOffset: number) =>
    router.replace(`${pathname}${periodQuery(nextLength, nextOffset)}`, { scroll: false });

  const stepClass =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-text cursor-pointer hover:bg-divider active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-default disabled:opacity-45";
  const prev = (
    <button type="button" aria-label="Kỳ trước" disabled={!period} onClick={() => period && go(length, period.offset + 1)} className={stepClass}>
      <ChevronIcon direction="left" />
    </button>
  );
  const next = (
    <button type="button" aria-label="Kỳ sau" disabled={!period || period.isCurrent} onClick={() => period && go(length, period.offset - 1)} className={stepClass}>
      <ChevronIcon direction="right" />
    </button>
  );
  const lengthGroup = (
    <div role="group" aria-label="Độ dài kỳ" data-tour="trends-range" className="inline-flex shrink-0 rounded-full border border-card-border bg-card p-0.5">
      {([7, 30] as const).map((n) => {
        const isActive = n === length;
        return (
          <Link
            key={n}
            href={`${pathname}${periodQuery(n, 0)}`}
            replace
            scroll={false}
            onClick={() => markUsed("range-toggle")}
            aria-current={isActive ? "true" : "false"}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-full text-sm font-bold no-underline transition-colors active:scale-[0.97] motion-reduce:active:scale-100 ${
              compact ? "min-w-[44px] px-2" : "px-4"
            } ${isActive ? "bg-ink text-on-dark" : "text-secondary hover:text-text"}`}
          >
            {compact ? (
              <>
                {n}
                <span className="sr-only"> ngày</span>
              </>
            ) : (
              `${n} ngày`
            )}
          </Link>
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center">
          {prev}
          <p id="ov-period" className="m-0 min-w-0 text-center text-[13px] font-semibold leading-snug text-secondary">
            {label}
          </p>
          {next}
        </div>
        {lengthGroup}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 text-[15px] font-bold lg:text-lg">{label}</p>
      <div className="flex items-center justify-between gap-2 lg:justify-start lg:gap-4">
        <div className="flex items-center">
          {prev}
          {next}
        </div>
        {lengthGroup}
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">Đang tải…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-card border border-card-border rounded-[18px] p-4 flex flex-col gap-3 motion-safe:animate-pulse">
          <div className="h-3 w-2/5 rounded bg-level-empty" />
          <div className="h-3 w-[70%] rounded bg-level-empty" />
          <div className="h-3 w-[55%] rounded bg-level-empty" />
        </div>
      ))}
    </div>
  );
}

/**
 * The frame of the four Tổng quan sub-tabs (app/(tabs)/trends/layout.tsx, so it stays mounted while the content swaps): the phone's ink band with the wordmark (the h1 "Tổng quan" is
 * sr-only there), the sub-tab bar (a tablist of links; on desktop it sits in the title row), and the period
 * control shared by all four. The period is in the URL (?p=7|30 and ?o=offset), so the sub-tab links carry it.
 */
export function OverviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="w-full px-4 pt-6">
          <ContentSkeleton />
        </div>
      }
    >
      <FrameInner>{children}</FrameInner>
    </Suspense>
  );
}

/** The sub-tab of a /trends path. */
export function overviewTabOf(pathname: string): OverviewTab {
  return TABS.find((t) => t.id !== "summary" && (pathname === t.href || pathname.startsWith(t.href + "/")))?.id ?? "summary";
}

function FrameInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const active = overviewTabOf(usePathname() ?? "");
  const { todayIso, data, targets } = useDiary();

  const { length, offset } = parsePeriodParams(searchParams?.get("p"), searchParams?.get("o"));
  const query = periodQuery(length, offset);

  const overview = useMemo(
    () => (todayIso ? buildOverview({ todayIso, today: data, targets, length, offset }) : null),
    [todayIso, data, targets, length, offset]
  );

  const ctx: OverviewContextValue | null =
    overview && todayIso
      ? { overview, todayIso, today: data, targets, hrefWithPeriod: (path) => `${path}${query}` }
      : null;
  const period = overview?.period;

  return (
    <>
      <AppHeader
        variant="tab"
        layout="wide"
        wordmark
        title="Tổng quan"
        alignGroup="overview-header"
        tabs={
          <nav
            role="tablist"
            aria-label="Tổng quan"
            className="flex w-full overflow-x-auto border-b border-surface-dark [scrollbar-width:none] lg:w-auto lg:self-start lg:border-divider"
          >
            {TABS.map((tab) => {
              const isActive = tab.id === active;
              return (
                <Link
                  key={tab.id}
                  role="tab"
                  href={`${tab.href}${query}`}
                  aria-selected={isActive}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative inline-flex min-h-[44px] flex-1 shrink-0 items-center justify-center whitespace-nowrap px-2 text-[15px] font-bold no-underline transition-colors active:scale-[0.97] motion-reduce:active:scale-100 lg:flex-none lg:px-4 focus-visible:outline-sky lg:focus-visible:outline-blue ${
                    isActive ? "text-on-dark lg:text-text" : "text-muted-on-dark hover:text-on-dark lg:text-secondary lg:hover:text-text"
                  }`}
                >
                  {tab.label}
                  {isActive && <span aria-hidden="true" className="absolute inset-x-2 bottom-[-1px] h-[3px] rounded-full bg-sky lg:bg-blue" />}
                </Link>
              );
            })}
          </nav>
        }
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pt-4 pb-6 box-border lg:mx-0 lg:max-w-[1240px] lg:gap-5 lg:px-8 lg:pt-5 lg:pb-12">
        {/* The period control; Tóm tắt draws it itself, between the hero and the scoreboard */}
        {active !== "summary" && (
          <PeriodControl compact heading={period ? periodHeading(period) : ""} period={period} length={length} />
        )}

        {ctx ? <OverviewContext.Provider value={ctx}>{children}</OverviewContext.Provider> : <ContentSkeleton />}
      </main>
    </>
  );
}
