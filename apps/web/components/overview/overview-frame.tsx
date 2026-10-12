"use client";

import React, { Suspense, createContext, useContext, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { useDiary } from "@/lib/diary-store";
import type { MockDayData } from "@/lib/mock/sample-day";
import { buildOverview, type Overview } from "@/lib/overview";
import { parsePeriodParams, periodQuery, type PeriodLength } from "@/lib/period";
import type { CompleteTargets } from "@/lib/targets";

export type OverviewTab = "summary" | "energy" | "micros" | "body";

const TABS: { id: OverviewTab; href: string; label: string }[] = [
  { id: "summary", href: "/", label: "Tóm tắt" },
  { id: "energy", href: "/trends", label: "Năng lượng" },
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

function ContentSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">Đang tải…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3 motion-safe:animate-pulse">
          <div className="h-3 w-2/5 rounded bg-level-empty" />
          <div className="h-3 w-[70%] rounded bg-level-empty" />
          <div className="h-3 w-[55%] rounded bg-level-empty" />
        </div>
      ))}
    </div>
  );
}

/**
 * The frame of the four Tổng quan sub-tabs: the phone's ink band with the wordmark (the h1 "Tổng quan" is
 * sr-only there), the sub-tab bar (a tablist of links; on desktop it sits in the title row), and the period
 * control shared by all four. The period is in the URL (?p=7|30 and ?o=offset), so the sub-tab links carry it.
 */
export function OverviewFrame({ active, children }: { active: OverviewTab; children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="w-full px-4 pt-6">
            <ContentSkeleton />
          </div>
        </AppShell>
      }
    >
      <FrameInner active={active}>{children}</FrameInner>
    </Suspense>
  );
}

function FrameInner({ active, children }: { active: OverviewTab; children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { todayIso, data, targets } = useDiary();

  const { length, offset } = parsePeriodParams(searchParams?.get("p"), searchParams?.get("o"));
  const query = periodQuery(length, offset);

  const overview = useMemo(
    () => (todayIso ? buildOverview({ todayIso, today: data, targets, length, offset }) : null),
    [todayIso, data, targets, length, offset]
  );

  const go = (nextLength: PeriodLength, nextOffset: number) =>
    router.replace(`${pathname}${periodQuery(nextLength, nextOffset)}`, { scroll: false });

  const ctx: OverviewContextValue | null =
    overview && todayIso
      ? { overview, todayIso, today: data, targets, hrefWithPeriod: (path) => `${path}${query}` }
      : null;
  const period = overview?.period;

  return (
    <AppShell alignContainer="overview-page">
      {/* Phone: the ink band carries the wordmark; the screen's name is the sr-only h1 (IA v2 Headers) */}
      <header className="w-full flex-none bg-ink text-on-dark select-none lg:hidden">
        <div className="mx-auto flex min-h-[44px] w-full max-w-[560px] items-center px-4 pt-3 pb-4 box-border">
          <div aria-hidden="true" className="font-display italic font-black text-xl uppercase tracking-tight">
            H1T <span className="text-sky">MICRO</span>
          </div>
          <h1 className="sr-only">Tổng quan</h1>
        </div>
      </header>

      {/* Title row (desktop) and sub-tab bar. One nav: under the band on a phone, in the title row on desktop. */}
      <div className="flex w-full flex-col bg-page lg:max-w-[1240px] lg:flex-row lg:items-end lg:justify-between lg:gap-4 lg:px-8 lg:pt-8 box-border">
        <h1 className="m-0 hidden font-display italic font-extrabold text-[32px] leading-tight uppercase tracking-tight text-text lg:block">
          Tổng quan
        </h1>
        <nav
          role="tablist"
          aria-label="Tổng quan"
          className="mx-auto flex w-full max-w-[560px] overflow-x-auto border-b border-divider [scrollbar-width:none] lg:mx-0 lg:w-auto lg:max-w-none lg:border-b-0"
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
                className={`relative inline-flex min-h-[44px] flex-1 shrink-0 items-center justify-center whitespace-nowrap px-2 text-sm font-bold no-underline transition-colors active:scale-[0.97] motion-reduce:active:scale-100 lg:flex-none lg:px-3.5 lg:text-base ${
                  isActive ? "text-text" : "text-secondary hover:text-text"
                }`}
              >
                {tab.label}
                {isActive && <span aria-hidden="true" className="absolute inset-x-2 bottom-[-1px] h-[3px] bg-blue lg:bottom-0" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pt-4 pb-6 box-border lg:mx-0 lg:max-w-[1240px] lg:gap-5 lg:px-8 lg:pt-5 lg:pb-12">
        {/* The period control, shared by every sub-tab */}
        <div className="flex flex-col gap-1">
          <p className="m-0 text-[15px] font-bold lg:text-lg">
            Trung bình mỗi ngày{period ? ` · ${period.label}` : ""}
          </p>
          <div className="flex items-center justify-between gap-2 lg:justify-start lg:gap-4">
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Kỳ trước"
                disabled={!period}
                onClick={() => period && go(length, period.offset + 1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent text-text cursor-pointer hover:bg-divider active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-default disabled:opacity-45"
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                aria-label="Kỳ sau"
                disabled={!period || period.isCurrent}
                onClick={() => period && go(length, period.offset - 1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent text-text cursor-pointer hover:bg-divider active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-default disabled:opacity-45"
              >
                <ChevronIcon direction="right" />
              </button>
            </div>
            <div role="group" aria-label="Độ dài kỳ" className="inline-flex rounded-full border border-card-border bg-card p-0.5">
              {([7, 30] as const).map((n) => {
                const isActive = n === length;
                return (
                  <Link
                    key={n}
                    href={`${pathname}${periodQuery(n, 0)}`}
                    replace
                    scroll={false}
                    aria-current={isActive ? "true" : "false"}
                    className={`inline-flex min-h-[44px] items-center rounded-full px-3.5 text-sm font-bold no-underline transition-colors active:scale-[0.97] motion-reduce:active:scale-100 ${
                      isActive ? "bg-ink text-on-dark" : "text-secondary hover:text-text"
                    }`}
                  >
                    {n} ngày
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {ctx ? <OverviewContext.Provider value={ctx}>{children}</OverviewContext.Provider> : <ContentSkeleton />}
      </main>
    </AppShell>
  );
}
