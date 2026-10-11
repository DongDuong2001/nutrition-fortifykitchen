"use client";

import React, { useState, useEffect, useSyncExternalStore, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/ui/bottom-nav";
import { AppHeader } from "@/components/ui/app-header";
import { CalorieDial } from "@/components/ui/calorie-dial";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { apiClient } from "@/lib/api-client";
import { formatAmount, formatDayLabel } from "@/lib/format";
import { SAMPLE_DAY, type MockDayData } from "@/lib/mock/sample-day";
import { useDiary } from "@/lib/diary-store";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

export default function TodayPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-page" />}>
      <TodayContent />
    </Suspense>
  );
}

function TodayContent() {
  const searchParams = useSearchParams();
  const forceEmpty = searchParams?.get("empty") === "1";
  const forceLoading = searchParams?.get("loading") === "1";
  const forceOffline = searchParams?.get("offline") === "1";

  const { data: diaryData, toast, highlightedMeal, setHighlightedMeal, hydrated } = useDiary();

  const [data, setData] = useState<MockDayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopySheetOpen, setIsCopySheetOpen] = useState(false);
  const [clientNow, setClientNow] = useState<Date | null>(null);
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);

  useEffect(() => {
    setClientNow(new Date());
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiClient.getTodayData().then((res) => {
      if (isMounted) {
        setData(res);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const returnId = sessionStorage.getItem("return_focus_id");
    if (returnId) {
      sessionStorage.removeItem("return_focus_id");
      requestAnimationFrame(() => {
        const el = document.getElementById(returnId);
        if (el) {
          el.focus();
        }
      });
    }
  }, []);

  const handleSaveOpener = (openerId: string) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("last_add_opener_id", openerId);
    }
  };

  const showLoading = forceLoading || (isLoading && !diaryData && !data);
  const showOfflineBanner = forceOffline || !isOnline;
  const currentData = (hydrated ? diaryData : null) || data || SAMPLE_DAY;
  const dateLabel = clientNow ? formatDayLabel(currentData.date, clientNow) : currentData.dateLabel;
  const isEmpty = forceEmpty || (!showLoading && currentData.meals.every((m) => m.items.length === 0));

  // --- 1. SKELETON LOADING STATE (TodayStates.dc.html) ---
  if (showLoading) {
    return (
      <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col">
        {/* Mobile Viewport Container */}
        <div className="w-full min-h-screen bg-page flex flex-col relative lg:hidden pb-[88px] overflow-x-hidden">
          <h1 className="sr-only">Hôm nay — Đang tải</h1>
          {/* Header Skeleton */}
          <div className="bg-ink text-white rounded-b-[20px]">
            <div className="w-full max-w-[560px] mx-auto px-4 pt-3 pb-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between min-h-[44px]">
                <div className="font-display italic font-black text-xl uppercase tracking-tight">
                  H1T <span className="text-sky">MICRO</span>
                </div>
                <div className="w-[110px] h-4 rounded-lg bg-surface-dark animate-pulse" />
              </div>
              <div className="flex gap-4.5 items-center">
                <div className="w-[100px] h-[100px] shrink-0 rounded-full border-[10px] border-level-empty-dark animate-pulse" />
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                  <div className="h-3.5 w-full rounded-md bg-surface-dark animate-pulse" />
                  <div className="h-3.5 w-4/5 rounded-md bg-surface-dark animate-pulse" />
                  <div className="h-3.5 w-[90%] rounded-md bg-surface-dark animate-pulse" />
                  <div className="h-3.5 w-3/5 rounded-md bg-surface-dark animate-pulse" />
                </div>
              </div>
              <div className="h-3.5 w-[70%] rounded-md bg-surface-dark animate-pulse mt-1" />
            </div>
          </div>

          {/* Body Skeleton */}
          <main role="status" aria-busy="true" className="flex-1 w-full max-w-[560px] mx-auto px-4 pt-3.5 pb-6 flex flex-col gap-2.5">
            <span className="sr-only">Đang tải…</span>
            <div className="bg-card border border-card-border rounded-[18px] p-3.5 flex flex-col gap-3 animate-pulse">
              <div className="h-3 w-2/5 rounded bg-level-empty" />
              <div className="h-3 w-[70%] rounded bg-level-empty" />
              <div className="h-3 w-[55%] rounded bg-level-empty" />
            </div>
            <div className="bg-card border border-card-border rounded-[18px] p-3.5 flex flex-col gap-3 animate-pulse">
              <div className="h-3 w-2/5 rounded bg-level-empty" />
              <div className="h-3 w-[70%] rounded bg-level-empty" />
              <div className="h-3 w-[55%] rounded bg-level-empty" />
            </div>
            <div className="bg-card border border-card-border rounded-[18px] p-3.5 flex flex-col gap-3 animate-pulse">
              <div className="h-3 w-2/5 rounded bg-level-empty" />
              <div className="h-3 w-[70%] rounded bg-level-empty" />
              <div className="h-3 w-[55%] rounded bg-level-empty" />
            </div>
          </main>

          <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink">
            <BottomNav currentTab="today" />
          </div>
        </div>

        {/* Desktop Skeleton Placeholder */}
        <div className="hidden lg:flex min-h-[980px] bg-page animate-pulse p-8">
          <div className="w-60 bg-ink rounded-2xl mr-8" />
          <div className="flex-1 space-y-6">
            <div className="h-10 w-64 bg-level-empty rounded" />
            <div className="h-48 bg-level-empty rounded-2xl" />
            <div className="h-96 bg-level-empty rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const { calories, macros, meals, microsSummary, minerals, vitamins } = currentData;

  // --- 2. EMPTY STATE (EmptyToday.dc.html) ---
  if (isEmpty) {
    return (
      <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col">
        <div className="w-full min-h-screen bg-page flex flex-col relative pb-[88px] overflow-x-hidden">
          <h1 className="sr-only">Hôm nay — Ngày đầu tiên</h1>
          {/* Header */}
          <AppHeader
            variant="daily"
            date={currentData.date}
            dateLabel={dateLabel}
            canGoNext={false}
            alignGroup="today-header"
            summary={
              <div className="flex gap-4.5 items-center">
                <CalorieDial current={0} target={calories.targetMin} targetMax={calories.targetMax} size={104} />
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="text-[13px] text-muted-dark">Mục tiêu hôm nay</div>
                  <div className="text-lg font-bold tabular-nums">
                    {formatAmount(calories.targetMin, "kcal")}–{formatAmount(calories.targetMax, "kcal")} kcal
                  </div>
                  <div className="text-[13px] text-muted-subtitle">
                    Đạm 104–143 g · Béo 33–65 g
                  </div>
                </div>
              </div>
            }
          />

          {/* Empty Body */}
          <main className="flex-1 w-full max-w-[560px] mx-auto px-4 pt-3.5 pb-6 flex flex-col gap-3">
            <div className="bg-card border border-card-border rounded-[18px] p-4 flex flex-col gap-2.5">
              <h2 className="m-0 font-display italic font-extrabold text-[22px] leading-tight">
                CHÀO BẠN!
              </h2>
              <p className="m-0 text-sm leading-relaxed text-secondary">
                Bắt đầu với bữa sáng. Ghi càng đủ, vòng vi chất càng chính xác.
              </p>
              <Link
                href="/add?meal=breakfast"
                className="h-12 rounded-full bg-blue text-white flex items-center justify-center text-[15px] font-bold no-underline active:scale-[0.97] transition-transform"
              >
                + Ghi bữa sáng
              </Link>
            </div>

            {["Bữa trưa", "Trước tập", "Bữa tối", "Bữa phụ"].map((m) => (
              <Link
                key={m}
                href={`/add?meal=${encodeURIComponent(m)}`}
                className="bg-card border border-card-border rounded-[18px] px-4 min-h-[56px] flex items-center justify-between text-[15px] no-underline active:scale-[0.97] transition-transform"
              >
                <span className="font-bold text-text">{m}</span>
                <span className="font-semibold text-blue">+ Thêm món</span>
              </Link>
            ))}

            <div className="bg-card border border-card-border rounded-[18px] px-4 py-3 text-[13px] leading-relaxed flex gap-2.5">
              <span className="w-1 shrink-0 rounded-full bg-blue" aria-hidden="true" />
              <span>
                <strong className="font-bold">Mẹo:</strong> Ăn rất nhiều, không bỏ bữa. Muối 4–6 g chia theo các bữa.
              </span>
            </div>
          </main>

          <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink">
            <BottomNav currentTab="today" />
          </div>
        </div>
      </div>
    );
  }

  // --- 3. ACTIVE TODAY SCREEN (Mobile Today.dc.html & Desktop DesktopToday.dc.html) ---
  return (
    <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col">
      {/* ============================================================== */}
      {/* MOBILE LAYOUT (390px Viewport) — Matches Today.dc.html exactly */}
      {/* ============================================================== */}
      <div data-align-container="today-page" className="w-full min-h-screen bg-page flex flex-col relative lg:hidden pb-[88px] overflow-x-hidden">
        <h1 className="sr-only">Hôm nay</h1>

        {/* Offline Banner (TodayStates.dc.html) */}
        {showOfflineBanner && (
          <div className="w-full max-w-[560px] mx-auto px-4 mt-3">
            <div
              role="status"
              className="bg-warning-bg text-warning-text text-sm rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 leading-snug"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0"
              >
                <path d="M3 3l18 18" />
                <path d="M9.5 5.2A6 6 0 0 1 17.7 9.3 4.5 4.5 0 0 1 19.5 17.5" />
                <path d="M6.5 18A4.5 4.5 0 0 1 5.5 9.4" />
                <path d="M6.5 18h9" />
              </svg>
              <span>Đang ngoại tuyến — món mới sẽ đồng bộ khi có mạng.</span>
            </div>
          </div>
        )}

        {/* Dark Top Hero Header */}
        <AppHeader
          variant="daily"
          date={currentData.date}
          dateLabel={dateLabel}
          canGoNext={false}
          alignGroup="today-header"
          summary={
            <>
              {/* Calorie Dial & 4 Macros */}
              <div className="flex gap-4.5 items-center">
                <CalorieDial
                  current={calories.consumed}
                  target={calories.targetMin}
                  targetMax={calories.targetMax}
                  size={100}
                />
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  {macros.map((m) => (
                    <div key={m.key} className="flex flex-col gap-1">
                      <div className="flex justify-between text-[13px] leading-tight">
                        <span className="font-semibold">{m.label}</span>
                        <span className="font-display italic font-black text-grabber tabular-nums text-sm">{m.displayValue}</span>
                      </div>
                      <SegmentedBar
                        aria-label={`Tiến độ ${m.label}`}
                        percentage={m.percentage ?? 0}
                        tone="dark"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtitle Target Summary */}
              <div className="text-[13px] text-muted-subtitle leading-tight text-center w-full mt-1.5">
                Mục tiêu{" "}
                <span className="font-semibold text-white tabular-nums">
                  {formatAmount(calories.targetMin, "kcal")}–{formatAmount(calories.targetMax, "kcal")} kcal
                </span>{" "}
                · còn {formatAmount(calories.remaining, "kcal")} · Ngày tập {currentData.user.trainingMinutes}′
              </div>
            </>
          }
        />

        {/* Mobile Body Content */}
        <div className="flex-1 w-full max-w-[560px] mx-auto px-4 pt-3.5 pb-6 flex flex-col gap-2.5">
          {/* Card: Micros Summary linking to /micros */}
          <Link
            href="/micros"
            data-align-group="today-header"
            className="no-underline text-text bg-card border border-card-border rounded-[18px] px-4 py-3 flex items-center gap-3.5 min-h-[44px] box-border active:scale-[0.97] transition-transform"
          >
            <div className="font-display italic font-black text-[26px] text-blue leading-none shrink-0">
              {microsSummary.achieved}/{microsSummary.total}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold leading-snug">Vi chất đã đạt</div>
              <div className="text-[13px] text-secondary truncate">
                Thiếu nhiều nhất: {microsSummary.mostLacking.join(", ")}
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="text-secondary shrink-0">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* All 5 Meal Slots */}
          {meals.map((meal) => {
            const hasItems = meal.items.length > 0;
            const isHighlighted = highlightedMeal === meal.slot;
            if (hasItems) {
              return (
                <section
                  key={meal.id}
                  id={`meal-${meal.slot}`}
                  className={`bg-card border border-card-border rounded-[18px] px-4 pt-2.5 pb-1.5 flex flex-col transition-all duration-300 ${
                    isHighlighted ? "ring-2 ring-blue/80 shadow-md" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between pb-0.5 w-full">
                    <div className="flex items-center gap-2">
                      <h2 data-align-group="meal-card" data-align-edge="left" className="m-0 text-base font-bold text-text">{meal.name}</h2>
                      <Link
                        id={`mobile-add-${meal.slot}`}
                        href={`/add?meal=${meal.slot}`}
                        onClick={() => handleSaveOpener(`mobile-add-${meal.slot}`)}
                        className="text-xs font-semibold text-blue hover:underline min-h-[44px] flex items-center"
                      >
                        + Thêm
                      </Link>
                    </div>
                    <div className="text-[15px] font-bold tabular-nums text-text">
                      {formatAmount(meal.kcal, "kcal")} kcal
                    </div>
                  </div>
                  {meal.items.map((it) => (
                    <Link
                      key={it.id}
                      href={`/entry/${it.id}`}
                      className="no-underline flex items-center justify-between gap-2 text-sm min-h-[44px] border-t border-divider w-full active:scale-[0.97] transition-transform"
                    >
                      <span data-align-group="meal-card" data-align-edge="left" className="truncate text-text font-normal">
                        {it.name} <span className="text-secondary">· {it.qty}</span>
                      </span>
                      <span className="text-secondary tabular-nums shrink-0">
                        {formatAmount(it.kcal, "kcal")}
                      </span>
                    </Link>
                  ))}
                </section>
              );
            }

            // Empty slot row with + Thêm món
            return (
              <Link
                key={meal.id}
                id={`mobile-add-empty-${meal.slot}`}
                href={`/add?meal=${meal.slot}`}
                onClick={() => handleSaveOpener(`mobile-add-empty-${meal.slot}`)}
                className={`no-underline bg-card border border-card-border rounded-[18px] px-4 min-h-[52px] flex items-center justify-between text-[15px] active:scale-[0.97] transition-all duration-300 ${
                  isHighlighted ? "ring-2 ring-blue/80 shadow-md" : ""
                }`}
              >
                <span className="font-bold text-text">{meal.name}</span>
                <span className="font-semibold text-blue">+ Thêm món</span>
              </Link>
            );
          })}

          {/* "Chép hôm qua" button on its own */}
          <button
            type="button"
            onClick={() => setIsCopySheetOpen(true)}
            className="w-full min-h-[52px] px-4 rounded-[18px] bg-card text-text border border-card-border text-[15px] font-semibold flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform"
          >
            Chép hôm qua
          </button>
        </div>

        {/* Fixed Mobile Navigation Dock */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink">
          <BottomNav currentTab="today" />
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP LAYOUT (≥1024px) — Matches DesktopToday.dc.html exactly */}
      {/* ============================================================== */}
      <div className="hidden lg:flex min-h-[980px] bg-page text-text font-sans">
        {/* Left Sidebar */}
        <aside className="w-60 shrink-0 bg-ink text-white p-6 flex flex-col gap-6 box-border">
          <div className="px-2 font-display italic font-black text-2xl">
            H1T <span className="text-sky">MICRO</span>
          </div>
          <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
            <Link
              href="/today"
              aria-current="page"
              className="no-underline flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-semibold text-white bg-card/10 transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
              </svg>
              Hôm nay
            </Link>
            <Link
              href="/micros"
              className="no-underline flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-semibold text-muted-on-dark hover:bg-card/5 hover:text-white transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 20V11M12 20V4M19 20v-6" />
              </svg>
              Vi chất
            </Link>
            <Link
              href="/training"
              className="no-underline flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-semibold text-muted-on-dark hover:bg-card/5 hover:text-white transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" />
              </svg>
              Ngày tập
            </Link>
            <Link
              href="/profile"
              className="no-underline flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-semibold text-muted-on-dark hover:bg-card/5 hover:text-white transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
              </svg>
              Hồ sơ
            </Link>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 pb-12 max-w-[1240px] flex flex-col gap-5 box-border">
          {/* Header */}
          <AppHeader
            variant="daily"
            title="HÔM NAY"
            date={currentData.date}
            dateLabel={dateLabel}
            canGoNext={false}
            desktopSubtitle={`Thứ Bảy, 10/10/2026 · Ngày tập ${currentData.user.trainingMinutes}′ · ${currentData.user.goalLabel} · ${currentData.user.weightKg} kg`}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => setIsCopySheetOpen(true)}
                  className="h-11 px-4 border border-card-border rounded-xl bg-card text-text text-sm font-semibold cursor-pointer hover:bg-divider transition-colors active:scale-[0.97]"
                >
                  Chép hôm qua
                </button>
                <Link
                  id="desktop-add-btn"
                  href="/add"
                  onClick={() => handleSaveOpener("desktop-add-btn")}
                  className="no-underline h-11 px-5 rounded-full bg-blue text-white flex items-center gap-2 text-[15px] font-bold hover:bg-blue/90 active:scale-[0.97] transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Thêm món
                </Link>
              </>
            }
          />

          {/* Top 2 Cards Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Calorie ring and macros */}
            <div className="bg-ink text-white rounded-2xl p-5.5 flex flex-col justify-between gap-4">
              <div className="flex gap-5.5 items-center flex-wrap">
                <CalorieDial
                  current={calories.consumed}
                  target={calories.targetMin}
                  targetMax={calories.targetMax}
                  size={128}
                />
                <div className="flex-1 min-w-[160px] flex flex-col gap-2.5">
                  {macros.map((m) => (
                    <div key={m.key} className="flex flex-col gap-1">
                      <div className="flex justify-between text-[13px] leading-tight">
                        <span className="font-semibold">{m.label}</span>
                        <span className="font-display italic font-black text-grabber tabular-nums text-sm">{m.displayValue}</span>
                      </div>
                      <SegmentedBar
                        aria-label={`Tiến độ ${m.label}`}
                        percentage={m.percentage ?? 0}
                        tone="dark"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-[13px] text-muted-subtitle text-center w-full">
                Mục tiêu{" "}
                <span className="font-semibold text-white tabular-nums">
                  {formatAmount(calories.targetMin, "kcal")}–{formatAmount(calories.targetMax, "kcal")} kcal
                </span>{" "}
                · còn {formatAmount(calories.remaining, "kcal")} · Ngày tập {currentData.user.trainingMinutes}′
              </div>
            </div>

            {/* Card 2: Training day salt card */}
            <div className="bg-card border border-card-border rounded-[18px] p-5 flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between">
                <h2 className="m-0 text-lg font-bold text-text">Ngày tập · 60 phút</h2>
                <Link href="/training" className="text-sm font-semibold text-blue no-underline min-h-[44px] flex items-center px-2">
                  Mở chi tiết
                </Link>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display italic font-extrabold text-3xl text-text">7–10,5 g</span>
                <span className="text-sm text-secondary">muối hôm nay</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-t border-divider">
                <span className="text-text">Muối nền (sinh hoạt)</span>
                <span className="font-semibold text-text">4–6 g</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-t border-divider">
                <span className="text-text">Bù mồ hôi (60′ tập)</span>
                <span className="font-semibold text-text">3–4,5 g</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-t border-divider">
                <span className="text-text">Kali mục tiêu</span>
                <span className="font-semibold text-text">5.200–6.500 mg</span>
              </div>
            </div>
          </section>

          {/* Bottom 2 Columns Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Column 1: Bữa ăn */}
            <div data-align-container className="bg-card border border-card-border rounded-[18px] p-5 pb-2.5">
              <div className="flex items-baseline justify-between mb-1">
                <h2 data-align-group="desktop-meal" data-align-edge="left" className="m-0 text-lg font-bold text-text">Bữa ăn</h2>
                <span className="text-[13px] text-secondary">Chọn món để sửa hoặc xoá</span>
              </div>
              {meals.map((meal) => {
                const isHighlighted = highlightedMeal === meal.slot;
                return (
                  <div
                    key={meal.id}
                    id={`desktop-meal-${meal.slot}`}
                    className={`border-t border-divider py-2 transition-all duration-300 rounded-lg px-2 -mx-2 ${
                      isHighlighted ? "bg-blue/10 ring-2 ring-blue/80" : ""
                    }`}
                  >
                    <div className="flex justify-between items-baseline w-full">
                      <div className="flex items-center gap-2">
                        <h3 data-align-group="desktop-meal" data-align-edge="left" className="m-0 text-[15px] font-bold text-text">{meal.name}</h3>
                        <Link
                          id={`desktop-add-${meal.slot}`}
                          href={`/add?meal=${meal.slot}`}
                          onClick={() => handleSaveOpener(`desktop-add-${meal.slot}`)}
                          className="text-xs font-semibold text-blue no-underline hover:underline min-h-[44px] inline-flex items-center"
                        >
                          + Thêm
                        </Link>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-text">
                        {meal.kcal > 0 ? `${formatAmount(meal.kcal, "kcal")} kcal` : "0 kcal"}
                      </span>
                    </div>
                    {meal.items.map((it) => (
                      <Link
                        key={it.id}
                        href={`/entry/${it.id}`}
                        className="no-underline flex justify-between items-center min-h-[44px] px-2 -mx-2 rounded-lg text-sm hover:bg-page transition-colors"
                      >
                        <span data-align-group="desktop-meal" data-align-edge="left" className="truncate text-text font-normal">
                          {it.name} <span className="text-secondary">· {it.qty}</span>
                        </span>
                        <span className="text-secondary tabular-nums shrink-0">
                          {formatAmount(it.kcal, "kcal")}
                        </span>
                      </Link>
                    ))}
                    {meal.items.length === 0 && (
                      <Link
                        id={`desktop-add-empty-${meal.slot}`}
                        href={`/add?meal=${meal.slot}`}
                        onClick={() => handleSaveOpener(`desktop-add-empty-${meal.slot}`)}
                        className="flex items-center min-h-[44px] px-2 -mx-2 rounded-lg text-sm font-semibold text-blue no-underline hover:bg-page transition-colors"
                      >
                        <span data-align-group="desktop-meal" data-align-edge="left">+ Thêm món</span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Column 2: Vi chất */}
            <div className="bg-card border border-card-border rounded-[18px] p-5 pb-2.5">
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="m-0 text-lg font-bold text-text">Vi chất</h2>
                <span className="font-display italic font-extrabold text-2xl text-blue">
                  {microsSummary.achieved}/{microsSummary.total}
                </span>
              </div>

              {/* Minerals list */}
              <h3 className="my-3 text-[13px] font-bold text-secondary tracking-wider uppercase">
                KHOÁNG CHẤT · {microsSummary.mineralsAchieved}/{microsSummary.mineralsTotal}
              </h3>
              {minerals.map((item) => (
                <Link
                  key={item.key}
                  href={`/micros/${item.key}`}
                  className="no-underline flex flex-col gap-1.5 py-2 px-2 -mx-2 rounded-lg border-t border-divider hover:bg-page transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold flex-1 text-text">{item.name}</span>
                    {(item.percentage ?? 0) >= 100 && (
                      <span className="text-[13px] font-bold text-blue">✓ Đạt</span>
                    )}
                    <span className="text-secondary text-[13px] tabular-nums">
                      {item.displayValue}
                    </span>
                  </div>
                  <SegmentedBar
                    aria-label={`Tiến độ ${item.name}`}
                    percentage={item.percentage ?? 0}
                    tone="light"
                  />
                </Link>
              ))}

              {/* Vitamins list */}
              <h3 className="mt-4 mb-3 text-[13px] font-bold text-secondary tracking-wider uppercase">
                VITAMIN · {microsSummary.vitaminsAchieved}/{microsSummary.vitaminsTotal}
              </h3>
              {vitamins.map((item) => (
                <Link
                  key={item.key}
                  href={`/micros/${item.key}`}
                  className="no-underline flex flex-col gap-1.5 py-2 px-2 -mx-2 rounded-lg border-t border-divider hover:bg-page transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold flex-1 text-text">{item.name}</span>
                    {(item.percentage ?? 0) >= 100 && (
                      <span className="text-[13px] font-bold text-blue">✓ Đạt</span>
                    )}
                    <span className="text-secondary text-[13px] tabular-nums">
                      {item.displayValue}
                    </span>
                  </div>
                  <SegmentedBar
                    aria-label={`Tiến độ ${item.name}`}
                    percentage={item.percentage ?? 0}
                    tone="light"
                  />
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* "Chép hôm qua" Bottom Sheet Dialog */}
      <Sheet
        open={isCopySheetOpen}
        onClose={() => setIsCopySheetOpen(false)}
        title="Chép bữa hôm qua?"
        description="Thứ Sáu 09/10 · 1.980 kcal"
      >
        <div className="flex flex-col gap-2.5 py-2">
          <div className="text-sm text-secondary">
            Món đã có hôm nay sẽ không bị ghi đè.
          </div>
          <PillButton
            variant="primary"
            onClick={() => setIsCopySheetOpen(false)}
          >
            Chép 3 bữa
          </PillButton>
          <PillButton
            variant="secondary"
            onClick={() => setIsCopySheetOpen(false)}
          >
            Huỷ
          </PillButton>
        </div>
      </Sheet>

      {/* Floating Toast Notification (Responsive for Mobile and Desktop) */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 lg:bottom-8 left-4 right-4 lg:left-auto lg:right-8 lg:w-[400px] max-w-[528px] mx-auto z-50 bg-ink text-white rounded-2xl p-2.5 pl-4 flex items-center justify-between gap-3 shadow-2xl border border-card-border/20"
        >
          <span className="text-sm font-medium truncate">{toast.message}</span>
          <button
            type="button"
            onClick={() => {
              setHighlightedMeal(toast.mealSlot);
              const el =
                document.getElementById(`meal-${toast.mealSlot}`) ||
                document.getElementById(`desktop-meal-${toast.mealSlot}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
              setTimeout(() => setHighlightedMeal(null), 2500);
            }}
            className="shrink-0 min-h-[44px] px-3.5 rounded-xl text-sky font-bold text-sm bg-transparent border-0 cursor-pointer hover:bg-surface-dark active:scale-[0.97]"
          >
            Xem
          </button>
        </div>
      )}
    </div>
  );
}
