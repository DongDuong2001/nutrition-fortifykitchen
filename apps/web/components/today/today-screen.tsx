"use client";

import React, { useState, useEffect, useMemo, useSyncExternalStore, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/ui/bottom-nav";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";
import { AppHeader } from "@/components/ui/app-header";
import { CalorieDial } from "@/components/ui/calorie-dial";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import { CalendarSheet } from "@/components/calendar-sheet";
import { CopyYesterdaySheet } from "@/components/copy-yesterday-sheet";
import { apiClient } from "@/lib/api-client";
import { shiftIsoDate, viewedIsoDate } from "@/lib/day-history";
import { formatAmount, formatDesktopDate } from "@/lib/format";
import { targetRangeText } from "@/lib/profile";
import { calculateSaltTarget, formatSaltRange } from "@/lib/training";
import { SAMPLE_DAY, type MockDayData, type MockMicroStat } from "@/lib/mock/sample-day";
import { pastDayData, useDiary } from "@/lib/diary-store";

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

/** Vi chất count for the day. Links to /micros on today only, since /micros shows today. */
function MicrosSummaryCard({ summary, linked }: { summary: MockDayData["microsSummary"]; linked: boolean }) {
  const className =
    "no-underline text-text bg-card border border-card-border rounded-[18px] px-4 py-3 flex items-center gap-3.5 min-h-[44px] box-border";
  const content = (
    <>
      <div className="font-display italic font-black text-[26px] text-blue leading-none shrink-0">
        {summary.achieved}/{summary.total}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold leading-snug">Vi chất đã đạt</div>
        <div className="text-[13px] text-secondary truncate">Thiếu nhiều nhất: {summary.mostLacking.join(", ")}</div>
      </div>
      {linked && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="text-secondary shrink-0">
          <path d="M9 5l7 7-7 7" />
        </svg>
      )}
    </>
  );
  return linked ? (
    <Link href="/micros" data-align-group="today-header" className={`${className} active:scale-[0.97] transition-transform`}>
      {content}
    </Link>
  ) : (
    <div data-align-group="today-header" className={className}>
      {content}
    </div>
  );
}

/** "60 phút" or "Nghỉ" for the training row. */
function trainingHint(minutes: number): string {
  return minutes > 0 ? `${minutes} phút` : "Nghỉ";
}

/**
 * A link row on the phone to a screen that no longer has a tab (Vi chất, Ngày tập). The same card style as
 * the vi chất summary. Step 2 of IA v2 replaces these with the Tổng quan cards.
 */
