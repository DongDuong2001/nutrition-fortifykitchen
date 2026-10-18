"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useShellBottomBar } from "@/components/ui/shell-slot";
import { AppHeader, HEADER_ICON_BUTTON } from "@/components/ui/app-header";
import { IconShare } from "@/components/ui/icons";
import { SyncStatus } from "./sync-status";
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
import { emitSignal, subscribeSignal } from "@/lib/tour-bus";
import { useCoaching } from "@/hooks/use-coaching";
import { useSaveDisplayName } from "@/hooks/use-save-display-name";
import { LevelNoticeCard } from "@/components/coaching/level-notice-card";
import { ZERO_HINT_TEXT, levelLabel, noticeText } from "@/lib/level-copy";
import { columnGroups, countedForLevel, levelSummary, sumExtras } from "@/lib/level-nutrients";
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
import { HOME_ROUTE } from "@/lib/nav";
import { navigateFromSheet } from "@/lib/sheet-history";

// cc-51: loaded after the first paint (the share image with html-to-image, Có gì mới); neither shows until it opens
const ShareSheet = dynamic(() => import("./share-sheet").then((m) => m.ShareSheet), { ssr: false });
// cc-58: the sheets that are closed by default, and select mode's bars, are their own chunks. They are fetched on the
// first touch or when the browser is idle (loadSheets), well before a tap opens one, so the open motion still plays
const loadCalendar = () => import("@/components/calendar-sheet");
const loadCopyYesterday = () => import("@/components/copy-yesterday-sheet");
const loadMealMenu = () => import("@/components/diary/meal-menu-sheet");
const loadSources = () => import("./nutrient-sources-sheet");
const loadExplainer = () => import("@/components/coaching/level-explainer-sheet");
const loadSelect = () => import("./select-mode");
const CalendarSheet = dynamic(() => loadCalendar().then((m) => m.CalendarSheet), { ssr: false });
const CopyYesterdaySheet = dynamic(() => loadCopyYesterday().then((m) => m.CopyYesterdaySheet), { ssr: false });
const MealMenuSheet = dynamic(() => loadMealMenu().then((m) => m.MealMenuSheet), { ssr: false });
const NutrientSourcesSheet = dynamic(() => loadSources().then((m) => m.NutrientSourcesSheet), { ssr: false });
const LevelExplainerSheet = dynamic(() => loadExplainer().then((m) => m.LevelExplainerSheet), { ssr: false });
const DayMenuSheet = dynamic(() => loadSelect().then((m) => m.DayMenuSheet), { ssr: false });
const MealTargetSheet = dynamic(() => loadSelect().then((m) => m.MealTargetSheet), { ssr: false });
const SelectActionBar = dynamic(() => loadSelect().then((m) => m.SelectActionBar), { ssr: false });
const SelectHeader = dynamic(() => loadSelect().then((m) => m.SelectHeader), { ssr: false });
const loadShare = () => import("./share-sheet");
function loadSheets() {
  void Promise.all([loadCalendar(), loadCopyYesterday(), loadMealMenu(), loadSources(), loadExplainer(), loadSelect(), loadShare()]);
}
const WhatsNewHost = dynamic(() => import("@/components/whats-new/whats-new-host").then((m) => m.WhatsNewHost), { ssr: false });

/** The picture of Hôm nay while the diary is read (and the Suspense fallback): the ink band and the two column shapes. */
function HomeLoading({ backdrop }: { backdrop: boolean }) {
  return (
    <>
        {!backdrop && <h1 className="sr-only">Hôm nay</h1>}
        <div className="h-[52px] rounded-b-[20px] bg-ink lg:hidden" />
        <main role="status" aria-busy="true" className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-3 pt-2 lg:mx-0 lg:max-w-[1240px] lg:px-8 lg:pt-8">
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
      </>
  );
}

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
/**
 * Hôm nay. `backdrop` (cc-55b): the picture of Hôm nay that the /add sheet sits on. The same markup, so it looks the
 * same, but nothing of its own runs: no Có gì mới, install pop-up or sheets, no sync status or pull to refresh, no tour
 * signals and no focus return. It is inert behind the sheet.
 */
export function HomeScreen({ backdrop = false }: { backdrop?: boolean } = {}) {
  return (
    <Suspense fallback={<HomeLoading backdrop={backdrop} />}>
      <HomeContent backdrop={backdrop} />
    </Suspense>
  );
}

