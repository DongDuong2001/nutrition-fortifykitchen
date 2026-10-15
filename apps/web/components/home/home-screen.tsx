"use client";

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { AppHeader } from "@/components/ui/app-header";
import { CalendarSheet } from "@/components/calendar-sheet";
import { CopyYesterdaySheet } from "@/components/copy-yesterday-sheet";
import { MealMenuSheet } from "@/components/diary/meal-menu-sheet";
import { copyMeals, dayEntries, shiftIsoDate, viewedIsoDate } from "@/lib/day-history";
import { defaultMealName } from "@/lib/saved-meals";
import { pastDayData, useDiary } from "@/lib/diary-store";
import { formatDesktopDate } from "@/lib/format";
import { trainingTile } from "@/lib/diary-rows";
import { calculateSaltTarget } from "@/lib/training";
import {
  DAY_MODE,
  HOME_NUTRIENT_GROUPS,
  entriesFromAdded,
  entriesFromDay,
  groupMeals,
  heroLabel,
  modeEntries,
  sumEntries,
  targetOf,
  toggleFood,
  toggleMeal,
  valuesFromDay,
  type HomeMode,
} from "@/lib/home";
import type { MealSlot } from "@/lib/meal-slot";
import { FoodList } from "./food-list";
import { HomeHero, type HeroPill } from "./home-hero";
import { NutrientColumn } from "./nutrient-column";

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

const NUTRIENT_IDS = HOME_NUTRIENT_GROUPS.flatMap((g) => g.ids);

/**
 * Hôm nay (/): the day at a glance. The ink card holds the day's kcal and macros, the food list on the left
 * and the 14 watched nutrients on the right. Tap a food or a meal to see that alone; ?date= shows a past day
 * (read-only). Everything the Nhật ký day view did lives here.
 */
