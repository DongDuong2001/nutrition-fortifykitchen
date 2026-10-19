"use client";

import { Expand } from "@/components/ui/expand";
import { scrollBehavior } from "@/lib/scroll-behavior";
import { getLevel, getLevelLabel } from "@/lib/levels";
import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/ui/bottom-nav";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";
import { AppHeader } from "@/components/ui/app-header";
import { LevelBar } from "@/components/ui/level-bar";
import { type NutrientGroup } from "@/lib/nutrients";
import { buildNutrientRows, type NutrientRowData } from "@/lib/nutrient-rows";
import { formatAmount, formatDayLabel, formatDesktopDate, formatNumber } from "@/lib/format";
import { goalName } from "@/lib/onboarding";
import { getTodayIsoVN } from "@/lib/date";
import { pastDayData, useDiary } from "@/lib/diary-store";
import { viewedIsoDate } from "@/lib/day-history";
import { markUsed } from "@/lib/onboarding-store";
import { HOME_ROUTE } from "@/lib/nav";

interface GroupConfig {
  key: NutrientGroup;
  title: string;
}

// Exactly in required order: Vitamin, Khoáng chất, Đạm, Chất béo, Tinh bột, Tổng quan
const GROUPS_CONFIG: GroupConfig[] = [
  { key: "vitamins", title: "Vitamin" },
  { key: "minerals", title: "Khoáng chất" },
  { key: "protein", title: "Đạm" },
  { key: "lipids", title: "Chất béo" },
  { key: "carbs", title: "Tinh bột" },
  { key: "general", title: "Tổng quan" },
];

/** The compact header bar, in px (design: 60). The chip bar sticks right under it. */
const COMPACT_BAR_HEIGHT = 60;

/**
 * The 60 px ink bar that replaces the full header once its summary has scrolled away: back, the screen name with
 * the date, and the live x/22 count. It hides (visibility) while the full header is showing, so it takes no
 * space and nothing moves; the full header is inert while the bar is shown, so there is one h1.
 */
function CompactBar({ show, backHref, date, achieved, total, className = "" }: { show: boolean; backHref: string; date: string; achieved: number; total: number; className?: string }) {
  return (
    <div className={`pointer-events-none sticky top-0 z-nav h-0 ${className}`}>
      <div
        data-micros-compact={show ? "shown" : "hidden"}
        aria-hidden={show ? undefined : true}
        className={`pointer-events-auto absolute inset-x-0 top-0 box-border flex h-[60px] items-center gap-2 rounded-b-sheet bg-ink px-4 text-on-dark ${show ? "visible" : "invisible"}`}
      >
        <Link
          href={backHref}
          aria-label="Quay lại"
          tabIndex={show ? 0 : -1}
          className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-dark no-underline hover:text-sky active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-sky"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          {show ? (
            <h1 className="m-0 font-display text-title-sm font-extrabold uppercase italic leading-none tracking-tight">Vi chất</h1>
          ) : (
            <p className="m-0 font-display text-title-sm font-extrabold uppercase italic leading-none tracking-tight">Vi chất</p>
          )}
          <p className="m-0 mt-0.5 break-words text-cap leading-none text-muted-subtitle">{date}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-title-sm font-black italic leading-none tabular-nums">
            {achieved}
            <span className="text-on-dark/55">/{total}</span>
          </div>
          <div className="mt-0.5 text-micro font-semibold leading-none text-sky">đã đạt</div>
        </div>
      </div>
    </div>
  );
}

export default function MicrosPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-page" />}>
      <MicrosContent />
    </Suspense>
  );
}

