"use client";

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { AppHeader, HEADER_ICON_BUTTON } from "@/components/ui/app-header";
import { IconShare } from "@/components/ui/icons";
import { CalendarSheet } from "@/components/calendar-sheet";
import { CopyYesterdaySheet } from "@/components/copy-yesterday-sheet";
import { MealMenuSheet } from "@/components/diary/meal-menu-sheet";
import { copyMeals, dayEntries, shiftIsoDate, viewedIsoDate } from "@/lib/day-history";
import { defaultMealName } from "@/lib/saved-meals";
import { pastDayData, useDiary } from "@/lib/diary-store";
import { formatDesktopDate } from "@/lib/format";
import { kcalLabel, sumKcal } from "@/lib/kcal";
import { trainingTile } from "@/lib/diary-rows";
import { calculateSaltTarget } from "@/lib/training";
import {
  DAY_MODE,
  entriesFromAdded,
  entriesFromDay,
  groupMeals,
  heroLabel,
  modeEntries,
  sumEntries,
  targetOf,
  toggleFood,
  toggleMeal,
  unknownKcalNote,
  valuesFromDay,
  type HomeMode,
} from "@/lib/home";
import type { MealSlot } from "@/lib/meal-slot";
import { InstallPromptHost } from "@/components/pwa/install-prompt";
import { FoodList } from "./food-list";
import { markUsed } from "@/lib/onboarding-store";
import { emitSignal } from "@/lib/tour-bus";
import { useCoaching } from "@/hooks/use-coaching";
import { useSaveDisplayName } from "@/hooks/use-save-display-name";
import { LevelExplainerSheet } from "@/components/coaching/level-explainer-sheet";
import { LevelNoticeCard } from "@/components/coaching/level-notice-card";
import { ZERO_HINT_TEXT, levelLabel, noticeText } from "@/lib/level-copy";
import { columnGroups, countedForLevel, levelSummary, sumExtras } from "@/lib/level-nutrients";
import { DayMenuSheet, MealTargetSheet, SelectActionBar, SelectHeader } from "./select-mode";
import {
  chosenEntries,
  chosenKcal,
  copyHomeEntries,
  ddMm,
  pastCopySubtitle,
  pastCopyTitle,
  pastCopyToast,
  selectAll,
  toggleId,
  toggleMealSelection,
  type CopyTarget,
} from "@/lib/multi-select";
import { formatDayLabel } from "@/lib/format";
import { getMealSlotNameVi } from "@/lib/meal-slot";
import { HomeHero, type HeroPill } from "./home-hero";
import { NutrientColumn } from "./nutrient-column";
import { ShareSheet } from "./share-sheet";

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

  const {
    data: diaryData,
    hydrated,
    todayIso,
    dayArchive,
    profile,
    targets,
    addedEntries,
    getEntry,
    copyEntries,
    deleteMeal,
    deleteEntries,
    moveEntries,
    mealFoods,
    saveMealAs,
  } = useDiary();
  const saveName = useSaveDisplayName();

  // The Level decides which nutrients the column lists (lib/level-nutrients)
  const { level, coach, notice, showHint, dismissNotice, dismissHint } = useCoaching();
  const [explainerOpen, setExplainerOpen] = useState(false);
  const groups = useMemo(() => columnGroups(level), [level]);
  const countedIds = useMemo(() => countedForLevel(level), [level]);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCopySheetOpen, setIsCopySheetOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [menuSlot, setMenuSlot] = useState<MealSlot | null>(null);
  // Chọn nhiều món: the day's ⋯ menu, the chosen set, and which target sheet is open
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [targetSheet, setTargetSheet] = useState<"copy" | "move" | "past" | null>(null);
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

  // Select mode belongs to the day it was started on, and ends when the day has no food left
  useEffect(() => {
    setSelecting(false);
    setSelectedIds(new Set());
    setTargetSheet(null);
  }, [viewIso]);
  useEffect(() => {
    if (selecting && entries.length === 0) setSelecting(false);
  }, [selecting, entries.length]);
  // Foods deleted or moved away leave the chosen set
  const liveSelected = useMemo(() => new Set(chosenEntries(entries, selectedIds).map((e) => e.id)), [entries, selectedIds]);
  const exitSelect = () => {
    setSelecting(false);
    setSelectedIds(new Set());
    setTargetSheet(null);
  };
  const startSelect = () => {
    setMode(DAY_MODE);
    setSelectedIds(new Set());
    setSelecting(true);
    emitSignal("select-mode");
  };

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
    if (!nothingLogged) {
      pills.push({ key: "day-menu", label: "⋯", id: "home-day-menu", ariaLabel: "Tùy chọn ngày", onClick: () => setDayMenuOpen(true) });
    }
  } else {
    if (!isPast && mode.kind === "food") pills.push({ key: "edit", label: "Sửa", href: `/entry/${mode.id}`, ariaLabel: "Sửa món này" });
    if (mode.kind === "meal") {
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

  const nutrientTargets = Object.fromEntries(countedIds.map((id) => [id, targetOf(day, id)]));
  const extras = sumExtras(modeEntries(mode, entries));
  const levelCounts = mode.kind === "day" ? levelSummary(shown.nutrients, nutrientTargets, countedIds) : undefined;
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

  // The install pop-up waits while anything else is open, and on a past day
  const installBusy =
    isPast || selecting || isCalendarOpen || isCopySheetOpen || isShareOpen || explainerOpen || dayMenuOpen || menuSlot !== null || targetSheet !== null;

  const chosen = chosenEntries(entries, liveSelected);
  const chosenCount = chosen.length;
  const dayLabel = clientNow ? formatDayLabel(day.date, new Date()) : day.date;
  const todayDdMm = todayIso ? ddMm(todayIso) : "";

  function confirmCopy(target: CopyTarget) {
    if (target === "keep" && !isPast) return;
    const copies = copyHomeEntries(chosen, target, `copy-${Date.now()}`, new Date().toISOString());
    markUsed(isPast ? "copy-to-today" : "multi-select-action");
    if (isPast) {
      copyEntries(copies, pastCopyToast(copies.length));
      exitSelect();
      router.push("/");
      return;
    }
    const slot = target === "keep" ? "breakfast" : target;
    copyEntries(copies, `Đã chép ${copies.length} món sang ${getMealSlotNameVi(slot)}`);
    exitSelect();
  }

  function confirmMove(target: CopyTarget) {
    // A past day is read-only: nothing moves there
    if (target === "keep" || isPast) return;
    moveEntries([...liveSelected], target, viewIso);
    markUsed("multi-select-action");
    exitSelect();
  }

  return (
    <AppShell
      alignContainer="home-page"
      bottomBar={
        selecting ? (
          <SelectActionBar
            count={chosenCount}
            kcal={chosenKcal(entries, liveSelected)}
            past={isPast}
            onCopy={() => setTargetSheet("copy")}
            onMove={() => setTargetSheet("move")}
            onDelete={() => {
              if (isPast) return;
              deleteEntries([...liveSelected], viewIso);
              markUsed("multi-select-action");
              exitSelect();
            }}
            onCopyToToday={() => setTargetSheet("past")}
          />
        ) : undefined
      }
    >
      <div
        className={`flex flex-col ${
          selecting
            ? "h-[calc(100dvh-112px-env(safe-area-inset-bottom))]"
            : "h-[calc(100dvh-88px-env(safe-area-inset-bottom))] lg:h-dvh"
        }`}
      >
        {selecting ? (
          <SelectHeader
            count={chosenCount}
            dateLabel={dayLabel}
            allSelected={entries.length > 0 && chosenCount === entries.length}
            onCancel={exitSelect}
            onToggleAll={() => setSelectedIds(chosenCount === entries.length ? new Set() : selectAll(entries))}
          />
        ) : (
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
          actions={
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              disabled={nothingLogged}
              aria-label="Chia sẻ ngày này"
              aria-haspopup="dialog"
              aria-describedby={nothingLogged ? "share-reason" : undefined}
              className={`${HEADER_ICON_BUTTON} disabled:cursor-default disabled:opacity-50`}
            >
              <IconShare />
            </button>
          }
          phoneStart={
            isPast ? (
              <Link
                href="/"
                className="-ml-2 inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-2 text-[13px] font-bold text-sky no-underline hover:underline active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-sky"
              >
                Về hôm nay
              </Link>
            ) : undefined
          }
        />
        )}
        {nothingLogged && !selecting && (
          <p id="share-reason" className="m-0 mx-3 mt-2 text-[13px] leading-snug text-secondary lg:mx-8">
            Chưa có món nào để chia sẻ
          </p>
        )}
        {!selecting && coach && notice && (
          <LevelNoticeCard
            text={noticeText(coach.name, notice)}
            action={notice.kind === "raised" ? { label: "Xem", onClick: () => setExplainerOpen(true) } : undefined}
            onClose={dismissNotice}
          />
        )}
        {!selecting && !coach && showHint && (
          <LevelNoticeCard text={ZERO_HINT_TEXT} action={{ label: "Nhập mã", href: "/settings/coach" }} onClose={dismissHint} />
        )}
        {showOffline && (
          <div role="status" className="mx-3 mt-2 rounded-xl bg-warning-bg px-3 py-2 text-[13px] leading-snug text-warning-text">
            Đang ngoại tuyến — món mới sẽ đồng bộ khi có mạng.
          </div>
        )}
        <div className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col lg:mx-0 lg:max-w-[1100px] lg:px-8">
          <HomeHero
            label={heroLabel(mode, entries, meals)}
            pills={selecting ? [] : pills}
            values={shown}
            kcalTarget={{ min: targetMin, max: targetMax }}
            macroTargets={macroTargets}
            finished={isPast}
            selected={selected}
            kcalNote={unknownKcalNote(modeEntries(mode, entries))}
          />
          {coach && !selecting && (
            <div className="mt-2 flex min-h-11 flex-none items-center justify-end border-t border-t-card-border px-3 lg:px-0">
              <button
                type="button"
                onClick={() => setExplainerOpen(true)}
                aria-haspopup="dialog"
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-1 text-[13px] font-bold text-blue active:scale-[0.97] motion-reduce:active:scale-100"
              >
                <span>{levelLabel(level, coach.name)}</span>
                <span aria-hidden="true">›</span>
              </button>
            </div>
          )}
          <div className={`flex min-h-0 flex-1 border-t border-t-card-border ${coach && !selecting ? "" : "mt-2"}`}>
            <FoodList
              meals={meals}
              mode={mode}
              readOnly={isPast}
              isEmpty={nothingLogged}
              canCopyYesterday={!isPast && nothingLogged && yesterdayEntries.length > 0}
              onFood={(id) => setMode(toggleFood(mode, id))}
              onMeal={(slot) => setMode(toggleMeal(mode, slot))}
              onCopyYesterday={() => setIsCopySheetOpen(true)}
              select={
                selecting
                  ? {
                      ids: liveSelected,
                      onToggleFood: (id) => setSelectedIds((prev) => toggleId(prev, id)),
                      onToggleMeal: (slot) => {
                        const meal = meals.find((m) => m.slot === slot);
                        if (meal) setSelectedIds((prev) => toggleMealSelection(prev, meal.entries));
                      },
                    }
                  : undefined
              }
            />
            {!selecting && (
              <NutrientColumn
                values={shown}
                extras={extras}
                groups={groups}
                summary={levelCounts}
                targets={nutrientTargets}
                selected={selected}
                microsHref={`/micros?date=${viewIso}`}
              />
            )}
          </div>
        </div>
      </div>

      <MealMenuSheet
        open={menuSlot !== null}
        onClose={() => setMenuSlot(null)}
        mealName={menuMeal?.fullName ?? ""}
        readOnly={isPast}
        itemCount={menuMeal?.entries.length ?? 0}
        kcal={menuMeal?.kcal ?? null}
        savableCount={menuSlot ? mealFoods(menuSlot, viewIso).length : 0}
        defaultSaveName={menuSlot ? defaultMealName(menuSlot, viewIso) : ""}
        onSave={(name) => menuSlot && saveMealAs(menuSlot, viewIso, name)}
        yesterdayItemCount={yesterdayMeal.length}
        yesterdayKcal={sumKcal(yesterdayMeal.map((e) => e.calories))}
        onCopyYesterday={copyMealFromYesterday}
        onDelete={() => {
          if (!menuSlot) return;
          deleteMeal(menuSlot);
          setMode(DAY_MODE);
        }}
      />
      <InstallPromptHost busy={installBusy} />
      <LevelExplainerSheet open={explainerOpen} onClose={() => setExplainerOpen(false)} level={level} />
      <CopyYesterdaySheet open={isCopySheetOpen} onClose={() => setIsCopySheetOpen(false)} />
      <DayMenuSheet
        open={dayMenuOpen}
        onClose={() => setDayMenuOpen(false)}
        title={dayLabel}
        past={isPast}
        hasEntries={!nothingLogged}
        onSelect={startSelect}
      />
      <MealTargetSheet
        open={targetSheet === "copy"}
        onClose={() => setTargetSheet(null)}
        title={`Chép ${chosenCount} món sang`}
        description={`${chosenCount} món · ${kcalLabel(chosenKcal(entries, liveSelected))}`}
        withKeep={false}
        initial={chosen[0]?.slot && chosen[0].slot !== "pre_workout" ? chosen[0].slot : "breakfast"}
        confirmLabel="Chép"
        onConfirm={confirmCopy}
      />
      <MealTargetSheet
        open={targetSheet === "move"}
        onClose={() => setTargetSheet(null)}
        title={`Chuyển ${chosenCount} món sang`}
        description={`${chosenCount} món · ${kcalLabel(chosenKcal(entries, liveSelected))}`}
        withKeep={false}
        initial={chosen[0]?.slot && chosen[0].slot !== "pre_workout" ? chosen[0].slot : "breakfast"}
        confirmLabel="Chuyển"
        onConfirm={confirmMove}
      />
      <MealTargetSheet
        open={targetSheet === "past"}
        onClose={() => setTargetSheet(null)}
        title={pastCopyTitle(chosenCount)}
        description={pastCopySubtitle(dayLabel, chosenKcal(entries, liveSelected), todayDdMm)}
        withKeep
        initial="keep"
        confirmLabel="Chép vào hôm nay"
        onConfirm={confirmCopy}
      />
      <ShareSheet
        open={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        day={day}
        entries={entries}
        meals={meals}
        finished={isPast}
        displayName={profile.displayName}
        level={level}
        onSaveName={saveName}
      />
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
