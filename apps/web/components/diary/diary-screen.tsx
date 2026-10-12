"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { AppHeader } from "@/components/ui/app-header";
import { CalorieDial } from "@/components/ui/calorie-dial";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import { rememberAddOpener } from "@/components/ui/add-opener";
import { CalendarSheet } from "@/components/calendar-sheet";
import { CopyYesterdaySheet } from "@/components/copy-yesterday-sheet";
import { MealMenuSheet } from "@/components/diary/meal-menu-sheet";
import { copyMeals, dayEntries, shiftIsoDate, viewedIsoDate } from "@/lib/day-history";
import { SAMPLE_SLOT } from "@/lib/diary-edits";
import { pastDayData, useDiary } from "@/lib/diary-store";
import { formatAmount, formatDesktopDate } from "@/lib/format";
import type { MealSlot } from "@/lib/meal-slot";
import { SAMPLE_DAY, type MockDayData } from "@/lib/mock/sample-day";
import { calculateSaltTarget } from "@/lib/training";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
const getOnlineSnapshot = () => navigator.onLine;
const getOnlineServerSnapshot = () => true;

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-secondary">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** The day summary of the ink card: kcal dial, the four macro bars and the target line (còn N kcal / thiếu N kcal). */
function DaySummary({ day, past, size }: { day: MockDayData; past: boolean; size: number }) {
  const { calories, macros } = day;
  const gap = past ? Math.max(0, calories.targetMin - calories.consumed) : calories.remaining;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4.5">
        <CalorieDial current={calories.consumed} target={calories.targetMin} targetMax={calories.targetMax} size={size} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {macros.map((m) => (
            <div key={m.key} className="flex flex-col gap-1">
              <div className="flex justify-between text-[13px] leading-tight">
                <span className="font-semibold">{m.label}</span>
                <span className="font-display italic font-black text-grabber tabular-nums text-sm">
                  {past && m.consumed === 0 ? `— / ${m.displayValue.split(" / ")[1] ?? ""}` : m.displayValue}
                </span>
              </div>
              <SegmentedBar aria-label={`Tiến độ ${m.label}`} percentage={m.percentage ?? 0} tone="dark" />
            </div>
          ))}
        </div>
      </div>
      <div className="w-full text-center text-[13px] leading-tight text-muted-subtitle">
        Mục tiêu{" "}
        <span className="font-semibold tabular-nums text-on-dark">
          {formatAmount(calories.targetMin, "kcal")}–{formatAmount(calories.targetMax, "kcal")} kcal
        </span>
        {gap > 0 ? ` · ${past ? "thiếu" : "còn"} ${formatAmount(gap, "kcal")} kcal` : ""}
      </div>
    </div>
  );
}

/** One row under the summary: a short fact and a chevron, opening that screen for the day shown. */
function DayRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      data-align-group="today-header"
      className="flex min-h-[56px] items-center justify-between gap-3 border-t border-divider px-4 py-2 text-[15px] font-semibold text-text no-underline first:border-t-0 active:scale-[0.99]"
    >
      <span className="min-w-0 leading-snug">{children}</span>
      <ChevronRight />
    </Link>
  );
}

function MealOptionsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="19" cy="12" r="1.9" />
    </svg>
  );
}

/**
 * Nhật ký (/diary): owns the day, any date. Title row with the date nav; the ink day summary; two rows for the
 * day (Vi chất and Ngày tập, opening /micros and /training with ?date=); the meals, each with one + and a ⋯
 * menu. A past day (?date=) is read-only. A slim bar stays at the top of the phone once the summary scrolls away.
 */
export function DiaryScreen() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-page" />}>
      <DiaryContent />
    </Suspense>
  );
}