function HomeContent({ backdrop }: { backdrop: boolean }) {
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
    addedEntries,
    getEntry,
    copyEntries,
    deleteMeal,
    deleteEntries,
    moveEntries,
    refreshToday,
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
  // The share sheet (and html-to-image with it) is mounted the first time the share button is used, and stays mounted so
  // its close animation plays
  const [shareUsed, setShareUsed] = useState(false);
  const openShare = () => {
    setShareUsed(true);
    setIsShareOpen(true);
  };
  const [menuSlot, setMenuSlot] = useState<MealSlot | null>(null);
  // cc-51 D4: the nutrient whose foods are listed in a sheet
  const [sourcesOf, setSourcesOf] = useState<string | null>(null);
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
    () => (isPast && viewIsoParam && todayIso ? pastDayData(viewIsoParam, todayIso, profile) : null),
    [isPast, viewIsoParam, todayIso, profile]
  );
  const day = pastData ?? diaryData;
  const viewIso = day.date;
  // cc-51: another day slides in from the side it comes from (earlier from the left); the first day does not move
  const dayMotion = useRef({ iso: viewIso, className: "" });
  if (dayMotion.current.iso !== viewIso) {
    dayMotion.current = { iso: viewIso, className: viewIso < dayMotion.current.iso ? "m-day-earlier" : "m-day-later" };
  }

  useEffect(() => {
    setClientNow(true);
  }, []);

  // cc-58: fetch the sheet chunks on the first touch, or when the browser is idle, whichever comes first
  useEffect(() => {
    if (backdrop) return;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      document.removeEventListener("pointerdown", go, true);
      loadSheets();
    };
    document.addEventListener("pointerdown", go, { capture: true, passive: true });
    const idle = typeof requestIdleCallback === "function" ? requestIdleCallback(go, { timeout: 3000 }) : window.setTimeout(go, 1500);
    return () => {
      document.removeEventListener("pointerdown", go, true);
      if (typeof requestIdleCallback === "function") cancelIdleCallback(idle as number);
      else window.clearTimeout(idle as number);
    };
  }, [backdrop]);

  // The share tip's "Thử ngay" opens the share sheet (which asks for a name first when there is none)
  useEffect(() => {
    if (backdrop) return;
    return subscribeSignal((signal) => {
        if (signal === "open-share") openShare();
        // The "Có gì mới" tour ended: leave Chọn nhiều món, nothing else changes
        if (signal === "end-select") {
          setSelecting(false);
          setSelectedIds(new Set());
          setTargetSheet(null);
        }
    });
  }, [backdrop]);

  // Return focus to the control that opened /add (same contract as the diary)
  useEffect(() => {
    if (backdrop) return;
    try {
      const returnId = sessionStorage.getItem("return_focus_id");
      if (returnId) {
        sessionStorage.removeItem("return_focus_id");
        requestAnimationFrame(() => document.getElementById(returnId)?.focus());
      }
    } catch {
      // Storage unavailable
    }
  }, [backdrop]);

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

  // cc-57: memoized, so the heavy columns only re-render when the day's numbers change (not for a sheet opening)
  const nutrientTargets = useMemo(() => Object.fromEntries(countedIds.map((id) => [id, targetOf(day, id)])), [countedIds, day]);
  const extras = useMemo(() => sumExtras(modeEntries(mode, entries)), [mode, entries]);
  const levelCounts = useMemo(
    () => (mode.kind === "day" ? levelSummary(shown.nutrients, nutrientTargets, countedIds) : undefined),
    [mode.kind, shown, nutrientTargets, countedIds]
  );
  const macroTargets = useMemo(
    () => ({ carbs: targetOf(day, "carbs"), protein: targetOf(day, "protein"), fat: targetOf(day, "fat"), fiber: targetOf(day, "fiber") }),
    [day]
  );
  // cc-57: the frame and the hero come first; the food list and the nutrient column (the heavy part) follow in a
  // second, low-priority render, so a tab tap or the + shows its first frame sooner
  const heavyReady = useDeferredValue(true, false);
  const openSources = useCallback((id: string) => {
    markUsed("nutrient-sources");
    setSourcesOf(id);
  }, []);

  const goToDay = (iso: string) => navigateFromSheet(router, iso === todayIso ? HOME_ROUTE : `${HOME_ROUTE}?date=${iso}`);

  // Select mode belongs to the day it was started on, and ends when the day has no food left
  useEffect(() => {
    setSelecting(false);
    setSelectedIds(new Set());
    setTargetSheet(null);
  }, [viewIso]);
  useEffect(() => {
    if (selecting && entries.length === 0) setSelecting(false);
  }, [selecting, entries.length]);
  useEffect(() => {
    if (!selecting && !backdrop) emitSignal("select-off");
  }, [selecting, backdrop]);
  // Foods deleted or moved away leave the chosen set
  const liveSelected = useMemo(() => new Set(chosenEntries(entries, selectedIds).map((e) => e.id)), [entries, selectedIds]);
  const exitSelect = () => {
    setSelecting(false);
    setSelectedIds(new Set());
    setTargetSheet(null);
  };
  const startSelect = (initialId?: string) => {
    setMode(DAY_MODE);
    setSelectedIds(initialId ? new Set([initialId]) : new Set());
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

  // Select mode's action bar takes the bottom nav's place (the shell's bar slot); the backdrop has no select mode
  const barHost = useShellBottomBar(selecting && !backdrop);

  const showLoading = forceLoading || !hydrated;
  const showOffline = forceOffline || !isOnline;

  if (showLoading) return <HomeLoading backdrop={backdrop} />;

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
    pills.push({ key: "training", label: `Ngày tập ${trainingValue} ›`, href: `/training?date=${viewIso}`, tour: "training-pill" });
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
      navigateFromSheet(router, HOME_ROUTE);
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
    <>
      {barHost &&
        createPortal(
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
          />,
          barHost
        )}
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
          titleAs={backdrop ? "p" : "h1"}
          variant="daily"
          title="Hôm nay"
          wordmark
          compact
          date={day.date}
          onPrev={() => goToDay(shiftIsoDate(viewIso, -1))}
          onNext={isPast ? () => goToDay(shiftIsoDate(viewIso, 1)) : undefined}
          canGoNext={isPast}
          onDateTap={() => setIsCalendarOpen(true)}
          alignGroup="home-page"
          alignMode="page"
          subtitle={desktopSubtitle}
          actions={
            // header-actions: where the sync status shows, for the tour when there is no status to point at
            <div data-tour="header-actions" className="flex items-center gap-2">
            {!isPast && !backdrop && <SyncStatus />}
            <button
              type="button"
              onClick={openShare}
              onPointerDown={() => void loadShare()}
              disabled={nothingLogged}
              aria-label="Chia sẻ ngày này"
              data-tour="home-share"
              aria-haspopup="dialog"
              aria-describedby={nothingLogged ? "share-reason" : undefined}
              className={`${HEADER_ICON_BUTTON} disabled:cursor-default disabled:opacity-50`}
            >
              <IconShare />
            </button>
            </div>
          }
          phoneStart={
            isPast ? (
              <Link
                href={HOME_ROUTE}
                className="-ml-2 inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-2 text-[13px] font-bold text-sky no-underline hover:underline active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-sky"
              >
                Về hôm nay
              </Link>
            ) : undefined
          }
        />
        )}
        {nothingLogged && !selecting && (
          <p id="share-reason" className="sr-only">
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
          // cc-58: a bar over the page, above the bottom nav, so it pushes nothing down when it appears
          <div
            role="status"
            className="pointer-events-none fixed inset-x-3 bottom-[calc(80px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[366px] rounded-xl bg-warning-bg px-3 py-2 text-[13px] leading-snug text-warning-text shadow-card lg:inset-x-auto lg:bottom-4 lg:right-8 lg:mx-0 lg:w-[400px] lg:max-w-none"
          >
            Đang ngoại tuyến — món mới sẽ đồng bộ khi có mạng.
          </div>
        )}
        <div className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col lg:mx-0 lg:max-w-[1240px] lg:px-8">
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
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-1 text-[13px] font-bold text-blue active:scale-[0.97] transition-press motion-reduce:active:scale-100"
              >
                <span>{levelLabel(level, coach.name)}</span>
                <span aria-hidden="true">›</span>
              </button>
            </div>
          )}
          <div key={viewIso} data-align-group="home-page" data-align-from="lg" className={`${dayMotion.current.className} flex min-h-0 flex-1 border-t border-t-divider lg:gap-4 lg:border-t-0 lg:pb-8 ${coach && !selecting ? "lg:mt-2" : "mt-2 lg:mt-4"}`}>
            {!heavyReady && <div className="flex-1" aria-hidden="true" />}
            {heavyReady && (
              <FoodList
                meals={meals}
                dayKey={viewIso}
                onPullRefresh={isPast || backdrop ? undefined : refreshToday}
                mode={mode}
                readOnly={isPast}
                isEmpty={nothingLogged}
                canCopyYesterday={!isPast && nothingLogged && yesterdayEntries.length > 0}
                onFood={(id) => setMode(toggleFood(mode, id))}
                onMeal={(slot) => setMode(toggleMeal(mode, slot))}
                onCopyYesterday={() => setIsCopySheetOpen(true)}
                onLongPressSelect={(id) => startSelect(id)}
                onMoveFood={(id, targetSlot) => {
                  if (isPast) return;
                  moveEntries([id], targetSlot, viewIso);
                }}
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
            )}
            {heavyReady && !selecting && (
              <NutrientColumn
                values={shown}
                extras={extras}
                groups={groups}
                summary={levelCounts}
                targets={nutrientTargets}
                selected={selected}
                microsHref={`/micros?date=${viewIso}`}
                onNutrient={isPast ? undefined : openSources}
              />
            )}
          </div>
        </div>
      </div>

      {!backdrop && (
      <>
      <NutrientSourcesSheet
        nutrient={sourcesOf}
        value={sourcesOf ? shown.nutrients[sourcesOf] ?? null : null}
        target={sourcesOf ? nutrientTargets[sourcesOf] ?? null : null}
        onClose={() => setSourcesOf(null)}
      />
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
      <WhatsNewHost busy={installBusy} />
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
      {shareUsed && (
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
      )}
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
      </>
      )}
    </>
  );
}
