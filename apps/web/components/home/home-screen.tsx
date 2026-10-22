"use client";

import dynamic from "next/dynamic";
import { Suspense, startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { whenIdle } from "@/lib/idle";
import { loadFoodRows } from "@/lib/food-rows";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useShellBottomBar } from "@/components/ui/shell-slot";
import { AppHeader, CalendarGlyph } from "@/components/ui/app-header";
import { TabWash } from "@/components/ui/tab-wash";
import { IconShare } from "@/components/ui/icons";
import { setHomeDay } from "@/lib/home-scroll";
import { copyMeals, dayEntries, entriesKcal, shiftIsoDate, viewedIsoDate } from "@/lib/day-history";
import { defaultMealName } from "@/lib/saved-meals";
import { CATALOG_FOODS } from "@/lib/catalog";
import {
  applyTemplate,
  buildDayTemplate,
  dayTemplateMeals,
  defaultTemplateName,
  defaultTemplateTag,
  fallbackTemplateName,
  mealNamesLine,
  mealsKcalLine,
  templateSavedMessage,
  templateSaveSummary,
  yesterdayCopyMessage,
  yesterdayCopySlots,
  type DayTemplateTag,
} from "@/lib/day-templates";
import { useDayTemplateRows, useTemplatePillHidden } from "@/hooks/use-day-templates";
import { generateUuid } from "@/lib/uuid";
import type { PickerOption } from "./template-picker-sheet";
import { pastDayData, useDiary, useDiaryToast } from "@/lib/diary-store";
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
import { loadFlags, markShareNudgeDay, markUsed, onboardingDisabled } from "@/lib/onboarding-store";
import { SHARE_NUDGE_TEXT, dayWellFed, shareNudgeDue } from "@/lib/share-nudge";
import { emitSignal, subscribeSignal } from "@/lib/tour-bus";
import { useCoaching } from "@/hooks/use-coaching";
import { useSaveDisplayName } from "@/hooks/use-save-display-name";
import { LevelNoticeCard } from "@/components/coaching/level-notice-card";
import { Expand } from "@/components/ui/expand";
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
import type { HeroMacro } from "@/lib/macro-kcal";
import { HOME_ROUTE } from "@/lib/nav";
import { navigateFromSheet } from "@/lib/sheet-history";
import { WhatsNewDue } from "@/components/whats-new/whats-new-due";

/**
 * share-spotlight: whether today was over the nudge's line the last time Hôm nay looked, for this app open. Module state, not a ref, so an
 * add that leaves Hôm nay and comes back (Tự nhập, a food page) still counts as the day getting there; a new app open starts unknown.
 */
let lastWellFed: { iso: string; value: boolean } | null = null;

/** The picker's first card: Chép hôm qua (Chép hôm kia on yesterday). */
const YESTERDAY_OPTION = "yesterday";

/** share-spotlight (Hao 22/10): the share button says Chia sẻ (people missed the bare icon). C3: the visible pill is 34 px (light glass,
 *  14 px semibold, a 17 px glyph, 10 px before it and 12 px after the word) inside a transparent 44 px tap area, so it sits lighter
 *  next to the wordmark; the button (and its spotlight target) is the 44 px area. The pill is in rem (2.125) so it grows with the text */
const SHARE_BUTTON =
  "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-0 bg-transparent p-0 text-cobalt cursor-pointer active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-cobalt";
const SHARE_PILL = "inline-flex h-[2.125rem] items-center gap-1.5 rounded-full pl-2.5 pr-3 text-sm font-semibold glass-light lg:bg-card lg:shadow-ring";

// cc-51, cc-58: the sheets that are closed by default, select mode's bars and the share image (html-to-image) are chunks of their
// own, fetched on the first touch or when the browser is idle (loadSheets). They are not next/dynamic: a dynamic component
// that suspends the first time it renders is shown only 300 ms after its fallback (React throttles a reveal), so the first open of
// each sheet took 300 ms longer than the second. Here the modules are resolved first, kept in a module variable, and every sheet is
// then mounted closed once, so a first open only toggles `open`, as fast as the second.
const loadCalendar = () => import("@/components/calendar-sheet");
const loadMealMenu = () => import("@/components/diary/meal-menu-sheet");
const loadSources = () => import("./nutrient-sources-sheet");
const loadExplainer = () => import("@/components/coaching/level-explainer-sheet");
const loadSelect = () => import("./select-mode");
const loadShare = () => import("./share-sheet");
const loadSaveDay = () => import("./save-day-sheet");
const loadTemplatePicker = () => import("./template-picker-sheet");