function DiaryContent() {
  const searchParams = useSearchParams();
  const forceEmpty = searchParams?.get("empty") === "1";
  const forceLoading = searchParams?.get("loading") === "1";
  const forceOffline = searchParams?.get("offline") === "1";

  const { data: diaryData, highlightedMeal, hydrated, todayIso, profile, targets, copyEntries, deleteMeal } = useDiary();
  const router = useRouter();

  const [isCopySheetOpen, setIsCopySheetOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [menuSlot, setMenuSlot] = useState<MealSlot | null>(null);
  const [clientNow, setClientNow] = useState<Date | null>(null);
  const [barVisible, setBarVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);

  // ?date= picks a past day. It is read after mount (todayIso is null before), so the first render matches the server.
  const pastIso = hydrated && todayIso ? viewedIsoDate(searchParams?.get("date"), todayIso) : null;
  const isPast = pastIso !== null && pastIso !== todayIso;
  const pastData = useMemo(
    () => (isPast && pastIso && todayIso ? pastDayData(pastIso, todayIso, profile, targets) : null),
    [isPast, pastIso, todayIso, profile, targets]
  );

  useEffect(() => {
    setClientNow(new Date());
  }, []);

  // Return focus to the control that opened /add (same contract as before)
  useEffect(() => {
    try {
      const returnId = sessionStorage.getItem("return_focus_id");
      if (returnId) {
        sessionStorage.removeItem("return_focus_id");
        requestAnimationFrame(() => document.getElementById(returnId)?.focus());
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  // The slim bar shows once the ink summary has scrolled out above the top of the screen
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setBarVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const currentData = pastData || (hydrated ? diaryData : null) || SAMPLE_DAY;
  const viewIso = currentData.date;
  const goToDay = (iso: string) => router.push(iso === todayIso ? "/diary" : `/diary?date=${iso}`);
  const prevDay = pastIso ? () => goToDay(shiftIsoDate(pastIso, -1)) : undefined;
  const nextDay = pastIso ? () => goToDay(shiftIsoDate(pastIso, 1)) : undefined;

  const showLoading = forceLoading;
  const showOfflineBanner = forceOffline || !isOnline;
  const { calories, meals, microsSummary } = currentData;
  const nothingLogged = meals.every((m) => m.items.length === 0);
  const isEmpty = !isPast && (forceEmpty || nothingLogged);

  const salt = calculateSaltTarget(currentData.user.trainingMinutes);
  const microsText = nothingLogged
    ? "Vi chất · chưa có món"
    : `${microsSummary.achieved}/${microsSummary.total} vi chất${
        microsSummary.mostLacking.length > 0 ? ` · Thiếu: ${microsSummary.mostLacking.join(", ")}` : ""
      }`;
  const trainingText = isPast
    ? "Ngày tập · Chỉ xem"
    : currentData.user.trainingMinutes > 0
    ? `Ngày tập ${currentData.user.trainingMinutes}′ · muối ${salt.formattedTotal} g`
    : `Nghỉ · muối ${salt.formattedTotal} g`;

  const desktopSubtitle = clientNow ? (
    <>
      <button
        type="button"
        onClick={() => setIsCalendarOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Chọn ngày, ${formatDesktopDate(currentData.date)}`}
        className="inline-flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent p-0 text-inherit underline-offset-4 hover:underline"
      >
        {formatDesktopDate(currentData.date)}
      </button>
      {isPast ? " · Chỉ xem" : ""}
    </>
  ) : (
    currentData.desktopDateLabel
  );

  // The ⋯ menu of a meal: what today and yesterday hold for it
  const menuMeal = menuSlot ? meals.find((m) => SAMPLE_SLOT[m.slot] === menuSlot) ?? null : null;
  const yesterdayMeal = useMemo(() => {
    if (!menuSlot || !todayIso) return [];
    return dayEntries(shiftIsoDate(todayIso, -1), todayIso).filter((e) => e.mealSlot === menuSlot);
  }, [menuSlot, todayIso]);

  function copyMealFromYesterday() {
    if (!menuSlot || !menuMeal || yesterdayMeal.length === 0) return;
    const copies = copyMeals(yesterdayMeal, [menuSlot], `copy-${Date.now()}`, new Date().toISOString());
    copyEntries(copies, `Đã chép ${menuMeal.name} từ hôm qua · ${copies.length} món`);
  }

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

  if (showLoading) {
    return (
      <AppShell>
        <h1 className="sr-only">Nhật ký</h1>
        <div className="bg-ink rounded-b-[20px] px-4 pt-3 pb-4 lg:hidden">
          <div className="mx-auto h-[160px] w-full max-w-[560px] rounded-2xl bg-surface-dark motion-safe:animate-pulse" />
        </div>
        <main role="status" aria-busy="true" className="mx-auto flex w-full max-w-[560px] flex-col gap-2.5 px-4 pt-3.5 pb-6 lg:mx-0 lg:max-w-[1240px] lg:px-8 lg:pt-8">
          <span className="sr-only">Đang tải…</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-3.5 motion-safe:animate-pulse">
              <div className="h-3 w-2/5 rounded bg-level-empty" />
              <div className="h-3 w-[70%] rounded bg-level-empty" />
              <div className="h-3 w-[55%] rounded bg-level-empty" />
            </div>
          ))}
        </main>
      </AppShell>
    );
  }

  const mealCards = meals.map((meal) => {
    const slot = SAMPLE_SLOT[meal.slot];
    const hasItems = meal.items.length > 0;
    const isHighlighted = highlightedMeal === slot;
    return (
      <section
        key={meal.id}
        id={`meal-${meal.slot}`}
        aria-labelledby={`meal-title-${meal.slot}`}
        className={`flex flex-col rounded-2xl border border-card-border bg-card px-4 pt-1 pb-1 transition-all duration-300 ${
          isHighlighted ? "ring-2 ring-blue/80 shadow-md" : ""
        }`}
      >
        <div className="flex min-h-[48px] items-center gap-2">
          <h2
            id={`meal-title-${meal.slot}`}
            data-align-group="meal-card"
            data-align-edge="left"
            className="m-0 min-w-0 flex-1 text-base font-bold text-text"
          >
            {meal.name}
          </h2>
          <span className={`whitespace-nowrap text-[15px] tabular-nums ${hasItems ? "font-bold text-text" : "font-semibold text-secondary"}`}>
            {hasItems ? `${formatAmount(meal.kcal, "kcal")} kcal` : isPast ? "Chưa ghi" : "Chưa có món"}
          </span>
          {!isPast && (
            <div className="-mr-2 flex items-center">
              <Link
                id={`mobile-add-${meal.slot}`}
                href={`/add?meal=${slot}`}
                onClick={() => rememberAddOpener(`mobile-add-${meal.slot}`)}
                aria-label={`Thêm vào ${meal.name}`}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue text-on-accent no-underline active:scale-[0.97] motion-reduce:active:scale-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </Link>
              <button
                type="button"
                id={`meal-menu-${meal.slot}`}
                aria-label={`Tuỳ chọn ${meal.name}`}
                aria-haspopup="dialog"
                aria-expanded={menuSlot === slot}
                onClick={() => setMenuSlot(slot)}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-text hover:bg-divider active:scale-[0.97] motion-reduce:active:scale-100"
              >
                <MealOptionsIcon />
              </button>
            </div>
          )}
        </div>
        {meal.items.map((it) => {
          const row = (
            <>
              <span data-align-group="meal-card" data-align-edge="left" className="min-w-0 text-text">
                {it.name} <span className="text-secondary">· {it.qty}</span>
              </span>
              <span className="shrink-0 tabular-nums text-secondary">{formatAmount(it.kcal, "kcal")}</span>
            </>
          );
          const rowClass = "flex min-h-[44px] w-full items-center justify-between gap-3 border-t border-divider text-sm";
          return isPast ? (
            <div key={it.id} className={rowClass}>
              {row}
            </div>
          ) : (
            <Link key={it.id} href={`/entry/${it.id}`} className={`${rowClass} no-underline active:scale-[0.99]`}>
              {row}
            </Link>
          );
        })}
      </section>
    );
  });

  return (
    <AppShell alignContainer="today-page">
      {showOfflineBanner && (
        <div className="mx-auto mt-3 w-full max-w-[560px] px-4 lg:mx-0 lg:max-w-[1240px] lg:px-8">
          <div role="status" className="flex items-center gap-2.5 rounded-xl bg-warning-bg px-3.5 py-2.5 text-sm leading-snug text-warning-text">
            Đang ngoại tuyến — món mới sẽ đồng bộ khi có mạng.
          </div>
        </div>
      )}

      <AppHeader
        variant="daily"
        title="Nhật ký"
        date={currentData.date}
        onPrev={prevDay}
        onNext={nextDay}
        canGoNext={isPast}
        onDateTap={() => setIsCalendarOpen(true)}
        alignGroup="today-header"
        subtitle={desktopSubtitle}
        summary={<DaySummary day={currentData} past={isPast} size={100} />}
      />
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />

      {/* Slim bar: kcal and what is left, once the summary has scrolled away (phone only) */}
      {barVisible && (
        <div
          role="status"
          aria-label="Tóm tắt ngày"
          className="fixed inset-x-0 top-0 z-30 flex flex-col gap-1.5 bg-ink px-4 py-2.5 text-on-dark lg:hidden"
        >
          <div className="mx-auto flex w-full max-w-[560px] items-baseline justify-between gap-2 text-sm">
            <b className="font-display italic font-black text-xl tabular-nums">{formatAmount(calories.consumed, "kcal")} kcal</b>
            <span className="text-muted-subtitle">
              {isPast
                ? "Chỉ xem"
                : calories.remaining > 0
                ? `còn ${formatAmount(calories.remaining, "kcal")} kcal · Mục tiêu ${formatAmount(calories.targetMin, "kcal")}–${formatAmount(calories.targetMax, "kcal")}`
                : `Mục tiêu ${formatAmount(calories.targetMin, "kcal")}–${formatAmount(calories.targetMax, "kcal")}`}
            </span>
          </div>
          <div className="mx-auto w-full max-w-[560px]">
            <SegmentedBar aria-label="Kcal trong ngày" percentage={calories.percentage} tone="dark" />
          </div>
        </div>
      )}

      <main
        data-align-container="today-main"
        className="mx-auto flex w-full max-w-[560px] flex-col gap-2.5 px-4 pt-3.5 pb-6 lg:mx-0 lg:max-w-[1240px] lg:gap-5 lg:px-8 lg:pt-5 lg:pb-12"
      >
        {isPast && (
          <div role="status" className="flex min-h-[44px] items-center justify-between rounded-2xl border border-card-border bg-card pl-4 pr-1 text-[13px] font-semibold lg:pl-5 lg:text-sm">
            <span>Đang xem ngày cũ</span>
            <Link href="/diary" className="flex min-h-[44px] items-center px-2.5 font-bold text-blue no-underline">
              Về hôm nay
            </Link>
          </div>
        )}

        {/* Desktop: the ink summary card (never a band at the top of the window) */}
        <section aria-label="Tóm tắt ngày" className="hidden rounded-2xl bg-ink p-5.5 text-on-dark lg:block lg:max-w-[560px]">
          <DaySummary day={currentData} past={isPast} size={128} />
        </section>

        {isEmpty && (
          <section aria-labelledby="diary-empty" className="flex flex-col gap-2.5 rounded-2xl border border-card-border bg-card p-4">
            <h2 id="diary-empty" className="m-0 text-base font-bold">
              Chưa có món hôm nay
            </h2>
            <p className="m-0 text-[13px] leading-snug text-secondary">
              Chép bữa từ hôm qua, hoặc thêm món vào từng bữa bằng +.
            </p>
            <button
              type="button"
              onClick={() => setIsCopySheetOpen(true)}
              className="min-h-[52px] w-full cursor-pointer rounded-full border-0 bg-blue text-[15px] font-bold text-on-accent active:scale-[0.97] motion-reduce:active:scale-100"
            >
              Chép hôm qua
            </button>
          </section>
        )}

        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
          <section
            aria-label="Chi tiết trong ngày"
            className="order-1 overflow-hidden rounded-2xl border border-card-border bg-card lg:order-2 lg:col-span-5"
          >
            <DayRow href={`/micros?date=${viewIso}`}>{microsText}</DayRow>
            <DayRow href={`/training?date=${viewIso}`}>{trainingText}</DayRow>
          </section>

          <div className="order-2 flex flex-col gap-2.5 lg:order-1 lg:col-span-7 lg:gap-5">
            {mealCards}
            {!isPast && !isEmpty && (
              <button
                type="button"
                onClick={() => setIsCopySheetOpen(true)}
                className="min-h-[52px] w-full cursor-pointer rounded-2xl border border-card-border bg-card px-4 text-[15px] font-semibold text-text active:scale-[0.97] motion-reduce:active:scale-100"
              >
                Chép hôm qua
              </button>
            )}
          </div>
        </div>
      </main>

      <MealMenuSheet
        open={menuSlot !== null && !isPast}
        onClose={() => setMenuSlot(null)}
        mealName={menuMeal?.name ?? ""}
        itemCount={menuMeal?.items.length ?? 0}
        kcal={menuMeal?.kcal ?? 0}
        yesterdayItemCount={yesterdayMeal.length}
        yesterdayKcal={yesterdayMeal.reduce((sum, e) => sum + e.calories, 0)}
        onCopyYesterday={copyMealFromYesterday}
        onDelete={() => menuSlot && deleteMeal(menuSlot)}
      />
      <CopyYesterdaySheet open={isCopySheetOpen} onClose={() => setIsCopySheetOpen(false)} />
      {calendarSheet}
    </AppShell>
  );
}
