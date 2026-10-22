"use client";

import React, { Suspense, createContext, startTransition, useContext, useEffect, useMemo, useOptimistic } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Period } from "@/lib/period";
import { markUsed } from "@/lib/onboarding-store";
import { AppHeader } from "@/components/ui/app-header";
import { Segmented } from "@/components/ui/segmented";
import { EnterGlide } from "@/components/ui/enter-glide";
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
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-text cursor-pointer hover:bg-divider active:scale-[0.97] transition-press motion-reduce:active:scale-100 disabled:cursor-default disabled:opacity-45";
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
    <div data-tour="trends-range" className="shrink-0">
      <Segmented<"7" | "30">
        label="Độ dài kỳ"
        fill={false}
        items={([7, 30] as const).map((n) => ({
          key: String(n) as "7" | "30",
          label: compact ? String(n) : `${n} ngày`,
          srSuffix: compact ? " ngày" : undefined,
        }))}
        value={String(length) as "7" | "30"}
        onChange={(key) => {
          markUsed("range-toggle");
          go(Number(key) as PeriodLength, 0);
        }}
      />
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center">
          {prev}
          <p id="ov-period" className="m-0 min-w-0 text-center text-cap font-semibold leading-snug text-secondary">
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
      <p className="m-0 text-callout font-bold lg:text-lg">{label}</p>
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
        <div key={i} className="bg-card rounded-card border border-transparent shadow-ring p-4 flex flex-col gap-3 motion-safe:animate-pulse">
          <div className="h-3 w-2/5 rounded bg-level-empty" />
          <div className="h-3 w-[70%] rounded bg-level-empty" />
          <div className="h-3 w-[55%] rounded bg-level-empty" />
        </div>
      ))}
    </div>
  );
}

/**
 * The frame of the four Tổng quan sub-tabs (app/(app)/(tabs)/trends/layout.tsx, so it stays mounted while the content swaps): the 34 px large title "Tổng quan" on the page (V3, no ink band), the sub-tab Segmented
 * (a nav of links) under it, and the period control shared by all four. The period is in the URL (?p=7|30 and ?o=offset), so the sub-tab links carry it.
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
  const current = overviewTabOf(usePathname() ?? "");
  // cc-58: the tapped sub-tab lights up on the tap, not when its content is ready
  const [active, setActive] = useOptimistic(current);
  const { todayIso, data, targets, loadDays, dayArchive } = useDiary();

  const { length, offset } = parsePeriodParams(searchParams?.get("p"), searchParams?.get("o"));
  const query = periodQuery(length, offset);

  // dayArchive: days read from the server (S5) change what the period's totals are made of
  const overview = useMemo(
    () => (todayIso ? buildOverview({ todayIso, today: data, targets, length, offset }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayIso, data, targets, length, offset, dayArchive]
  );
  // The days of the period are read from the server (and cached on this device) when the period is shown
  useEffect(() => {
    if (overview) loadDays([...overview.period.days, ...overview.previous.days]);
  }, [overview?.period.start, overview?.period.end, loadDays]); // eslint-disable-line react-hooks/exhaustive-deps

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
        title="Tổng quan"
        alignGroup="overview-header"
        tabs={
          <Segmented<OverviewTab>
            as="nav"
            label="Tổng quan"
            alignGroup="overview-tabs"
            nowrap
            className="lg:max-w-[480px]"
            items={TABS.map((tab) => ({ key: tab.id, label: tab.label, href: `${tab.href}${query}` }))}
            value={active}
            onChange={(id) => startTransition(() => setActive(id))}
          />
        }
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pt-0 pb-6 box-border lg:mx-0 lg:max-w-[1240px] lg:gap-5 lg:px-8 lg:pt-5 lg:pb-12">
        {/* The period control; Tóm tắt draws it itself, between the hero and the scoreboard */}
        {active !== "summary" && (
          <PeriodControl compact heading={period ? periodHeading(period) : ""} period={period} length={length} />
        )}

        {/* feat/glide: a sub-tab change glides in (keyed on the committed tab, not the optimistic one, so the old content never plays it) */}
        <EnterGlide id={current} order={TABS.findIndex((t) => t.id === current)} className="flex flex-col gap-3 lg:gap-5">
          {ctx ? <OverviewContext.Provider value={ctx}>{children}</OverviewContext.Provider> : <ContentSkeleton />}
        </EnterGlide>
      </main>
    </>
  );
}