interface HomeSheets {
  CalendarSheet: Awaited<ReturnType<typeof loadCalendar>>["CalendarSheet"];
  MealMenuSheet: Awaited<ReturnType<typeof loadMealMenu>>["MealMenuSheet"];
  NutrientSourcesSheet: Awaited<ReturnType<typeof loadSources>>["NutrientSourcesSheet"];
  LevelExplainerSheet: Awaited<ReturnType<typeof loadExplainer>>["LevelExplainerSheet"];
  DayMenuSheet: Awaited<ReturnType<typeof loadSelect>>["DayMenuSheet"];
  MealTargetSheet: Awaited<ReturnType<typeof loadSelect>>["MealTargetSheet"];
  SelectActionBar: Awaited<ReturnType<typeof loadSelect>>["SelectActionBar"];
  SelectHeader: Awaited<ReturnType<typeof loadSelect>>["SelectHeader"];
  ShareSheet: Awaited<ReturnType<typeof loadShare>>["ShareSheet"];
  SaveDaySheet: Awaited<ReturnType<typeof loadSaveDay>>["SaveDaySheet"];
  TemplatePickerSheet: Awaited<ReturnType<typeof loadTemplatePicker>>["TemplatePickerSheet"];
}
let loadedSheets: HomeSheets | null = null;
let sheetsLoading: Promise<void> | null = null;
const sheetListeners = new Set<() => void>();
function loadSheets(): Promise<void> {
  sheetsLoading ??= Promise.all([loadCalendar(), loadMealMenu(), loadSources(), loadExplainer(), loadSelect(), loadShare(), loadSaveDay(), loadTemplatePicker()])
    .then(([cal, menu, src, exp, sel, share, saveDay, picker]) => {
      loadedSheets = {
        CalendarSheet: cal.CalendarSheet,
        MealMenuSheet: menu.MealMenuSheet,
        NutrientSourcesSheet: src.NutrientSourcesSheet,
        LevelExplainerSheet: exp.LevelExplainerSheet,
        DayMenuSheet: sel.DayMenuSheet,
        MealTargetSheet: sel.MealTargetSheet,
        SelectActionBar: sel.SelectActionBar,
        SelectHeader: sel.SelectHeader,
        ShareSheet: share.ShareSheet,
        SaveDaySheet: saveDay.SaveDaySheet,
        TemplatePickerSheet: picker.TemplatePickerSheet,
      };
      sheetListeners.forEach((l) => l());
    })
    .catch(() => {
      // Offline before the chunks were cached: the next touch tries again
      sheetsLoading = null;
    });
  return sheetsLoading;
}
const subscribeSheets = (listener: () => void) => {
  sheetListeners.add(listener);
  return () => void sheetListeners.delete(listener);
};
/**
 * The sheets once their chunks are in (null before): mounted closed as soon as they are, so no first open waits for a chunk. The
 * commit that mounts the eleven of them is a transition: a render that lands in the middle of the add sheet's slide yields to it.
 */
function useHomeSheets(): HomeSheets | null {
  const [sheets, setSheets] = useState<HomeSheets | null>(() => loadedSheets);
  useEffect(() => {
    if (loadedSheets) {
      setSheets(loadedSheets);
      return;
    }
    return subscribeSheets(() => startTransition(() => setSheets(loadedSheets)));
  }, []);
  return sheets;
}
/** True from the first time `open` is true, or from `ready`: a sheet is mounted closed once its chunk is in, so it costs nothing before that. */
function useOnceOpen(open: boolean, ready = false): boolean {
  const [seen, setSeen] = useState(open);
  if (open && !seen) setSeen(true);
  return seen || open || ready;
}
const WhatsNewHost = dynamic(() => import("@/components/whats-new/whats-new-host").then((m) => m.WhatsNewHost), { ssr: false });

/** The picture of Hôm nay while the diary is read (and the Suspense fallback): the header rows, the ink card and the two white cards. */
function HomeLoading() {
  return (
    <>
        <h1 className="sr-only">Hôm nay</h1>
        <div className="h-[96px] lg:hidden" />
        <main role="status" aria-busy="true" className="mx-auto flex w-full max-w-[560px] flex-col gap-2 px-3 pt-2 lg:mx-0 lg:max-w-[1240px] lg:px-8 lg:pt-8">
          <span className="sr-only">Đang tải…</span>
          <div className="h-[152px] rounded-2xl bg-ink motion-safe:animate-pulse" />
          <div className="flex items-start gap-2 motion-safe:animate-pulse">
            <HomeBodySkeleton />
          </div>
        </main>
      </>
  );
}

/** True once Hôm nay has been on screen in this page session: only the very first draw is split in two. */
let homeDrawn = false;