function MicrosContent() {
  const { data: diaryData, hydrated, profile, todayIso, isEditable, loadDays } = useDiary();
  const searchParams = useSearchParams();
  // ?date= picks a past day (read-only, as everything about a past day). Read after mount so the first render matches the server.
  const viewIso = hydrated && todayIso ? viewedIsoDate(searchParams?.get("date"), todayIso) : null;
  const isPast = viewIso !== null && viewIso !== todayIso;
  // S5: an older day is read from the server (cached on this device) when it is on screen
  useEffect(() => {
    if (isPast && viewIso) loadDays([viewIso]);
  }, [isPast, viewIso, loadDays]);
  const diaryHref = isPast && viewIso ? `${HOME_ROUTE}?date=${viewIso}` : HOME_ROUTE;
  const dateQuery = isPast && viewIso ? `?date=${viewIso}` : "";
  const pastData = useMemo(
    () => (isPast && viewIso && todayIso ? pastDayData(viewIso, todayIso, profile) : null),
    [isPast, viewIso, todayIso, profile]
  );
  const [activeGroup, setActiveGroup] = useState<NutrientGroup>("vitamins");
  const [openGroups, setOpenGroups] = useState<Record<NutrientGroup, boolean>>({
    vitamins: true,
    minerals: true,
    protein: true,
    lipids: true,
    carbs: true,
    general: true,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  // When the summary block scrolls out of view a compact 60 px bar takes its place (IntersectionObserver on a sentinel
  // at the bottom of the header, so the page never shifts). One flag per layout: the other layout is not displayed.
  const [compactPhone, setCompactPhone] = useState(false);
  const [compactDesktop, setCompactDesktop] = useState(false);
  const phoneSentinelRef = useRef<HTMLDivElement>(null);
  const desktopSentinelRef = useRef<HTMLDivElement>(null);
  const chipBarRef = useRef<HTMLDivElement>(null);
  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isManualScrolling = useRef(false);
  const manualTimeout = useRef<NodeJS.Timeout | null>(null);

  const [clientNow, setClientNow] = useState<Date | null>(null);

  useEffect(() => {
    setClientNow(new Date());
  }, []);

  // Today comes from the diary store, like the nutrient screen; no separate fetch (it could show the sample day)
  const isLoading = !hydrated;
  const currentData = pastData || (hydrated ? diaryData : null);
  const readOnlyNote = isPast && viewIso && !isEditable(viewIso) ? " · Chỉ xem" : "";
  const phoneDateLabel = (clientNow && currentData?.date ? formatDayLabel(currentData.date, clientNow) : "") + readOnlyNote;
  const profileParts = [goalName(profile.goal), `${formatNumber(profile.weightKg)} kg`];
  const desktopSubtitle = clientNow
    ? [formatDesktopDate(currentData?.date || getTodayIsoVN()) + readOnlyNote, ...profileParts].join(" · ") + ` · Thiếu nhiều nhất: ${currentData?.microsSummary.mostLacking.join(", ")}`
    : [currentData?.desktopDateLabel, ...profileParts].filter(Boolean).join(" · ") + ` · Thiếu nhiều nhất: ${currentData?.microsSummary.mostLacking.join(", ")}`;

  // Auto-scroll active chip into view horizontally so it always stays visible
  useEffect(() => {
    const activeChip = chipRefs.current[activeGroup];
    const container = chipsContainerRef.current;
    if (activeChip && container) {
      const chipLeft = activeChip.offsetLeft;
      const chipWidth = activeChip.offsetWidth;
      const containerWidth = container.clientWidth;
      const targetScroll = chipLeft - (containerWidth - chipWidth) / 2;
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: scrollBehavior() });
    }
  }, [activeGroup]);

  // Scroll-spy using IntersectionObserver on the group cards
  useEffect(() => {
    if (isLoading || !currentData) return;

    const groupKeys: NutrientGroup[] = ["vitamins", "minerals", "protein", "lipids", "carbs", "general"];
    const elements = groupKeys
      .map((key) => document.getElementById(`group-${key}`))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    // On the phone the groups scroll inside the body; on desktop the page scrolls
    const root = scrollRef.current && scrollRef.current.offsetParent !== null ? scrollRef.current : null;
    // The compact bar and the chip bar cover the top of the list; a group under them is not the one in view
    const covered = root ? COMPACT_BAR_HEIGHT + (chipBarRef.current?.offsetHeight ?? 0) : 0;
    const rootTop = (root ? root.getBoundingClientRect().top : 0) + covered;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrolling.current) return;

        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          visibleEntries.sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top - rootTop) -
              Math.abs(b.boundingClientRect.top - rootTop)
          );
          const topEntry = visibleEntries[0];
          const key = topEntry.target.id.replace("group-", "") as NutrientGroup;
          if (groupKeys.includes(key)) {
            setActiveGroup(key);
          }
        }
      },
      {
        root,
        rootMargin: `-${covered}px 0px -55% 0px`,
        threshold: [0, 0.1, 0.3, 0.6],
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [isLoading, currentData]);

  // Compact bar: shows when the bottom of the full header passes under the bar's own 60 px
  useEffect(() => {
    if (isLoading || !currentData) return;
    const watch = (el: HTMLElement | null, root: Element | null, set: (v: boolean) => void) => {
      if (!el) return null;
      const io = new IntersectionObserver(
        ([entry]) => set(!entry.isIntersecting && entry.boundingClientRect.top < COMPACT_BAR_HEIGHT),
        { root, rootMargin: `-${COMPACT_BAR_HEIGHT}px 0px 0px 0px`, threshold: 0 }
      );
      io.observe(el);
      return io;
    };
    const phone = watch(phoneSentinelRef.current, scrollRef.current, setCompactPhone);
    const desktop = watch(desktopSentinelRef.current, null, setCompactDesktop);
    return () => {
      phone?.disconnect();
      desktop?.disconnect();
    };
  }, [isLoading, currentData]);

  const toggleGroup = (group: NutrientGroup) => {
    setOpenGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const scrollToGroup = (group: NutrientGroup) => {
    markUsed("micros-filter");
    setActiveGroup(group);
    // Ensure the group is opened when jumped to
    setOpenGroups((prev) => ({
      ...prev,
      [group]: true,
    }));
    isManualScrolling.current = true;
    if (manualTimeout.current) clearTimeout(manualTimeout.current);
    manualTimeout.current = setTimeout(() => {
      isManualScrolling.current = false;
    }, 800);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
    if (window.innerWidth >= 1024) {
      document.getElementById(`desktop-group-${group}`)?.scrollIntoView({ behavior, block: "start" });
      return;
    }
    // Phone: only the list scrolls. scrollIntoView would also move the header and chip bar.
    const list = scrollRef.current;
    const el = document.getElementById(`group-${group}`);
    if (!list || !el) return;
    const covered = COMPACT_BAR_HEIGHT + (chipBarRef.current?.offsetHeight ?? 0);
    const top = el.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop - covered - 8;
    list.scrollTo({ top, behavior });
  };

  const rowsByGroup = useMemo(() => buildNutrientRows(currentData), [currentData]);

  // Summary counts: 8/22 vi chất đạt (strictly vitamins + minerals with a target)
  const achievedMicrosCount = useMemo(() => {
    if (!currentData) return { achieved: 0, total: 22 };
    const allMicros = [...rowsByGroup.vitamins, ...rowsByGroup.minerals];
    const withTarget = allMicros.filter((m) => m.targetSource !== "none" && m.targetMin !== null);
    const achieved = withTarget.filter((m) => (m.percentage ?? 0) >= 100).length;
    return {
      achieved,
      total: withTarget.length,
    };
  }, [currentData, rowsByGroup]);

  // Group chip counts (e.g. Vitamin · 3/12, Khoáng chất · 5/10)
  const chipLabels = useMemo(() => {
    const vWithTarget = rowsByGroup.vitamins.filter((m) => m.targetSource !== "none" && m.targetMin !== null);
    const vAchieved = vWithTarget.filter((m) => (m.percentage ?? 0) >= 100).length;

    const mWithTarget = rowsByGroup.minerals.filter((m) => m.targetSource !== "none" && m.targetMin !== null);
    const mAchieved = mWithTarget.filter((m) => (m.percentage ?? 0) >= 100).length;

    return {
      vitamins: `Vitamin · ${vAchieved}/${vWithTarget.length}`,
      minerals: `Khoáng chất · ${mAchieved}/${mWithTarget.length}`,
      protein: "Đạm",
      lipids: "Chất béo",
      carbs: "Tinh bột",
      general: "Tổng quan",
    };
  }, [rowsByGroup]);

  const isEmpty = !isLoading && currentData && currentData.meals.every((m) => m.items.length === 0);

  // 1. SKELETON LOADING STATE
  if (isLoading && !currentData) {
    return (
      <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col pb-[88px] lg:pb-0">
        <h1 className="sr-only">Vi chất — Đang tải</h1>
        <div className="bg-ink text-on-dark rounded-b-sheet">
          <div className="w-full max-w-[560px] mx-auto px-4 pt-3 pb-5 flex flex-col gap-3">
            <div className="flex items-center justify-between min-h-11">
              <div className="w-11 h-11 bg-surface-dark rounded-lg motion-safe:animate-pulse" />
              <div className="h-4 w-28 bg-surface-dark rounded-lg motion-safe:animate-pulse" />
              <div className="w-11 h-11 bg-surface-dark rounded-lg motion-safe:animate-pulse" />
            </div>
            <div className="flex items-end justify-between pt-1">
              <div className="flex flex-col gap-2">
                <div className="h-7 w-28 bg-surface-dark rounded motion-safe:animate-pulse" />
                <div className="h-3.5 w-44 bg-surface-dark rounded motion-safe:animate-pulse" />
              </div>
              <div className="h-9 w-16 bg-surface-dark rounded motion-safe:animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex-1 w-full max-w-[560px] mx-auto px-4 py-4 flex flex-col gap-4">
          <div className="h-9 w-full bg-level-empty rounded-full motion-safe:animate-pulse" />
          <div className="h-14 w-full bg-level-empty rounded-xl motion-safe:animate-pulse" />
          <div className="bg-card border border-card-border rounded-card p-4 flex flex-col gap-3 motion-safe:animate-pulse">
            <div className="h-4 w-1/3 bg-level-empty rounded" />
            <div className="h-8 w-full bg-level-empty rounded" />
            <div className="h-8 w-full bg-level-empty rounded" />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-nav bg-ink lg:hidden">
          <BottomNav />
        </div>
      </div>
    );
  }

  // 2. EMPTY STATE ("Chưa ghi món nào hôm nay")
  if (isEmpty) {
    return (
      <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col lg:flex-row">
        <DesktopSidebar />

        <div className="flex min-w-0 flex-1 flex-col pb-[88px] lg:pb-0">
          <AppHeader
            variant="sub"
            title="Vi chất"
            subtitle={phoneDateLabel}
            backHref={diaryHref}
            className="lg:hidden"
            alignGroup="micros-header"
            summary={
              <div className="flex items-end justify-between pt-1">
                <div className="text-cap text-muted-subtitle">
                  Thêm món để xem vi chất
                </div>
                <div className="text-right">
                  <div className="font-display italic font-black text-3xl leading-none tabular-nums text-on-dark">
                    0<span className="text-muted-subtitle text-xl">/22</span>
                  </div>
                  <div className="text-xs text-sky font-medium mt-0.5">đã đạt</div>
                </div>
              </div>
            }
          />
          <div className="hidden p-8 pb-0 lg:block">
            <AppHeader variant="daily" title="Vi chất" subtitle={desktopSubtitle} flush backHref={diaryHref} />
          </div>

          <main className="flex-1 w-full max-w-[560px] mx-auto px-4 py-6 flex flex-col gap-4">
            <div className="bg-card border border-card-border rounded-card lg:shadow-card p-6 text-center flex flex-col items-center gap-3">
              <h2 className="m-0 text-base font-bold">{isPast ? "Chưa có món ngày này" : "Chưa có món hôm nay"}</h2>
              <p className="m-0 text-sm text-secondary leading-relaxed max-w-[320px]">
                Thêm món vào nhật ký để theo dõi 22 vi chất mỗi ngày.
              </p>
              <Link
                href={diaryHref}
                className="mt-2 h-11 px-6 rounded-full bg-cobalt text-on-accent flex items-center justify-center text-sm font-bold no-underline active:scale-[0.97] transition-press"
              >
                {isPast ? "Về Hôm nay" : "+ Thêm món"}
              </Link>
            </div>
          </main>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-nav bg-ink lg:hidden">
          <BottomNav />
        </div>
      </div>
    );
  }
  // 3. ACTIVE REPORT SCREEN (Mobile & Desktop)
  return (
    <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col">
      {/* ============================================================== */}
      {/* MOBILE / TABLET LAYOUT (<1024px)                               */}
      {/* ============================================================== */}
      <div
        data-align-container="micros-page"
        className="w-full max-w-full min-w-0 h-dvh overflow-clip bg-page flex flex-col relative lg:hidden"
      >
        {/* One scrolling body: the full header scrolls away, the compact bar and the chips stay at the top */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[88px] [--micros-sticky:121px]"
        >
          <CompactBar
            show={compactPhone}
            backHref={diaryHref}
            date={phoneDateLabel}
            achieved={achievedMicrosCount.achieved}
            total={achievedMicrosCount.total}
          />
          <div inert={compactPhone || undefined} aria-hidden={compactPhone || undefined}>
            <AppHeader
              variant="sub"
              title="Vi chất"
              subtitle={phoneDateLabel}
              backHref={diaryHref}
              alignGroup="micros-header"
              summary={
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-subtitle font-medium">Thiếu nhiều nhất</div>
                    <div className="text-sm font-semibold text-on-dark mt-0.5">
                      {currentData?.microsSummary.mostLacking.join(", ")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display italic font-black text-headline leading-none tabular-nums">
                      <span className="text-on-dark">{achievedMicrosCount.achieved}</span>
                      <span className="text-on-dark/55">/{achievedMicrosCount.total}</span>
                    </div>
                    <div className="text-xs text-sky font-semibold mt-1">đã đạt mục tiêu</div>
                  </div>
                </div>
              }
              footer={
                <Link
                  href="/trends/micros"
                  className="min-h-11 flex items-center justify-between text-sm font-semibold text-sky no-underline active:scale-[0.97] transition-press"
                >
                  Xu hướng 7 và 30 ngày
                  <span aria-hidden="true">›</span>
                </Link>
              }
            />
          </div>
          <div ref={phoneSentinelRef} aria-hidden="true" className="h-0" />

          {/* Sticky Horizontally Scrolling Group Chips, right under the compact bar */}
          <div
            ref={chipBarRef}
            className="sticky top-[60px] z-30 w-full min-w-0 max-w-full bg-page border-b border-card-border"
          >
            <div
              ref={chipsContainerRef}
              data-tour="micros-groups"
              className="w-full max-w-[560px] mx-auto px-4 py-2 overflow-x-auto scrollbar-none flex items-center gap-2"
            >
              {GROUPS_CONFIG.map((group) => {
                const isActive = activeGroup === group.key;
                return (
                  <button
                    key={group.key}
                    ref={(el) => {
                      chipRefs.current[group.key] = el;
                    }}
                    type="button"
                    onClick={() => scrollToGroup(group.key)}
                    aria-pressed={isActive}
                    className={`min-h-11 flex items-center shrink-0 cursor-pointer bg-transparent border-0 p-0 active:scale-[0.97] transition-press`}
                  >
                    <span
                      className={`h-9 px-4 rounded-full text-xs font-semibold flex items-center justify-center whitespace-nowrap transition-press ${
                        isActive
                          ? "bg-ink text-on-dark shadow-xs"
                          : "bg-surface text-text border border-card-border hover:bg-paper-dark"
                      }`}
                    >
                      {chipLabels[group.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <main className="w-full max-w-[560px] mx-auto px-4 pt-4 pb-6 flex flex-col gap-4 min-w-0">
            {/* 4-column equal grid Legend */}
            <Legend />

            {/* Groups in required order */}
            <div className="flex flex-col gap-4">
              {GROUPS_CONFIG.map((group, idx) => (
                <GroupCard
                  dateQuery={dateQuery}
                  key={group.key}
                  group={group}
                  rows={rowsByGroup[group.key]}
                  isOpen={openGroups[group.key]}
                  onToggle={() => toggleGroup(group.key)}
                  alignGroup={idx === 0 ? "micros-header" : undefined}
                />
              ))}
            </div>

            {/* Footnote */}
            <footer className="pt-2 pb-1 text-xs text-secondary leading-relaxed">
              * Mục tiêu theo cân nặng, giới tính và ngày tập · tham khảo khuyến nghị cho người Việt Nam (2016).
            </footer>
          </main>
        </div>

        {/* Fixed Mobile Dock */}
        <div className="fixed bottom-0 left-0 right-0 z-nav bg-ink">
          <BottomNav />
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP LAYOUT (≥1024px) — 2 Columns (Cronometer style)        */}
      {/* ============================================================== */}
      <div className="hidden lg:flex min-h-[980px] bg-page text-text font-sans">
        {/* Left Sidebar */}
        <DesktopSidebar />

        {/* Main Content Area */}
        <main data-align-container="micros-desktop" className="relative flex-1 p-8 pb-12 max-w-[1240px] flex flex-col gap-5 box-border [--micros-sticky:108px]">
          {/* The compact bar spans the column (the 32 px padding either side) and takes no room */}
          <CompactBar
            className="-mx-8 -mb-5"
            show={compactDesktop}
            backHref={diaryHref}
            date={phoneDateLabel}
            achieved={achievedMicrosCount.achieved}
            total={achievedMicrosCount.total}
          />
          {/* Header */}
          <div inert={compactDesktop || undefined} aria-hidden={compactDesktop || undefined}>
          <AppHeader
            variant="daily"
            title="Vi chất"
            flush
            backHref={diaryHref}
            alignGroup="micros-header"
            subtitle={desktopSubtitle}
            desktopStat={
              <div className="flex items-baseline gap-2 mr-2">
                <div className="font-display italic font-black text-display leading-none tabular-nums">
                  <span className="text-cobalt">{achievedMicrosCount.achieved}</span>
                  <span className="text-secondary">/{achievedMicrosCount.total}</span>
                </div>
                <span className="text-sm text-secondary font-semibold">vi chất đạt</span>
                <Link href="/trends/micros" className="ml-2 min-h-11 inline-flex items-center text-sm font-semibold text-cobalt no-underline">
                  Xu hướng ›
                </Link>
              </div>
            }
            canGoNext={false}
          />
          </div>
          <div ref={desktopSentinelRef} aria-hidden="true" className="-mt-5 h-0" />

          {/* Desktop Filter Chips */}
          <div data-tour="micros-groups" className="sticky top-[60px] z-30 flex items-center gap-2 overflow-x-auto bg-page pb-1">
            {GROUPS_CONFIG.map((group) => {
              const isActive = activeGroup === group.key;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => scrollToGroup(group.key)}
                  aria-pressed={isActive}
                  className={`min-h-11 flex items-center shrink-0 cursor-pointer bg-transparent border-0 p-0 active:scale-[0.97] transition-press`}
                >
                  <span
                    className={`h-9 px-4 rounded-full text-xs font-semibold flex items-center justify-center transition-press ${
                      isActive
                        ? "bg-ink text-on-dark shadow-xs"
                        : "bg-surface text-text border border-card-border hover:bg-paper-dark"
                    }`}
                  >
                    {chipLabels[group.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 4-column Legend */}
          <Legend />

          {/* Balanced Columns-2 Layout: Vitamin, Khoáng chất, Đạm, Chất béo, Tinh bột, Tổng quan */}
          <div className="columns-2 gap-4 [column-fill:_balance]">
            {GROUPS_CONFIG.map((group, idx) => (
              <div key={group.key} className="break-inside-avoid mb-4">
                <GroupCard
                  dateQuery={dateQuery}
                  group={group}
                  rows={rowsByGroup[group.key]}
                  isOpen={openGroups[group.key]}
                  onToggle={() => toggleGroup(group.key)}
                  idPrefix="desktop-group-"
                  alignGroup={idx === 0 ? "micros-header" : undefined}
                />
              </div>
            ))}
          </div>

          <footer className="pt-2 text-xs text-secondary leading-relaxed">
            * Mục tiêu theo cân nặng, giới tính và ngày tập · tham khảo khuyến nghị cho người Việt Nam (2016).
          </footer>
        </main>
      </div>
    </div>
  );
}

/**
 * Legend: a 4-column equal grid on the phone, start-aligned like the chips above it from 1024 px:
 * Thiếu <50%, Trung bình 50–79%, Gần đủ 80–99%, Đạt ≥100%
 */
function Legend() {
  const tiers = [
    { name: "Thiếu", range: "<50%", colorClass: "bg-level-red" },
    { name: "Trung bình", range: "50–79%", colorClass: "bg-level-yellow" },
    { name: "Gần đủ", range: "80–99%", colorClass: "bg-level-green" },
    { name: "Đạt", range: "≥100%", colorClass: "bg-level-blue" },
  ];

  return (
    <div
      aria-label="Chú thích màu sắc vi chất"
      className="grid grid-cols-4 gap-2 w-full max-w-[560px] mx-auto py-1 px-1 lg:flex lg:gap-6 lg:max-w-none lg:mx-0 lg:px-0"
    >
      {tiers.map((t) => (
        <div key={t.name} className="flex flex-col items-center text-center gap-0.5 min-w-0 lg:items-start lg:text-left">
          <div className="flex items-center justify-center gap-1.5 min-w-0">
            <span
              aria-hidden="true"
              className={`h-[9px] w-[9px] rounded-[3px] ${t.colorClass} inline-block shrink-0`}
            />
            <span className="text-xs font-semibold text-text truncate">{t.name}</span>
          </div>
          <span className="text-micro text-secondary tabular-nums truncate text-center lg:text-left">
            {t.range}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Group Card component with sticky header and collapsible list
 */
function GroupCard({
  group,
  rows,
  isOpen,
  onToggle,
  idPrefix = "group-",
  alignGroup,
  dateQuery = "",
}: {
  group: GroupConfig;
  rows: NutrientRowData[];
  isOpen: boolean;
  onToggle: () => void;
  idPrefix?: string;
  alignGroup?: string;
  dateQuery?: string;
}) {
  return (
    <section
      id={`${idPrefix}${group.key}`}
      data-align-group={alignGroup}
      data-align-edge={alignGroup && idPrefix.includes("desktop") ? "left" : undefined}
      className="bg-card border border-card-border rounded-card lg:shadow-card overflow-clip flex flex-col scroll-mt-2 lg:scroll-mt-6 break-inside-avoid"
    >
      {/* Sticky group header: sticks to the top of the scrolling body */}
      <div className="sticky top-[var(--micros-sticky,0px)] z-sticky bg-card border-b border-card-border">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="w-full min-h-12 px-4 py-3 flex items-center justify-between text-left cursor-pointer bg-transparent border-0 m-tint transition-transform"
        >
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span data-align-group="micros-card" data-align-edge="left" className="font-bold text-base text-text">{group.title}</span>
              <span className="text-xs text-secondary font-sans tabular-nums">({rows.length})</span>
            </div>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="m-chevron text-secondary"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </button>
      </div>

      {/* Rows */}
      <Expand open={isOpen} className="px-4 py-1 divide-y divide-divider">
        {rows.map((row) => (
          <NutrientRow key={row.definition.id} row={row} dateQuery={dateQuery} />
        ))}
      </Expand>
    </section>
  );
}

/**
 * Individual nutrient row:
 * Line 1: name | amount / target · % (bold)
 * Line 2: slanted bar directly under it (only for nutrients with target)
 */
function NutrientRow({ row, dateQuery = "" }: { row: NutrientRowData; dateQuery?: string }) {
  const { definition, consumed, targetMin, targetMax, percentage, formattedAmount, targetSource, isProvisional } = row;
  const hasTarget = targetSource !== "none";
  const indentPx = definition.depth * 16;

  // Format amount / target (e.g. "331 / 1.200 mg" or "2.900 / 2.750–4.130 mg")
  let targetDisplay = "";
  if (hasTarget && targetMin !== null) {
    if (targetMax && targetMax !== targetMin) {
      targetDisplay = `${formatAmount(targetMin, definition.unit)}–${formatAmount(targetMax, definition.unit)} ${definition.unit}`;
    } else {
      targetDisplay = `${formatAmount(targetMin, definition.unit)} ${definition.unit}`;
    }
  }

  const content = (
    <div
      style={{ paddingLeft: `${indentPx}px` }}
      className="min-h-11 py-2 flex flex-col justify-center gap-1.5 w-full"
    >
      {/* Line 1: Name (* tham khảo) | amount / target · % (bold) */}
      <div className="flex items-baseline justify-between text-sm leading-tight gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <span
            {...(definition.depth === 0 ? { "data-align-group": "micros-card", "data-align-edge": "left" } : {})}
            className="font-semibold text-text truncate"
          >
            {definition.name}
          </span>
          {isProvisional && (
            <sup
              aria-label="giá trị tham khảo"
              className="text-secondary text-micro font-bold select-none leading-none shrink-0"
            >
              *
            </sup>
          )}
        </div>

        {/* Right side: amount [/ target] [· %] */}
        <div className="shrink-0 text-right flex items-baseline gap-1.5">
          {consumed === null ? (
            <>
              <span className="sr-only">chưa có dữ liệu</span>
              <span aria-hidden="true" className="text-secondary/60 tabular-nums text-xs">
                —
              </span>
            </>
          ) : hasTarget && targetDisplay ? (
            <>
              <span className="tabular-nums text-xs text-secondary">
                {formatAmount(consumed, definition.unit)} / {targetDisplay}
              </span>
              <span className="font-bold text-text tabular-nums text-xs">
                · {percentage !== null ? `${percentage}%` : "—"}
              </span>
            </>
          ) : (
            <span className="tabular-nums text-xs text-secondary font-medium">
              {formattedAmount}
            </span>
          )}
        </div>
      </div>

      {/* Line 2: the level bar directly under it */}
      {hasTarget && (
        <div className="w-full">
          <LevelBar
            pct={percentage}
            label={`${definition.name} ${percentage !== null ? `${percentage}%, ${getLevelLabel(getLevel(percentage))}` : "chưa có dữ liệu"}`}
            heightClass="h-[9px] lg:h-[10px]"
          />
        </div>
      )}
    </div>
  );

  return (
    <Link
      href={`/micros/${definition.id}${dateQuery}`}
      className="no-underline text-inherit block hover:bg-surface/50 m-tint transition-press -mx-2 px-2 rounded-lg"
    >
      {content}
    </Link>
  );
}