export function HomeScreen() {
  return (
    <Suspense fallback={<div className="min-h-dvh w-full bg-page" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const forceLoading = searchParams?.get("loading") === "1";
  const forceOffline = searchParams?.get("offline") === "1";
  const router = useRouter();

  const { data: diaryData, hydrated, todayIso, dayArchive, profile, targets, addedEntries, getEntry, copyEntries, deleteMeal, mealFoods, saveMealAs } =
    useDiary();

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCopySheetOpen, setIsCopySheetOpen] = useState(false);
  const [menuSlot, setMenuSlot] = useState<MealSlot | null>(null);
  const [picked, setPicked] = useState<{ iso: string; mode: HomeMode }>({ iso: "", mode: DAY_MODE });
  const [clientNow, setClientNow] = useState(false);
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);

  const viewIsoParam = hydrated && todayIso ? viewedIsoDate(searchParams?.get("date"), todayIso) : null;
  const isPast = viewIsoParam !== null && viewIsoParam !== todayIso;
  const pastData = useMemo(
    () => (isPast && viewIsoParam && todayIso ? pastDayData(viewIsoParam, todayIso, profile, targets) : null),
    [isPast, viewIsoParam, todayIso, profile, targets]
  );
  const day = pastData ?? diaryData;
  const viewIso = day.date;

  useEffect(() => {
    setClientNow(true);
  }, []);

  // Return focus to the control that opened /add (same contract as the diary)
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

  const entries = useMemo(() => {
    if (isPast && viewIsoParam && todayIso) return entriesFromAdded(dayEntries(viewIsoParam, todayIso));
    return entriesFromDay(diaryData, getEntry, addedEntries);
    // dayArchive: a day filed by the store changes what dayEntries returns
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPast, viewIsoParam, todayIso, diaryData, getEntry, addedEntries, dayArchive]);
  const meals = useMemo(() => groupMeals(entries), [entries]);

  // The mode belongs to the day it was picked on
  const mode = picked.iso === viewIso ? picked.mode : DAY_MODE;
  const setMode = (next: HomeMode) => setPicked({ iso: viewIso, mode: next });
  const shown = useMemo(() => (mode.kind === "day" ? valuesFromDay(day) : sumEntries(modeEntries(mode, entries))), [mode, day, entries]);

  const goToDay = (iso: string) => router.push(iso === todayIso ? "/" : `/?date=${iso}`);

  const yesterdayEntries = useMemo(() => (todayIso ? dayEntries(shiftIsoDate(todayIso, -1), todayIso) : []), [todayIso, dayArchive]); // eslint-disable-line react-hooks/exhaustive-deps
  const menuMeal = menuSlot ? meals.find((m) => m.slot === menuSlot) ?? null : null;
  const yesterdayMeal = useMemo(() => (menuSlot ? yesterdayEntries.filter((e) => e.mealSlot === menuSlot) : []), [menuSlot, yesterdayEntries]);

  function copyMealFromYesterday() {
    if (!menuSlot || !menuMeal || yesterdayMeal.length === 0) return;
    const copies = copyMeals(yesterdayMeal, [menuSlot], `copy-${Date.now()}`, new Date().toISOString());
    copyEntries(copies, `Đã chép ${menuMeal.fullName} từ hôm qua · ${copies.length} món`);
  }

  const showLoading = forceLoading || !hydrated;
  const showOffline = forceOffline || !isOnline;

  if (showLoading) {
    return (
      <AppShell>
        <h1 className="sr-only">Hôm nay</h1>
        <div className="h-[52px] rounded-b-[20px] bg-ink lg:hidden" />
        <main role="status" aria-busy="true" className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-3 pt-2 lg:mx-0 lg:max-w-[1100px] lg:px-8 lg:pt-8">
          <span className="sr-only">Đang tải…</span>
          <div className="h-[152px] rounded-2xl bg-surface-dark motion-safe:animate-pulse" />
          <div className="flex gap-0 motion-safe:animate-pulse">
            <div className="flex flex-1 flex-col gap-2 p-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-5 rounded bg-level-empty" />
              ))}
            </div>
            <div className="flex w-[198px] flex-col gap-2 bg-card p-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-5 rounded bg-level-empty" />
              ))}
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  const nothingLogged = entries.length === 0;
  const selected = mode.kind !== "day";
  const targetMin = day.calories.targetMin;
  const targetMax = day.calories.targetMax;
  const trainingValue = trainingTile({
    minutes: day.user.trainingMinutes,
    saltText: calculateSaltTarget(day.user.trainingMinutes).formattedTotal,
    past: isPast,
  }).value;

  const pills: HeroPill[] = [];
  if (mode.kind === "day") {
    pills.push({ key: "training", label: `Ngày tập ${trainingValue} ›`, href: `/training?date=${viewIso}` });
  } else {
    if (!isPast && mode.kind === "food") pills.push({ key: "edit", label: "Sửa", href: `/entry/${mode.id}`, ariaLabel: "Sửa món này" });
    if (!isPast && mode.kind === "meal") {
      const meal = meals.find((m) => m.slot === mode.slot);
      pills.push({
        key: "menu",
        label: "⋯",
        id: `home-meal-menu-${mode.slot}`,
        ariaLabel: `Tùy chọn ${meal?.fullName ?? "bữa"}`,
        onClick: () => setMenuSlot(mode.slot),
      });
    }
    pills.push({ key: "clear", label: "Xem cả ngày ×", onClick: () => setMode(DAY_MODE) });
  }

  const caption = mode.kind === "food" ? "Món này · % mục tiêu ngày" : mode.kind === "meal" ? "Bữa này · % mục tiêu ngày" : "Cả ngày · % mục tiêu";
  const nutrientTargets = Object.fromEntries(NUTRIENT_IDS.map((id) => [id, targetOf(day, id)]));
  const macroTargets = {
    carbs: targetOf(day, "carbs"),
    protein: targetOf(day, "protein"),
    fat: targetOf(day, "fat"),
    fiber: targetOf(day, "fiber"),
  };

  const desktopSubtitle = clientNow ? (
    <>
      <button
        type="button"
        onClick={() => setIsCalendarOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Chọn ngày, ${formatDesktopDate(day.date)}`}
        className="inline-flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent p-0 text-inherit underline-offset-4 hover:underline"
      >
        {formatDesktopDate(day.date)}
      </button>
      {isPast ? " · Chỉ xem" : ""}
    </>
  ) : (
    day.desktopDateLabel
  );

  return (
    <AppShell alignContainer="home-page">
      <div className="flex h-[calc(100dvh-88px-env(safe-area-inset-bottom))] flex-col lg:h-dvh">
        <AppHeader
          variant="daily"
          title="Hôm nay"
          wordmark
          compact
          date={day.date}
          onPrev={() => goToDay(shiftIsoDate(viewIso, -1))}
          onNext={isPast ? () => goToDay(shiftIsoDate(viewIso, 1)) : undefined}
          canGoNext={isPast}
          onDateTap={() => setIsCalendarOpen(true)}
          alignGroup="home-header"
          subtitle={desktopSubtitle}
        />
        {showOffline && (
          <div role="status" className="mx-3 mt-2 rounded-xl bg-warning-bg px-3 py-2 text-[13px] leading-snug text-warning-text">
            Đang ngoại tuyến — món mới sẽ đồng bộ khi có mạng.
          </div>
        )}
        <div className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col lg:mx-0 lg:max-w-[1100px] lg:px-8">
          <HomeHero
            label={heroLabel(mode, entries, meals)}
            pills={pills}
            values={shown}
            kcalTarget={{ min: targetMin, max: targetMax }}
            macroTargets={macroTargets}
            finished={isPast}
            selected={selected}
          />
          <div className="mt-2 flex min-h-0 flex-1 border-t border-t-card-border">
            <FoodList
              meals={meals}
              mode={mode}
              readOnly={isPast}
              isEmpty={nothingLogged}
              canCopyYesterday={!isPast && nothingLogged && yesterdayEntries.length > 0}
              onFood={(id) => setMode(toggleFood(mode, id))}
              onMeal={(slot) => setMode(toggleMeal(mode, slot))}
              onCopyYesterday={() => setIsCopySheetOpen(true)}
            />
            <NutrientColumn
              values={shown}
              targets={nutrientTargets}
              caption={caption}
              selected={selected}
              finished={isPast}
              microsHref={`/micros?date=${viewIso}`}
            />
          </div>
        </div>
      </div>

      <MealMenuSheet
        open={menuSlot !== null}
        onClose={() => setMenuSlot(null)}
        mealName={menuMeal?.fullName ?? ""}
        readOnly={isPast}
        itemCount={menuMeal?.entries.length ?? 0}
        kcal={menuMeal?.kcal ?? 0}
        savableCount={menuSlot ? mealFoods(menuSlot, viewIso).length : 0}
        defaultSaveName={menuSlot ? defaultMealName(menuSlot, viewIso) : ""}
        onSave={(name) => menuSlot && saveMealAs(menuSlot, viewIso, name)}
        yesterdayItemCount={yesterdayMeal.length}
        yesterdayKcal={yesterdayMeal.reduce((sum, e) => sum + e.calories, 0)}
        onCopyYesterday={copyMealFromYesterday}
        onDelete={() => {
          if (!menuSlot) return;
          deleteMeal(menuSlot);
          setMode(DAY_MODE);
        }}
      />
      <CopyYesterdaySheet open={isCopySheetOpen} onClose={() => setIsCopySheetOpen(false)} />
      {todayIso && (
        <CalendarSheet
          open={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          selectedIso={viewIso}
          onPick={(iso) => {
            setIsCalendarOpen(false);
            goToDay(iso);
          }}
        />
      )}
    </AppShell>
  );
}