/** The meals card and the vi chất card as shapes, for the one frame (the app's first load) before they are drawn. */
function HomeBodySkeleton() {
  return (
    <>
      <div aria-hidden="true" className="flex min-h-[320px] flex-1 flex-col gap-2 rounded-card bg-card p-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-5 rounded bg-level-empty" />
        ))}
      </div>
      <div aria-hidden="true" className="flex min-h-[320px] w-[180px] flex-none flex-col gap-2 rounded-card bg-card p-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-5 rounded bg-level-empty" />
        ))}
      </div>
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
 * Hôm nay (the tabs' first screen at /app): the day at a glance. The ink card holds the day's kcal and macros, the food list
 * on the left and the 14 watched nutrients on the right. Tap a food or a meal to see that alone; ?date= shows a past day
 * (editable for yesterday, read-only older). The add sheet opens over it (an intercepting route) and leaves it mounted.
 */
export function HomeScreen() {
  return (
    <Suspense fallback={<HomeLoading />}>
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
    isEditable,
    loadDays,
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
    notify,
  } = useDiary();
  const { rows: templateRows, templates: savedTemplates, setTemplates } = useDayTemplateRows();
  const saveName = useSaveDisplayName();

  // The Level decides which nutrients the column lists (lib/level-nutrients)
  const { level, coach, notice, showHint, dismissNotice, dismissHint } = useCoaching();
  const [explainerOpen, setExplainerOpen] = useState(false);
  const groups = useMemo(() => columnGroups(level), [level]);
  const countedIds = useMemo(() => countedForLevel(level), [level]);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // Ngày ăn mẫu: the save sheet (day ⋯) and the picker (the "Chép ngày ăn mẫu" pill)
  const [isSaveDayOpen, setIsSaveDayOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
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

  // The day is read from the address only while the address is Hôm nay's: with the add sheet over it (/add, /add?meal=…) the
  // address has no `date` unless the opener carried it, and the day under the sheet must not flip to today and back
  const pathname = usePathname();
  const shownDateParam = useRef<string | null>(null);
  if (pathname === "/app") shownDateParam.current = searchParams?.get("date") ?? null;
  const viewIsoParam = hydrated && todayIso ? viewedIsoDate(shownDateParam.current, todayIso) : null;
  const isPast = viewIsoParam !== null && viewIsoParam !== todayIso;
  // cc-68: yesterday can be edited like today; a day older than that is read-only
  const readOnly = isPast && viewIsoParam !== null && !isEditable(viewIsoParam);
  const editablePast = isPast && !readOnly;
  // S5: a day older than yesterday is the server's: it is read (and cached on this device) when it is on screen
  useEffect(() => {
    if (readOnly && viewIsoParam) loadDays([viewIsoParam]);
  }, [readOnly, viewIsoParam, loadDays]);
  // The + of the nav adds to this day (see lib/home-scroll homeDay)
  const shownDay = editablePast ? viewIsoParam : null;
  useEffect(() => {
    setHomeDay(shownDay);
    return () => setHomeDay(null);
  }, [shownDay]);
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

  // cc-58: fetch the sheet chunks on the first touch, or when the browser is idle, whichever comes first. Never on the + that opens
  // the add sheet (the chunks and the mount of nine sheets would land in its slide): that touch is skipped, the next one or the idle
  // moment loads them, and only while Hôm nay is the page (not while the sheet is up over it).
  useEffect(() => {
    let done = false;
    let idle: number | undefined;
    let retry: number | undefined;
    const go = () => {
      if (done) return;
      if (window.location.pathname !== HOME_ROUTE) {
        retry = window.setTimeout(go, 800);
        return;
      }
      done = true;
      document.removeEventListener("pointerdown", onTouch, true);
      loadSheets();
    };
    const onTouch = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.('#mobile-add-fab, #desktop-add-btn, a[href^="/add"]')) return;
      go();
    };
    document.addEventListener("pointerdown", onTouch, { capture: true, passive: true });
    idle = typeof requestIdleCallback === "function" ? requestIdleCallback(go, { timeout: 3000 }) : window.setTimeout(go, 1500);
    return () => {
      done = true;
      document.removeEventListener("pointerdown", onTouch, true);
      if (typeof requestIdleCallback === "function") cancelIdleCallback(idle as number);
      else window.clearTimeout(idle);
      window.clearTimeout(retry);
    };
  }, []);

  // The share tip's "Thử ngay" opens the share sheet (which asks for a name first when there is none)
  useEffect(() => {
    return subscribeSignal((signal) => {
        if (signal === "open-share") openShare();
        // The "Có gì mới" tour ended: leave Chọn nhiều món, nothing else changes
        if (signal === "end-select") {
          setSelecting(false);
          setSelectedIds(new Set());
          setTargetSheet(null);
        }
    });
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

  // cc-67: the add sheet's one-row-per-food index is a chunk of its own: fetched when Hôm nay is idle, so /add has it at once
  useEffect(() => {
    return whenIdle(() => void loadFoodRows());
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

  // cc-57: memoized, so the heavy columns only re-render when the day's numbers change (not for a sheet opening)
  const nutrientTargets = useMemo(() => Object.fromEntries(countedIds.map((id) => [id, targetOf(day, id)])), [countedIds, day]);
  const extras = useMemo(() => sumExtras(modeEntries(mode, entries)), [mode, entries]);
  const levelCounts = useMemo(
    () => (mode.kind === "day" ? levelSummary(shown.nutrients, nutrientTargets, countedIds) : undefined),
    [mode.kind, shown, nutrientTargets, countedIds]
  );
  // share-spotlight: when today first reaches 80 % of its kcal with five vitamins or minerals at Gần đủ or Đạt, a 4 s toast offers
  // Chia sẻ (lib/share-nudge). It waits until Hôm nay is on screen and the toast up now (an add's Hoàn tác) has gone.
  const dayValues = useMemo(() => valuesFromDay(day), [day]);
  const wellFed = dayWellFed({ kcal: dayValues.kcal, kcalTarget: day.calories.targetMin, values: dayValues.nutrients, targets: nutrientTargets, ids: countedIds });
  const [nudgePending, setNudgePending] = useState(false);
  useEffect(() => {
    if (!hydrated || isPast || !todayIso) return;
    const was = lastWellFed?.iso === viewIso ? lastWellFed.value : null;
    lastWellFed = { iso: viewIso, value: wellFed };
    if (!onboardingDisabled() && shareNudgeDue({ flags: loadFlags(), todayIso, was, now: wellFed })) setNudgePending(true);
  }, [hydrated, isPast, todayIso, viewIso, wellFed]);
  const { toast } = useDiaryToast();
  useEffect(() => {
    if (!nudgePending || toast || pathname !== HOME_ROUTE || isPast || !todayIso) return;
    setNudgePending(false);
    markShareNudgeDay(todayIso);
    notify(SHARE_NUDGE_TEXT, "share");
  }, [nudgePending, toast, pathname, isPast, todayIso, notify]);
  // feat/hero-macro-kcal: a macro tapped on the hero shows its kcal; a change of day or of the selected meal clears it
  const [heroMacro, setHeroMacro] = useState<HeroMacro | null>(null);
  const heroMacroKey = `${viewIso} ${JSON.stringify(mode)}`;
  const [heroMacroFor, setHeroMacroFor] = useState(heroMacroKey);
  if (heroMacroFor !== heroMacroKey) {
    setHeroMacroFor(heroMacroKey);
    setHeroMacro(null);
  }
  const macroTargets = useMemo(
    () => ({ carbs: targetOf(day, "carbs"), protein: targetOf(day, "protein"), fat: targetOf(day, "fat"), fiber: targetOf(day, "fiber") }),
    [day]
  );
  // cc-57: on the very first app load the frame and the hero come first, with a skeleton where the food list and the nutrient
  // column (the heavy part) follow in a second, low-priority render. Every later visit (a tab, Back) draws it all at once: a
  // first frame with an empty list was a blank frame. (The sheet over Hôm nay no longer remounts it, so + never redraws it.)
  const heavyReady = useDeferredValue(true, homeDrawn);
  useEffect(() => {
    homeDrawn = true;
  }, []);
  // cc-58: each sheet is mounted closed once its chunk is in (see loadSheets), and open from then on by its flag
  const sheets = useHomeSheets();
  const sourcesMounted = useOnceOpen(sourcesOf !== null, sheets !== null);
  const mealMenuMounted = useOnceOpen(menuSlot !== null, sheets !== null);
  const explainerMounted = useOnceOpen(explainerOpen, sheets !== null);
  const saveDayMounted = useOnceOpen(isSaveDayOpen, sheets !== null);
  const pickerMounted = useOnceOpen(isPickerOpen, sheets !== null);
  const dayMenuMounted = useOnceOpen(dayMenuOpen, sheets !== null);
  const copyTargetMounted = useOnceOpen(targetSheet === "copy", sheets !== null);
  const moveTargetMounted = useOnceOpen(targetSheet === "move", sheets !== null);
  const pastTargetMounted = useOnceOpen(targetSheet === "past", sheets !== null);
  const calendarMounted = useOnceOpen(isCalendarOpen, sheets !== null);
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
    if (!selecting) emitSignal("select-off");
  }, [selecting]);
  // Desktop parity (23/10): Esc is Hủy while no sheet or tour step is up, and when select mode ends (Hủy, Xóa, a copy) focus goes back
  // to ⋯ instead of the page body; on a phone neither applies (no keyboard, no focus ring)
  const wasSelecting = useRef(false);
  useEffect(() => {
    if (wasSelecting.current && !selecting && window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches) {
      const active = document.activeElement;
      // The copy and move sheets close inert, so the button that closed them still holds focus there
      if (!active || active === document.body || active.closest("[inert]")) document.getElementById("home-day-menu")?.focus();
    }
    wasSelecting.current = selecting;
    if (!selecting || targetSheet !== null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || document.querySelector('[role="dialog"][aria-modal="true"], [data-onboarding-overlay]')) return;
      setSelecting(false);
      setSelectedIds(new Set());
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selecting, targetSheet]);
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
  // The day before the one on screen: what Chép hôm qua (hôm kia, on yesterday) copies from
  const dayBeforeEntries = useMemo(() => (todayIso && viewIsoParam ? dayEntries(shiftIsoDate(viewIsoParam, -1), todayIso) : []), [todayIso, viewIsoParam, dayArchive]); // eslint-disable-line react-hooks/exhaustive-deps
  const menuMeal = menuSlot ? meals.find((m) => m.slot === menuSlot) ?? null : null;
  const yesterdayMeal = useMemo(() => (menuSlot ? yesterdayEntries.filter((e) => e.mealSlot === menuSlot) : []), [menuSlot, yesterdayEntries]);

  function copyMealFromYesterday() {
    if (!menuSlot || !menuMeal || yesterdayMeal.length === 0) return;
    const copies = copyMeals(yesterdayMeal, [menuSlot], `copy-${Date.now()}`, new Date().toISOString());
    copyEntries(copies, `Đã chép ${menuMeal.fullName} từ hôm qua · ${copies.length} món`);
  }

  // Ngày ăn mẫu. The pill's × is remembered per date; the picker lists Hôm qua first (when it has food), then the saved days
  const pillHidden = useTemplatePillHidden(viewIsoParam, todayIso);
  const kcalTargetMin = day.calories.targetMin;
  const yesterdaySlots = useMemo(() => yesterdayCopySlots(dayBeforeEntries), [dayBeforeEntries]);
  const pickerOptions = useMemo<PickerOption[]>(() => {
    const options: PickerOption[] = [];
    const copied = dayBeforeEntries.filter((e) => yesterdaySlots.includes(e.mealSlot));
    if (copied.length > 0) {
      options.push({
        id: YESTERDAY_OPTION,
        name: editablePast ? "Hôm kia" : "Hôm qua",
        itemCount: copied.length,
        kcal: entriesKcal(copied) ?? 0,
        meals: mealsKcalLine(yesterdaySlots.map((slot) => ({ slot, kcal: entriesKcal(copied.filter((e) => e.mealSlot === slot)) ?? 0 }))),
      });
    }
    for (const r of templateRows) {
      options.push({ id: r.template.id, name: r.template.name, tag: r.template.tag, itemCount: r.itemCount, kcal: r.kcal, meals: mealsKcalLine(r.perMeal) });
    }
    return options;
  }, [dayBeforeEntries, yesterdaySlots, templateRows, editablePast]);
  // The day as a template: every meal's foods (lib/day-templates savableFood), empty meals left out
  const saveMeals = useMemo(() => dayTemplateMeals((slot) => mealFoods(slot, viewIso)), [mealFoods, viewIso]);

  function saveDayAsTemplate(name: string, tag: DayTemplateTag) {
    const template = buildDayTemplate({
      // A uuid: the server stores the template under this id (PUT /day-templates/{id})
      id: generateUuid(),
      name,
      tag,
      fallbackName: fallbackTemplateName(tag, viewIso),
      meals: saveMeals,
      createdAt: new Date().toISOString(),
    });
    if (!template) return;
    setTemplates([template, ...savedTemplates]);
    const totals = templateSaveSummary(template.meals, CATALOG_FOODS);
    notify(templateSavedMessage(template.name, totals.itemCount, totals.kcal));
  }

  // Both copies go through copyEntries, the call Chép hôm qua has always made: one toast, and its Hoàn tác takes out exactly what was copied
  function applyPicked(id: string) {
    if (readOnly) return;
    if (id === YESTERDAY_OPTION) {
      const copied = copyMeals(dayBeforeEntries, yesterdaySlots, `copy-${Date.now()}`, new Date().toISOString());
      copyEntries(copied, yesterdayCopyMessage(yesterdaySlots.length, !editablePast), viewIso);
      return;
    }
    const row = templateRows.find((r) => r.template.id === id);
    if (!row) return;
    const { entries: copied, message } = applyTemplate(row.template, CATALOG_FOODS, { idPrefix: `dt-${Date.now()}`, addedAt: new Date().toISOString() });
    if (copied.length === 0) notify(message);
    else copyEntries(copied, message, viewIso);
  }

  // Select mode's action bar takes the bottom nav's place (the shell's bar slot)
  const barHost = useShellBottomBar(selecting);

  const showLoading = forceLoading || !hydrated;
  // cc-64 (A2): the first draw after the skeleton fades in (a cross-fade with the skeleton that just went); later draws
  // (another day) keep the day motion, and a draw with no skeleton before it (a tab, Back) does not fade: it would start
  // from nothing, a blank frame
  const firstContent = useRef(true);
  const sawSkeleton = useRef(false);
  if (showLoading) sawSkeleton.current = true;
  useEffect(() => {
    if (!showLoading) firstContent.current = false;
  });
  const showOffline = forceOffline || !isOnline;

  if (showLoading) return <HomeLoading />;

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
    if (!nothingLogged) {
      pills.push({ key: "day-menu", label: "⋯", id: "home-day-menu", ariaLabel: "Tùy chọn ngày", tour: "day-menu", onClick: () => setDayMenuOpen(true) });
    }
  } else {
    if (!readOnly && mode.kind === "food") pills.push({ key: "edit", label: "Sửa", href: `/entry/${mode.id}`, ariaLabel: "Sửa món này" });
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

  // V3-SPEC §3.1: "Ngày tập 60′ ›" is a white pill with cobalt text at the right end of the date row (it left the hero)
  const trainingPill =
    mode.kind === "day" ? (
      <Link
        href={`/training?date=${viewIso}`}
        data-tour="training-pill"
        className="inline-flex min-h-11 flex-none items-center no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-cobalt"
      >
        <span className="inline-flex h-8 items-center whitespace-nowrap rounded-full border border-card-border bg-card px-3 text-cap font-bold text-cobalt">
          Ngày tập {trainingValue} ›
        </span>
      </Link>
    ) : null;

  const desktopSubtitle = clientNow ? (
    <>
      <button
        type="button"
        onClick={() => setIsCalendarOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Chọn ngày, ${formatDesktopDate(day.date)}`}
        data-tour="day-date"
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-inherit underline-offset-4 hover:underline"
      >
        {/* cc-72: the calendar glyph says the date opens the calendar */}
        <CalendarGlyph size={18} />
        {formatDesktopDate(day.date)}
      </button>
      {readOnly ? " · Chỉ xem" : ""}
    </>
  ) : (
    day.desktopDateLabel
  );

  // The install pop-up waits while anything else is open, and on a past day
  const sheetOpen = isCalendarOpen || isSaveDayOpen || isPickerOpen || isShareOpen || explainerOpen || dayMenuOpen || menuSlot !== null || targetSheet !== null;
  const installBusy = isPast || selecting || sheetOpen;

  const chosen = chosenEntries(entries, liveSelected);
  const chosenCount = chosen.length;
  const dayLabel = clientNow ? formatDayLabel(day.date, new Date()) : day.date;
  const todayDdMm = todayIso ? ddMm(todayIso) : "";

  function confirmCopy(target: CopyTarget) {
    if (target === "keep" && !readOnly) return;
    const copies = copyHomeEntries(chosen, target, `copy-${Date.now()}`, new Date().toISOString());
    markUsed(readOnly ? "copy-to-today" : "multi-select-action");
    if (readOnly) {
      copyEntries(copies, pastCopyToast(copies.length));
      exitSelect();
      navigateFromSheet(router, HOME_ROUTE);
      return;
    }
    const slot = target === "keep" ? "breakfast" : target;
    copyEntries(copies, `Đã chép ${copies.length} món sang ${getMealSlotNameVi(slot)}${editablePast ? " hôm qua" : ""}`, viewIso);
    exitSelect();
  }

  function confirmMove(target: CopyTarget) {
    // A day older than yesterday is read-only: nothing moves there
    if (target === "keep" || readOnly) return;
    moveEntries([...liveSelected], target, viewIso);
    markUsed("multi-select-action");
    exitSelect();
  }

  return (
    <>
      {barHost && sheets &&
        createPortal(
          <sheets.SelectActionBar
            count={chosenCount}
            kcal={chosenKcal(entries, liveSelected)}
            past={readOnly}
            onCopy={() => setTargetSheet("copy")}
            onMove={() => setTargetSheet("move")}
            onDelete={() => {
              if (readOnly) return;
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
            : "lg:h-dvh"
        }`}
      >
        {!selecting && <TabWash tone="home" />}
        {selecting ? (
          sheets && <sheets.SelectHeader
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
          dateRow={<>{trainingPill}</>}
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
            <button
              type="button"
              onClick={openShare}
              onPointerDown={() => void loadSheets()}
              disabled={nothingLogged}
              aria-label="Chia sẻ ngày này"
              data-tour="home-share"
              aria-haspopup="dialog"
              aria-describedby={nothingLogged ? "share-reason" : undefined}
              className={`${SHARE_BUTTON} disabled:cursor-default disabled:opacity-50`}
            >
              <span className={SHARE_PILL}>
                <IconShare size={17} />
                <span aria-hidden="true">Chia sẻ</span>
              </span>
            </button>
            </div>
          }
          phoneStart={
            isPast ? (
              <Link
                href={HOME_ROUTE}
                className="-ml-2 inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-2 text-cap font-bold text-sky no-underline hover:underline active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-sky"
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
        {/* cc-64 (A3): a notice opens and closes with Expand instead of pushing the page in one frame */}
        <Expand open={!selecting && !!coach && !!notice} wrapClassName="flex-none">
          {coach && notice && (
            <LevelNoticeCard
              text={noticeText(coach.name, notice)}
              action={notice.kind === "raised" ? { label: "Xem", onClick: () => setExplainerOpen(true) } : undefined}
              onClose={dismissNotice}
            />
          )}
        </Expand>
        <Expand open={!selecting && !coach && showHint} wrapClassName="flex-none">
          <LevelNoticeCard text={ZERO_HINT_TEXT} action={{ label: "Nhập mã", href: "/settings/coach" }} onClose={dismissHint} />
        </Expand>
        {showOffline && (
          // cc-58: a bar over the page, above the bottom nav, so it pushes nothing down when it appears
          <div
            role="status"
            className="pointer-events-none fixed inset-x-3 bottom-[calc(80px+var(--update-bar-h,0px)+env(safe-area-inset-bottom))] z-nav mx-auto max-w-[366px] rounded-xl bg-warning-bg px-3 py-2 text-cap leading-snug text-warning-text shadow-card lg:inset-x-auto lg:bottom-4 lg:right-8 lg:mx-0 lg:w-[400px] lg:max-w-none"
          >
            Đang ngoại tuyến — món mới sẽ đồng bộ khi có mạng.
          </div>
        )}
        <main className="relative mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col lg:mx-0 lg:max-w-[1240px] lg:px-8">
          <HomeHero
            label={heroLabel(mode, entries, meals)}
            pills={selecting ? [] : pills}
            values={shown}
            kcalTarget={{ min: targetMin, max: targetMax }}
            macroTargets={macroTargets}
            finished={isPast}
            selected={selected}
            kcalNote={unknownKcalNote(modeEntries(mode, entries))}
            countKey={`${viewIso} ${JSON.stringify(mode)}`}
            macro={heroMacro}
            onMacro={(m) => {
              if (m) markUsed("hero-macro");
              setHeroMacro(m);
            }}
          />
          {coach && !selecting && (
            <div className="mt-2 flex min-h-11 flex-none items-center justify-end px-3 lg:px-0">
              <button
                type="button"
                onClick={() => setExplainerOpen(true)}
                aria-haspopup="dialog"
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-1 text-cap font-bold text-cobalt active:scale-[0.97] transition-press motion-reduce:active:scale-100"
              >
                <span>{levelLabel(level, coach.name)}</span>
                <span aria-hidden="true">›</span>
              </button>
            </div>
          )}
          <div key={viewIso} data-align-group="home-page" data-align-from="lg" className={`${firstContent.current ? (sawSkeleton.current ? "m-content-in" : "") : dayMotion.current.className} flex min-h-0 flex-1 ${
              selecting ? "mt-2" : "mx-3 mt-2 items-start gap-2 pb-4"
            } lg:mx-0 lg:items-stretch lg:gap-4 lg:pb-8 ${coach && !selecting ? "lg:mt-2" : "lg:mt-4"}`}>
            {!heavyReady && <HomeBodySkeleton />}
            {heavyReady && (
              <FoodList
                meals={meals}
                dayKey={viewIso}
                onPullRefresh={readOnly ? undefined : refreshToday}
                mode={mode}
                readOnly={readOnly}
                dayWord={editablePast ? "hôm qua" : "hôm nay"}
                addDate={editablePast ? viewIso : undefined}
                isEmpty={nothingLogged}
                templatePill={
                  !readOnly && !pillHidden.hidden
                    ? {
                        onOpen: () => {
                          markUsed("day-template");
                          setIsPickerOpen(true);
                        },
                        onHide: pillHidden.hide,
                        hideLabel: `Ẩn gợi ý ngày ăn mẫu ${editablePast ? "hôm qua" : "hôm nay"}`,
                      }
                    : null
                }
                onFood={(id) => setMode(toggleFood(mode, id))}
                onMeal={(slot) => setMode(toggleMeal(mode, slot))}
                onLongPressSelect={(id) => startSelect(id)}
                touchDrag={!sheetOpen && sourcesOf === null}
                onMoveFood={(id, targetSlot) => {
                  if (readOnly) return;
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
                fiberTarget={macroTargets.fiber}
                targets={nutrientTargets}
                selected={selected}
                microsHref={`/micros?date=${viewIso}`}
                onNutrient={isPast ? undefined : openSources}
              />
            )}
          </div>
        </main>
      </div>

      <>
      {sheets && sourcesMounted && (
        <sheets.NutrientSourcesSheet
          nutrient={sourcesOf}
          value={sourcesOf === "fiber" ? shown.fiber : sourcesOf ? shown.nutrients[sourcesOf] ?? null : null}
          target={sourcesOf === "fiber" ? macroTargets.fiber : sourcesOf ? nutrientTargets[sourcesOf] ?? null : null}
          onClose={() => setSourcesOf(null)}
        />
      )}
      {sheets && mealMenuMounted && (
        <sheets.MealMenuSheet
          open={menuSlot !== null}
          onClose={() => setMenuSlot(null)}
          mealName={menuMeal?.fullName ?? ""}
          readOnly={readOnly}
          hideYesterday={editablePast}
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
            deleteMeal(menuSlot, viewIso);
            setMode(DAY_MODE);
          }}
        />
      )}
      <InstallPromptHost busy={installBusy} />
      <WhatsNewDue />
      <WhatsNewHost busy={installBusy} />
      {sheets && explainerMounted && <sheets.LevelExplainerSheet open={explainerOpen} onClose={() => setExplainerOpen(false)} level={level} />}
      {sheets && dayMenuMounted && (
        <sheets.DayMenuSheet
          open={dayMenuOpen}
          onClose={() => setDayMenuOpen(false)}
          title={dayLabel}
          past={readOnly}
          hasEntries={!nothingLogged}
          onSelect={startSelect}
          onSaveTemplate={() => setIsSaveDayOpen(true)}
        />
      )}
      {sheets && saveDayMounted && (
        <sheets.SaveDaySheet
          open={isSaveDayOpen}
          onClose={() => setIsSaveDayOpen(false)}
          meals={saveMeals}
          mealsText={mealNamesLine(saveMeals)}
          defaultName={defaultTemplateName(day.user.trainingMinutes)}
          defaultTag={defaultTemplateTag(day.user.trainingMinutes)}
          onSave={saveDayAsTemplate}
        />
      )}
      {sheets && pickerMounted && (
        <sheets.TemplatePickerSheet
          open={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          options={pickerOptions}
          hasTemplates={savedTemplates.length > 0}
          kcalTarget={kcalTargetMin}
          applyLabel={`Chép vào ${dayLabel}`}
          onApply={applyPicked}
        />
      )}
      {sheets && copyTargetMounted && (
        <sheets.MealTargetSheet
          open={targetSheet === "copy"}
          onClose={() => setTargetSheet(null)}
          title={`Chép ${chosenCount} món sang`}
          description={`${chosenCount} món · ${kcalLabel(chosenKcal(entries, liveSelected))}`}
          withKeep={false}
          initial={chosen[0]?.slot && chosen[0].slot !== "pre_workout" ? chosen[0].slot : "breakfast"}
          confirmLabel="Chép"
          onConfirm={confirmCopy}
        />
      )}
      {sheets && moveTargetMounted && (
        <sheets.MealTargetSheet
          open={targetSheet === "move"}
          onClose={() => setTargetSheet(null)}
          title={`Chuyển ${chosenCount} món sang`}
          description={`${chosenCount} món · ${kcalLabel(chosenKcal(entries, liveSelected))}`}
          withKeep={false}
          initial={chosen[0]?.slot && chosen[0].slot !== "pre_workout" ? chosen[0].slot : "breakfast"}
          confirmLabel="Chuyển"
          onConfirm={confirmMove}
        />
      )}
      {sheets && pastTargetMounted && (
        <sheets.MealTargetSheet
          open={targetSheet === "past"}
          onClose={() => setTargetSheet(null)}
          title={pastCopyTitle(chosenCount)}
          description={pastCopySubtitle(dayLabel, chosenKcal(entries, liveSelected), todayDdMm)}
          withKeep
          initial="keep"
          confirmLabel="Chép vào hôm nay"
          onConfirm={confirmCopy}
        />
      )}
      {shareUsed && sheets && (
      <sheets.ShareSheet
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
      {sheets && todayIso && calendarMounted && (
        <sheets.CalendarSheet
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
    </>
  );
}