function ShortcutRow({ href, title, hint }: { href: string; title: string; hint: string }) {
  return (
    <Link
      href={href}
      data-align-group="today-header"
      className="no-underline text-text bg-card border border-card-border rounded-[18px] px-4 py-3 flex items-center gap-3.5 min-h-[44px] box-border active:scale-[0.97] transition-transform"
    >
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold leading-snug">{title}</div>
        <div className="text-[13px] text-secondary">{hint}</div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="text-secondary shrink-0">
        <path d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

/**
 * The Today content: the day's meals, vi chất and training. Served at / and at /diary (same component) until
 * step 2 of IA v2 splits it into Tổng quan and Nhật ký. Past days (?date=) are read-only.
 */
export function TodayScreen() {
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

  const { data: diaryData, highlightedMeal, setHighlightedMeal, hydrated, todayIso, profile, targets } = useDiary();
  const router = useRouter();

  const [data, setData] = useState<MockDayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopySheetOpen, setIsCopySheetOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [clientNow, setClientNow] = useState<Date | null>(null);

  // ?date= picks a past day. It is read after mount (todayIso is null before), so the first render matches the server.
  const pastIso = hydrated && todayIso ? viewedIsoDate(searchParams?.get("date"), todayIso) : null;
  const isPast = pastIso !== null && pastIso !== todayIso;
  const pastData = useMemo(
    () => (isPast && pastIso && todayIso ? pastDayData(pastIso, todayIso, profile, targets) : null),
    [isPast, pastIso, todayIso, profile, targets]
  );

  function goToDay(iso: string) {
    router.push(iso === todayIso ? "/diary" : `/diary?date=${iso}`);
  }
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
  const currentData = pastData || (hydrated ? diaryData : null) || data || SAMPLE_DAY;
  // Salt for the day's training minutes (base 4–6 g plus 1–1,5 g per 20 min), so the cards match the profile
  const salt = calculateSaltTarget(currentData.user.trainingMinutes);
  // The date part opens the same day picker as the phone's date label. The rest is plain text.
  const desktopDate = clientNow ? formatDesktopDate(currentData.date) : null;
  const desktopSubtitle = clientNow ? (
    <>
      <button
        type="button"
        onClick={() => setIsCalendarOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Chọn ngày, ${desktopDate}`}
        className="inline-flex min-h-[44px] items-center bg-transparent p-0 border-0 text-inherit cursor-pointer underline-offset-4 hover:underline"
      >
        {desktopDate}
      </button>
      {` · Ngày tập ${currentData.user.trainingMinutes}′ · ${currentData.user.goalLabel} · ${currentData.user.weightKg} kg`}
    </>
  ) : (
    currentData.desktopDateLabel
  );
  // A past day with nothing logged still shows its meals: the empty-day state is for today only
  const isEmpty = !isPast && (forceEmpty || (!showLoading && currentData.meals.every((m) => m.items.length === 0)));
  // Date nav: ‹ goes back one day from the viewed day; › goes forward, and stays off on today
  const prevDay = pastIso ? () => goToDay(shiftIsoDate(pastIso, -1)) : undefined;
  const nextDay = pastIso ? () => goToDay(shiftIsoDate(pastIso, 1)) : undefined;
  // One Vi chất row. Links to its detail on today only, since the detail page shows today.
  const renderMicroRow = (item: MockMicroStat) => {
    const content = (
      <>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold flex-1 text-text">{item.name}</span>
          {(item.percentage ?? 0) >= 100 && <span className="text-[13px] font-bold text-blue">✓ Đạt</span>}
          <span className="text-secondary text-[13px] tabular-nums">{item.displayValue}</span>
        </div>
        <SegmentedBar aria-label={`Tiến độ ${item.name}`} percentage={item.percentage ?? 0} tone="light" />
      </>
    );
    const rowClass = "no-underline flex flex-col gap-1.5 py-2 px-2 -mx-2 rounded-lg border-t border-divider";
    return isPast ? (
      <div key={item.key} className={rowClass}>
        {content}
      </div>
    ) : (
      <Link key={item.key} href={`/micros/${item.key}`} className={`${rowClass} hover:bg-page transition-colors`}>
        {content}
      </Link>
    );
  };

  const calendarSheet = todayIso ? (
    <CalendarSheet
      open={isCalendarOpen}
      onClose={() => setIsCalendarOpen(false)}
      selectedIso={pastIso ?? todayIso}
      onPick={(iso) => {
        setIsCalendarOpen(false);
        goToDay(iso);
      }}
    />
  ) : null;

  // --- 1. SKELETON LOADING STATE (TodayStates.dc.html) ---
  if (showLoading) {
    return (
      <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col">
        {/* Mobile Viewport Container */}
        <div className="w-full min-h-screen bg-page flex flex-col relative lg:hidden pb-[88px] overflow-x-hidden">
          <h1 className="sr-only">Hôm nay — Đang tải</h1>
          {/* Header Skeleton */}
          <div className="bg-ink text-on-dark rounded-b-[20px]">
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
            <BottomNav />
          </div>
        </div>

        {/* Desktop Skeleton Placeholder */}
        <div className="hidden lg:flex min-h-[980px] bg-page animate-pulse p-8">
          <h1 className="sr-only">Hôm nay — Đang tải</h1>
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
          <h1 className="sr-only lg:hidden">Hôm nay — Ngày đầu tiên</h1>
          {/* Header */}
          <AppHeader
            variant="daily"
            date={currentData.date}
            onPrev={prevDay}
            onNext={nextDay}
            canGoNext={false}
            onDateTap={() => setIsCalendarOpen(true)}
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
                className="h-12 rounded-full bg-blue text-on-accent flex items-center justify-center text-[15px] font-bold no-underline active:scale-[0.97] transition-transform"
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

            <ShortcutRow href="/micros" title="Vi chất" hint="Mức đạt từng vi chất hôm nay" />
            <ShortcutRow
              href="/training"
              title="Ngày tập"
              hint={`${trainingHint(currentData.user.trainingMinutes)} · muối ${salt.formattedTotal} g`}
            />

            <div className="bg-card border border-card-border rounded-[18px] px-4 py-3 text-[13px] leading-relaxed flex gap-2.5">
              <span className="w-1 shrink-0 rounded-full bg-blue" aria-hidden="true" />
              <span>
                <strong className="font-bold">Mẹo:</strong> Ăn rất nhiều, không bỏ bữa. Muối {formatSaltRange(salt.baseMin, salt.baseMax)} g chia theo các bữa.
              </span>
            </div>
          </main>

          <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink">
            <BottomNav />
          </div>
        </div>
        {calendarSheet}
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
        <h1 className="sr-only">{showOfflineBanner ? "Hôm nay — Ngoại tuyến" : "Hôm nay"}</h1>

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
          onPrev={prevDay}
          onNext={nextDay}
          canGoNext={isPast}
          onDateTap={() => setIsCalendarOpen(true)}
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
                <span className="font-semibold text-on-dark tabular-nums">
                  {formatAmount(calories.targetMin, "kcal")}–{formatAmount(calories.targetMax, "kcal")} kcal
                </span>{" "}
                · còn {formatAmount(calories.remaining, "kcal")} · Ngày tập {currentData.user.trainingMinutes}′
              </div>
            </>
          }
        />

        {/* Mobile Body Content */}
        <div className="flex-1 w-full max-w-[560px] mx-auto px-4 pt-3.5 pb-6 flex flex-col gap-2.5">
          {isPast && (
            <div role="status" className="bg-card border border-card-border rounded-[18px] pl-4 pr-1 min-h-[44px] flex items-center justify-between text-[13px] font-semibold">
              <span>Đang xem ngày cũ</span>
              <Link href="/diary" className="min-h-[44px] px-2.5 flex items-center font-bold text-blue no-underline">
                Về hôm nay
              </Link>
            </div>
          )}

          <MicrosSummaryCard summary={microsSummary} linked={!isPast} />
          {!isPast && (
            <ShortcutRow
              href="/training"
              title="Ngày tập"
              hint={`${trainingHint(currentData.user.trainingMinutes)} · muối ${salt.formattedTotal} g`}
            />
          )}

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
                      {!isPast && (
                        <Link
                          id={`mobile-add-${meal.slot}`}
                          href={`/add?meal=${meal.slot}`}
                          onClick={() => handleSaveOpener(`mobile-add-${meal.slot}`)}
                          className="text-xs font-semibold text-blue hover:underline min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          + Thêm
                        </Link>
                      )}
                    </div>
                    <div className="text-[15px] font-bold tabular-nums text-text">
                      {formatAmount(meal.kcal, "kcal")} kcal
                    </div>
                  </div>
                  {meal.items.map((it) =>
                    isPast ? (
                      <div
                        key={it.id}
                        className="flex items-center justify-between gap-2 text-sm min-h-[44px] border-t border-divider w-full"
                      >
                        <span data-align-group="meal-card" data-align-edge="left" className="truncate text-text font-normal">
                          {it.name} <span className="text-secondary">· {it.qty}</span>
                        </span>
                        <span className="text-secondary tabular-nums shrink-0">
                          {formatAmount(it.kcal, "kcal")}
                        </span>
                      </div>
                    ) : (
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
                    )
                  )}
                </section>
              );
            }

            // Empty slot row: + Thêm món on today; "Chưa ghi" on a past day (nothing can be added there yet)
            if (isPast) {
              return (
                <div
                  key={meal.id}
                  className="bg-card border border-card-border rounded-[18px] px-4 min-h-[52px] flex items-center justify-between text-[15px]"
                >
                  <span className="font-bold text-text">{meal.name}</span>
                  <span className="text-secondary">Chưa ghi</span>
                </div>
              );
            }
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

          {/* "Chép hôm qua" button on its own (today only) */}
          {!isPast && (
            <button
              type="button"
              onClick={() => setIsCopySheetOpen(true)}
              className="w-full min-h-[52px] px-4 rounded-[18px] bg-card text-text border border-card-border text-[15px] font-semibold flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform"
            >
              Chép hôm qua
            </button>
          )}
        </div>

        {/* Fixed Mobile Navigation Dock */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink">
          <BottomNav />
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP LAYOUT (≥1024px) — Matches DesktopToday.dc.html exactly */}
      {/* ============================================================== */}
      <div className="hidden lg:flex min-h-[980px] bg-page text-text font-sans">
        {/* Left Sidebar */}
        <DesktopSidebar />

        {/* Main Content Area */}
        <main data-align-container="today-desktop" className="flex-1 p-8 pb-12 max-w-[1240px] flex flex-col gap-5 box-border">
          {/* Header */}
          <AppHeader
            variant="daily"
            title="HÔM NAY"
            date={currentData.date}
            onPrev={prevDay}
            onNext={nextDay}
            canGoNext={isPast}
            alignGroup="today-header"
            subtitle={desktopSubtitle}
            actions={
              isPast ? undefined : (
                <button
                  type="button"
                  onClick={() => setIsCopySheetOpen(true)}
                  className="h-11 px-4 border border-card-border rounded-xl bg-card text-text text-sm font-semibold cursor-pointer hover:bg-divider transition-colors active:scale-[0.97]"
                >
                  Chép hôm qua
                </button>
              )
            }
          />

          {isPast && (
            <div role="status" className="bg-card border border-card-border rounded-[18px] pl-5 pr-1 min-h-[44px] flex items-center justify-between text-sm font-semibold">
              <span>Đang xem ngày cũ</span>
              <Link href="/diary" className="min-h-[44px] px-2.5 flex items-center font-bold text-blue no-underline">
                Về hôm nay
              </Link>
            </div>
          )}

          {/* Top 2 Cards Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Calorie ring and macros */}
            <div
              data-align-group="today-header"
              data-align-edge="left"
              className="bg-ink text-on-dark rounded-2xl p-5.5 flex flex-col justify-between gap-4"
            >
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
                <span className="font-semibold text-on-dark tabular-nums">
                  {formatAmount(calories.targetMin, "kcal")}–{formatAmount(calories.targetMax, "kcal")} kcal
                </span>{" "}
                · còn {formatAmount(calories.remaining, "kcal")} · Ngày tập {currentData.user.trainingMinutes}′
              </div>
            </div>

            {/* Card 2: Training day salt card */}
            <div className="bg-card border border-card-border rounded-[18px] p-5 flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between">
                <h2 className="m-0 text-lg font-bold text-text">Ngày tập · {currentData.user.trainingMinutes} phút</h2>
                <Link href="/training" className="text-sm font-semibold text-blue no-underline min-h-[44px] flex items-center px-2">
                  Mở chi tiết
                </Link>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display italic font-extrabold text-3xl text-text">{salt.formattedTotal} g</span>
                <span className="text-sm text-secondary">muối hôm nay</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-t border-divider">
                <span className="text-text">Muối nền (sinh hoạt)</span>
                <span className="font-semibold text-text">{formatSaltRange(salt.baseMin, salt.baseMax)} g</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-t border-divider">
                <span className="text-text">Bù mồ hôi ({currentData.user.trainingMinutes}′ tập)</span>
                <span className="font-semibold text-text">{salt.formattedTopUp} g</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-t border-divider">
                <span className="text-text">Kali mục tiêu</span>
                <span className="font-semibold text-text">{targetRangeText(targets.potassium, "mg")}</span>
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
                        {!isPast && (
                          <Link
                            id={`desktop-add-${meal.slot}`}
                            href={`/add?meal=${meal.slot}`}
                            onClick={() => handleSaveOpener(`desktop-add-${meal.slot}`)}
                            className="text-xs font-semibold text-blue no-underline hover:underline min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                          >
                            + Thêm
                          </Link>
                        )}
                      </div>
                      <span className="text-sm font-bold tabular-nums text-text">
                        {meal.kcal > 0 ? `${formatAmount(meal.kcal, "kcal")} kcal` : "0 kcal"}
                      </span>
                    </div>
                    {meal.items.map((it) =>
                      isPast ? (
                        <div
                          key={it.id}
                          className="flex justify-between items-center min-h-[44px] px-2 -mx-2 text-sm"
                        >
                          <span data-align-group="desktop-meal" data-align-edge="left" className="truncate text-text font-normal">
                            {it.name} <span className="text-secondary">· {it.qty}</span>
                          </span>
                          <span className="text-secondary tabular-nums shrink-0">
                            {formatAmount(it.kcal, "kcal")}
                          </span>
                        </div>
                      ) : (
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
                      )
                    )}
                    {meal.items.length === 0 && isPast && (
                      <div className="flex items-center min-h-[44px] px-2 -mx-2 text-sm text-secondary">
                        <span data-align-group="desktop-meal" data-align-edge="left">Chưa ghi</span>
                      </div>
                    )}
                    {meal.items.length === 0 && !isPast && (
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
                <div className="flex items-baseline gap-2">
                  <span className="font-display italic font-extrabold text-2xl text-blue">
                    {microsSummary.achieved}/{microsSummary.total}
                  </span>
                  {!isPast && (
                    <Link href="/micros" className="text-sm font-semibold text-blue no-underline min-h-[44px] flex items-center px-2">
                      Mở chi tiết
                    </Link>
                  )}
                </div>
              </div>

              {/* Minerals list */}
              <h3 className="my-3 text-[13px] font-bold text-secondary tracking-wider uppercase">
                KHOÁNG CHẤT · {microsSummary.mineralsAchieved}/{microsSummary.mineralsTotal}
              </h3>
              {minerals.map(renderMicroRow)}

              {/* Vitamins list */}
              <h3 className="mt-4 mb-3 text-[13px] font-bold text-secondary tracking-wider uppercase">
                VITAMIN · {microsSummary.vitaminsAchieved}/{microsSummary.vitaminsTotal}
              </h3>
              {vitamins.map(renderMicroRow)}
            </div>
          </section>
        </main>
      </div>

      {/* "Chép bữa hôm qua?" and the day picker */}
      <CopyYesterdaySheet open={isCopySheetOpen} onClose={() => setIsCopySheetOpen(false)} />
      {calendarSheet}

    </div>
  );
}
