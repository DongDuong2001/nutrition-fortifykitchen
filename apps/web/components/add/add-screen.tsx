"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue, useSyncExternalStore, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDiary } from "@/lib/diary-store";
import { canLog } from "@/lib/diary-edits";
import { usePastDayRedirect } from "@/hooks/use-past-day-redirect";
import { previousInAppPath, useBack } from "@/hooks/use-back";
import { MOCK_FOODS, type FoodItem, type FoodServing } from "@/lib/mock/foods";
import { useFoodBrowse } from "@/hooks/use-food-browse";
import { lastPortionOf, resolveRecent, type ResolvedRecent } from "@/lib/recent-foods";
import { SHORTLIST_DAYS, frequentFoods, recentForMeal, type Shortlisted } from "@/lib/meal-shortlists";
import { dayEntries, shiftIsoDate, viewedIsoDate } from "@/lib/day-history";
import { formatDayLabel } from "@/lib/format";
import { savedMealTotals, type SavedMeal } from "@/lib/saved-meals";
import type { QuickEntryInput, QuickEntryResult } from "@/lib/quick-entry";
import { AddShortcuts, type RecentShortcut, type SavedMealShortcut } from "@/components/add/add-shortcuts";
import { QuickAddSheet } from "@/components/add/quick-add-sheet";
import { Sheet } from "@/components/ui/sheet";
import { ChipGroup } from "@/components/ui/chip-group";
import { FoodList } from "@/components/foods/food-list";
import { FoodEmptyState } from "@/components/foods/food-empty-state";
import { CatalogNote, CatalogStatus } from "@/components/foods/catalog-status";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { foodMeta } from "@/lib/food-meta";
import { CreateFoodButton } from "@/components/foods/create-food-button";
import { isCategoryFilter } from "@/lib/food-categories";
import { resolveFavourites } from "@/lib/favourites";
import { dedupeTwins, twinIdsOf } from "@/lib/food-rows";
import { TrayBar, TrayReviewSheet } from "@/components/add/add-tray";
import { markUsed } from "@/lib/onboarding-store";
import { TOUR_STEPS } from "@/lib/tour";
import { readTour, subscribeTour, tourAction } from "@/lib/tour-bus";
import { canAddTray, patchTrayItem, putInTray, removeFromTray, toggleTray, trayTotals, type TrayItem } from "@/lib/tray";

import {
  parseMealSlot,
  getDefaultMealSlot,
  getMealSlotNameVi,
  type MealSlot,
  MEAL_SLOTS,
} from "@/lib/meal-slot";
import { defaultPortionOf, gramsServingLabel, parseGramsInput } from "@/lib/portion";
import { MealSwitcher } from "@/components/meal-switcher";
import { PortionPanel } from "@/components/ui/portion-panel";
import { Expand } from "@/components/ui/expand";
import type { DishEdit } from "@/lib/dish-recipes";

import { useMealSlot } from "@/lib/use-meal-slot";
import { HOME_ROUTE } from "@/lib/nav";
import { takeBackSheetEntries } from "@/lib/sheet-history";
import { homeDay } from "@/lib/home-scroll";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { SHEET_CATCH_UP_MS, SHEET_EXIT_MS, SHEET_QUICK_ENTER_MS, useSheetDrag } from "@/components/ui/sheet";
import { setInertExceptDrag } from "@/components/ui/sheet-drag-controller";
import { haptic } from "@/lib/haptics";
import { IconButton } from "@/components/ui/icon-button";

// The add sheet shows carousels of the newest: Khám phá holds the full lists
const MAX_SHORTCUT_RECENTS = 8;
const MAX_SHORTCUT_MEALS = 8;
const MAX_SHORTCUT_FAVOURITES = 8;

const DESKTOP_QUERY = "(min-width: 1024px)";
function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const desktopNow = () => window.matchMedia(DESKTOP_QUERY).matches;

function AddFoodInner({ standalone }: { standalone: boolean }) {
  const router = useRouter();
  // Closing the sheet returns to the tab it was opened from (the diary when there is no history)
  const goBack = useBack();
  const searchParams = useSearchParams();
  const { data, addFoodEntry, addFoodEntries, recentFoods, savedMeals, addSavedMeal, addQuickEntry, favouriteIds, addedEntries, dayArchive, todayIso, hydrated } = useDiary();
  // cc-68: /add?date=YYYY-MM-DD adds to yesterday (the gate below sends a day that cannot be edited back to Hôm nay)
  // (the + of the nav opens /add?date= itself when Hôm nay shows yesterday: components/ui/add-opener; dayBehind is the fallback)
  const [dayBehind] = useState(() => homeDay());
  const dateParam = searchParams.get("date") ?? dayBehind;
  const addDay = hydrated && todayIso ? viewedIsoDate(dateParam, todayIso) : todayIso;
  const addToDay = addDay && addDay !== todayIso ? addDay : undefined;
  const homeHref = addToDay ? `${HOME_ROUTE}?date=${addToDay}` : HOME_ROUTE;
  const dayText = addToDay ? ` · ${formatDayLabel(addToDay, new Date(`${todayIso}T12:00:00+07:00`)).toLocaleLowerCase("vi-VN")}` : "";

  const resolvedSlot = useMealSlot(searchParams.get("meal"));
  const [overrideSlot, setOverrideSlot] = useState<MealSlot | null>(null);
  const mealSlot = overrideSlot ?? resolvedSlot;

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  // The tray: foods ticked with the + circle (or put in by Lưu & chọn tiếp), added together. It survives query and
  // filter changes and goes when the foods are added or the sheet is closed.
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const reopenReview = useRef(false);

  // cc-67: the parts of a premade dish changed for this meal (Thành phần). Changed, it is logged as ONE entry of a food made
  // for it ("Phở bò · đã chỉnh", listed nowhere): the parts added up. Unchanged, the dish is logged as it is.
  const [dishEdit, setDishEdit] = useState<DishEdit | null>(null);
  const [dishNotice, setDishNotice] = useState<string | null>(null);
  const onDishEdit = useCallback((next: DishEdit | null) => {
    setDishEdit(next);
    setDishNotice(null);
  }, []);
  // What a save logs: the food, its grams and the portion label
  const toLog = () => {
    const changed = dishEdit?.edited ? dishEdit : null;
    if (!selectedFood || !changed) return selectedFood ? { food: selectedFood, grams: parsedGrams, label: selectedServingLabel } : null;
    const food = changed.save();
    if (!food) {
      setDishNotice("Chưa lưu được món đã chỉnh vào máy này. Bộ nhớ đầy hoặc đang bị chặn.");
      return null;
    }
    return { food, grams: changed.grams, label: gramsServingLabel(changed.grams) };
  };

  const [gramsInput, setGramsInput] = useState("");
  const [selectedServingLabel, setSelectedServingLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // One layout is drawn, not both (cc-fluid-add): the hidden one used to cost a second food list on every open
  const isDesktop = useSyncExternalStore(subscribeDesktop, desktopNow, () => false);

  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const phoneSearchInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // cc-55: /add is a sheet over the tab it was opened from (the real screen, still mounted: an intercepting route). The panel (a
  // dialog on a desktop) slides up from @starting-style, and ✕, the scrim, a drag down or an add slide it away before the route goes.
  const panelRef = useRef<HTMLDivElement>(null);
  // cc-57: closing sets data-state="closed" on these elements directly (no React re-render of the page just as the slide
  // starts), so the render below never changes sheetState
  const scrimRef = useRef<HTMLDivElement>(null);
  const desktopWrapRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  // An add went through: the sheet leaves for good (a grab on its way down does not bring it back)
  const committedRef = useRef(false);
  const closeTimer = useRef<number | undefined>(undefined);
  // cc-62: the panel's release animation; the route goes once it has settled
  const panelSettled = useRef<() => Promise<void>>(() => Promise.resolve());
  const sheetState = "open";
  // The slide counts from the tap, not from the render: the sheet comes up as if it had started one frame ago (the tap's own
  // frame is spent rendering it), so it is on screen in the first frame it exists and still starts at the bottom edge.
  React.useLayoutEffect(() => {
    for (const el of [panelRef.current, dialogRef.current, scrimRef.current]) {
      el?.getAnimations?.().forEach((a) => {
        a.currentTime = SHEET_CATCH_UP_MS;
      });
    }
  }, []);
  // Phone: the page behind does not scroll (iOS Safari scrolls it when the keyboard opens). Counted with the portion sheet's own lock.
  useEffect(() => {
    if (isDesktop) return;
    return lockBodyScroll();
  }, [isDesktop]);

  // Phone: the panel lifts above the on-screen keyboard. The `translate` property, not `transform`: the drag and the release
  // animation own `transform` (sheet-drag-controller, use-sheet-drag read and write it).
  useEffect(() => {
    if (isDesktop) return;
    const vv = window.visualViewport;
    const panel = panelRef.current;
    if (!vv || !panel) return;
    const lift = () => {
      const keyboard = window.innerHeight - vv.height - vv.offsetTop;
      panel.style.translate = keyboard > 100 ? `0 -${Math.round(keyboard)}px` : "";
    };
    vv.addEventListener("resize", lift);
    vv.addEventListener("scroll", lift);
    return () => {
      vv.removeEventListener("resize", lift);
      vv.removeEventListener("scroll", lift);
      panel.style.translate = "";
    };
  }, [isDesktop]);

  // Focus goes into the dialog: the search field. A centred dialog gets it at once; the phone sheet once, when its slide has
  // settled (at once under reduced motion), so the keyboard never starts a third motion under the sheet and the scrim. Nothing
  // is taken from a field the person already tapped, and nothing at all when they touched the panel during the slide.
  useEffect(() => {
    if (isDesktop) {
      desktopSearchInputRef.current?.focus();
      return;
    }
    const panel = panelRef.current;
    let done = false;
    let touched = false;
    let timer: number | undefined;
    const cleanup = () => {
      panel?.removeEventListener("transitionend", onEnd);
      panel?.removeEventListener("pointerdown", onTouch, true);
      window.clearTimeout(timer);
    };
    const focusSearch = () => {
      if (done) return;
      done = true;
      cleanup();
      if (touched) return;
      const active = document.activeElement;
      if (active && active !== document.body && active.matches("input, textarea") && panel?.contains(active)) return;
      phoneSearchInputRef.current?.focus({ preventScroll: true });
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target === panel) focusSearch();
    };
    const onTouch = (e: Event) => {
      const input = phoneSearchInputRef.current;
      if (!(input && (e.target === input || input.contains(e.target as Node)))) touched = true;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      focusSearch();
      return;
    }
    panel?.addEventListener("transitionend", onEnd);
    panel?.addEventListener("pointerdown", onTouch, true);
    // A slide that was interrupted may end with no event of its own: never wait longer than the slide takes
    timer = window.setTimeout(focusSearch, SHEET_QUICK_ENTER_MS + 100);
    return () => {
      done = true;
      cleanup();
    };
  }, [isDesktop]);

  // Opened over a tab: the screen under the sheet is the real one, so it is made inert while the sheet is up (focus stays in the
  // dialog, as it did with the picture that used to sit there), and focus goes back to the control that opened the sheet when
  // it is gone. A sheet that leaves for Hôm nay by a route change does that on Hôm nay's own mount.
  useEffect(() => {
    if (standalone) return;
    const frame = document.querySelector<HTMLElement>("[data-app-frame]");
    frame?.setAttribute("inert", "");
    return () => {
      frame?.removeAttribute("inert");
      try {
        const returnId = sessionStorage.getItem("return_focus_id");
        if (returnId) {
          sessionStorage.removeItem("return_focus_id");
          requestAnimationFrame(() => document.getElementById(returnId)?.focus({ preventScroll: true }));
        }
      } catch {
        // Storage unavailable: focus stays where the page puts it
      }
    };
  }, [standalone]);

  // Pick a food with one serving (default: its first). Sets the amount too, so the portion panel shows it.
  // cc-51: a food opens on the portion this user last logged for it, else the catalogue's first portion
  const pickFood = useCallback((food: FoodItem, serving?: FoodServing) => {
    // cc-67: raw and cooked are one list row, so the food opens in the state it was last logged in
    const last = serving ? null : lastPortionOf(twinIdsOf(food), recentFoods, MOCK_FOODS);
    const s = serving ?? (last ? { label: last.label, grams: last.grams } : defaultPortionOf(food));
    setSelectedFood(last?.food ?? food);
    setGramsInput(String(s.grams));
    setSelectedServingLabel(s.label);
    tourAction("food-picked");
  }, [recentFoods]);

  // Current meal calories map for MealSwitcher
  const mealCalories = useMemo(() => {
    const cals: Partial<Record<MealSlot, number>> = {};
    const slotMap: Record<string, MealSlot> = {
      breakfast: "breakfast",
      lunch: "lunch",
      preworkout: "pre_workout",
      dinner: "dinner",
      snack: "snack",
    };
    for (const m of data.meals) {
      const s = slotMap[m.slot];
      if (s) {
        if (m.kcal !== null) cals[s] = m.kcal;
      }
    }
    return cals;
  }, [data]);

  // The first frame is the sheet itself (header, search field), which then slides up; the carousels and the food list are
  // worked out and drawn in a second, low-priority render a moment later, so the tap shows the sheet at once even on a slow phone.
  const ready = useDeferredValue(true, false);

  // Search, filter and list: the same state as Khám phá
  const {
    query,
    setQuery,
    filter,
    setFilter,
    list,
    filterItems,
    categoryName,
    isFavouriteFood,
    similarFoods,
    noFavourites,
    catalogVersion,
    catalogPending,
    catalogFailed,
    retryCatalog,
  } = useFoodBrowse({ enabled: ready });

  // The tour's search step starts with "phở" typed, so the results are already there to tap
  useEffect(() => {
    const apply = () => {
      const tour = readTour();
      if (tour.status === "step" && TOUR_STEPS[tour.index].id === "search") setQuery("phở");
    };
    apply();
    return subscribeTour(apply);
  }, [setQuery]);

  // cc-51 D1: Gần đây is the last 8 foods of this meal and Hay ăn the 8 logged most in 14 days, from the diary on this
  // device, each with the portion it was last logged with. Without diary history for the meal, Gần đây is the
  // account's recent list as before.
  // Today and the 13 days before it, as Nhật ký shows them (lib/day-history: the archive, else the demo history)
  const diaryEntries = useMemo(
    () =>
      !ready
        ? []
        : todayIso
        ? [...addedEntries, ...Array.from({ length: SHORTLIST_DAYS - 1 }, (_, i) => dayEntries(shiftIsoDate(todayIso, -(i + 1)), todayIso)).flat()]
        : addedEntries,
    // dayArchive: dayEntries reads it
    [addedEntries, dayArchive, todayIso, ready]
  );
  const shortcutOf = useCallback(
    (s: Shortlisted, prefix: string): RecentShortcut | null => {
      const food = MOCK_FOODS.find((f) => f.id === s.foodId);
      return food ? { key: `${prefix}|${food.id}|${s.servingLabel}`, food, label: s.servingLabel, grams: s.grams } : null;
    },
    // catalogVersion: MOCK_FOODS changed
    [catalogVersion]
  );
  // Recents are foods with the serving they were logged with: tap = add with that serving, chevron = portion panel
  const recentShortcuts = useMemo<RecentShortcut[]>(() => {
    // cc-67: one card per food, in the state it was last logged in
    if (!ready) return [];
    const ofMeal = mealSlot ? recentForMeal(diaryEntries, mealSlot).map((s) => shortcutOf(s, "meal")).filter((r): r is RecentShortcut => r !== null) : [];
    if (ofMeal.length > 0) return dedupeTwins(ofMeal, (r) => r.food);
    return dedupeTwins(
      recentFoods
        .map((r) => resolveRecent(r, MOCK_FOODS))
        .filter((r): r is ResolvedRecent => r !== null)
        .map((r) => ({ key: `${r.food.id}|${r.label}`, food: r.food, label: r.label, grams: r.grams })),
      (r) => r.food
    ).slice(0, MAX_SHORTCUT_RECENTS);
  }, [recentFoods, diaryEntries, mealSlot, shortcutOf, ready]);
  const frequentShortcuts = useMemo<RecentShortcut[]>(
    () =>
      todayIso
        ? dedupeTwins(
            frequentFoods(diaryEntries, todayIso)
              .map((s) => shortcutOf(s, "often"))
              .filter((r): r is RecentShortcut => r !== null && !recentShortcuts.some((x) => twinIdsOf(x.food).includes(r.food.id))),
            (r) => r.food
          )
        : [],
    [diaryEntries, todayIso, recentShortcuts, shortcutOf]
  );
  // Favourites add with the portion they were last logged with, else their first serving
  // A favourite already in Gần đây is not repeated (two identical buttons confuse screen readers)
  const favouriteShortcuts = useMemo<RecentShortcut[]>(
    () =>
      dedupeTwins(ready ? resolveFavourites(favouriteIds, MOCK_FOODS) : [], (food) => food)
        .filter((food) => !recentShortcuts.some((r) => twinIdsOf(r.food).includes(food.id)) && !frequentShortcuts.some((r) => twinIdsOf(r.food).includes(food.id)))
        .slice(0, MAX_SHORTCUT_FAVOURITES)
        .map((food) => {
          const last = lastPortionOf(twinIdsOf(food), recentFoods, MOCK_FOODS);
          const serving = last ? { label: last.label, grams: last.grams } : defaultPortionOf(food);
          return { key: `fav|${food.id}`, food: last?.food ?? food, label: serving.label, grams: serving.grams };
        }),
    [favouriteIds, recentFoods, recentShortcuts, frequentShortcuts, catalogVersion, ready]
  );
  const savedMealShortcuts = useMemo<SavedMealShortcut[]>(
    () =>
      (!ready ? [] : savedMeals)
        .map((meal) => ({ meal, ...savedMealTotals(meal, MOCK_FOODS) }))
        .filter((s) => s.itemCount > 0)
        .slice(0, MAX_SHORTCUT_MEALS),
    [savedMeals, catalogVersion, ready]
  );

  const showShortcuts = !query.trim() && filter === "all";
  const favouritesOnly = filter === "favorite" && !query.trim();

  // Active grams number
  const parsedGrams = useMemo(() => {
    return parseGramsInput(gramsInput);
  }, [gramsInput]);
  // The grams a save logs: the parts added up for a changed dish
  const loggedGrams = dishEdit?.edited ? dishEdit.grams : parsedGrams;

  // The add lock: one tap on a recent (or a favourite with history) adds with the last portion, a portion sheet's Thêm saves
  // A ref, not state: two taps in the same frame must not both add (the second would replace the undo of the first)
  const oneTapLock = useRef(false);

  // Submit action
  const handleAddFood = async () => {
    if (closingRef.current || oneTapLock.current || !selectedFood || loggedGrams <= 0 || isSubmitting || mealSlot === null) return;
    // A ref, not only the state: two taps in the same frame both see isSubmitting false
    oneTapLock.current = true;
    setIsSubmitting(true);
    let saved = false;
    try {
      const entry = toLog();
      saved = entry ? await addFoodEntry(entry.food, entry.grams, mealSlot, entry.label, { day: addToDay }) : false;
      if (saved) {
        tourAction("portion-confirmed");
        // The panel slides down like the ✕ does and the portion sheet over it goes with it (no hard cut)
        leave(homeHref);
        setSelectedFood(null);
      }
    } finally {
      // After a save the buttons stay as they are until the sheet is gone: nothing to press twice, no label that changes
      if (!saved) {
        oneTapLock.current = false;
        setIsSubmitting(false);
      }
    }
  };

  // Lưu & chọn tiếp: the food with the chosen portion goes in the tray and the search stays as it was
  const handleAddAndContinue = () => {
    if (!selectedFood || loggedGrams <= 0 || mealSlot === null) return;
    const entry = toLog();
    if (!entry) return;
    markUsed("tray-add");
    setTray((t) => putInTray(t, entry.food, entry.grams, entry.label));
    setSelectedFood(null);
    setGramsInput("");
    setSelectedServingLabel("");
  };

  const trayTotalsNow = useMemo(() => trayTotals(tray), [tray]);
  const trayAddable = canAddTray(tray);
  const handleAddTray = () => {
    if (closingRef.current || !trayAddable || mealSlot === null || isSubmitting) return;
    setIsSubmitting(true);
    if (addFoodEntries(tray, mealSlot, addToDay)) {
      // The tray is left as it is: it goes with the sheet, so the button never reads "Thêm 0 món" while the sheet slides away
      leave(homeHref);
    } else {
      setIsSubmitting(false);
    }
  };


  const addWithPortion = async (food: FoodItem, grams: number, label: string) => {
    if (closingRef.current || oneTapLock.current || isSubmitting || mealSlot === null) return;
    // Unknown energy cannot be logged in one tap: open the portion panel, which says why
    if (!canLog(food)) {
      pickFood(food, { label, grams });
      return;
    }
    oneTapLock.current = true;
    setIsSubmitting(true);
    try {
      await addFoodEntry(food, grams, mealSlot, label, { undoable: true, day: addToDay });
      leave(homeHref);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSavedMealToMeal = (meal: SavedMeal) => {
    if (closingRef.current || oneTapLock.current || mealSlot === null) return;
    oneTapLock.current = true;
    addSavedMeal(meal, mealSlot, addToDay);
    leave(homeHref);
  };

  const submitQuickEntry = (input: QuickEntryInput): QuickEntryResult => {
    if (closingRef.current || oneTapLock.current) return { ok: false, field: "kcal", message: "Đang thêm…" };
    if (mealSlot === null) return { ok: false, field: "kcal", message: "Chưa chọn bữa" };
    const result = addQuickEntry(input, mealSlot, addToDay);
    if (result.ok) {
      oneTapLock.current = true;
      leave(homeHref);
      setQuickOpen(false);
    }
    return result;
  };

  // A favourite with a last portion adds in one tap, like a recent. Without history the portion panel opens.
  const pickFromList = (food: FoodItem) => {
    const last = favouritesOnly ? lastPortionOf(twinIdsOf(food), recentFoods, MOCK_FOODS) : null;
    if (last) void addWithPortion(last.food, last.grams, last.label);
    else pickFood(food);
  };

  // Every way out of the sheet is one thing: ✕, the scrim, a drag down, an add (the tray, a portion, one tap, Chỉ ghi kcal)
  // and Esc. The scrim stops taking taps and the panel slides down (data-state="closed"), then the route goes: back to the
  // page under the sheet, or on to `href` (Hôm nay) when the sheet was not opened from it. `instant`: Esc on a keyboard
  // goes at once (a keyboard action never waits for an animation).
  const leave = useCallback(
    (href: string | null, instant = false) => {
      if (closingRef.current) return;
      closingRef.current = true;
      committedRef.current = href !== null;
      // The entries of sheets still open over this one (a portion sheet when its Thêm adds): they go with the route
      const sheetEntries = takeBackSheetEntries();
      if (typeof window !== "undefined") {
        const openerId =
          sessionStorage.getItem("last_add_opener_id") ||
          (mealSlot ? `desktop-add-${mealSlot}` : "desktop-add-btn");
        sessionStorage.removeItem("last_add_opener_id");
        sessionStorage.setItem("return_focus_id", openerId);
      }
      // data-state="closed" also tells the Back that follows that the sheet has slid down already (lib/nav-direction).
      // It is all CSS from here (globals.css .m-sheet[data-state="closed"]): the scrim and the panel stop taking taps at
      // once, and nothing is made inert until the slide is over, so a focused field is not blurred under the slide.
      for (const el of [scrimRef.current, dialogRef.current, panelRef.current]) {
        if (el) el.dataset.state = "closed";
      }
      desktopWrapRef.current?.classList.add("pointer-events-none");
      const go = () => {
        if (dialogRef.current) dialogRef.current.inert = true;
        if (panelRef.current) setInertExceptDrag(panelRef.current, true);
        if (href === null || previousInAppPath() === HOME_ROUTE) {
          // Back lands on the page under the sheet, and takes the entries of any sheet over this one with it
          if (href === null) goBack();
          else window.history.go(-(1 + sheetEntries));
        } else router.replace(href);
      };
      if (instant) return go();
      // Stored, so a Back pressed during the slide cancels it instead of going back twice
      closeTimer.current = window.setTimeout(() => {
        void panelSettled.current().then(() => {
          if (!closingRef.current || closeTimer.current === undefined) return;
          closeTimer.current = undefined;
          if (window.location.pathname === "/add") go();
        });
      }, SHEET_EXIT_MS);
    },
    [mealSlot, goBack, router]
  );
  const handleClose = useCallback((instant = false) => leave(null, instant), [leave]);
  useEffect(() => {
    const cancel = () => {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    };
    window.addEventListener("popstate", cancel);
    return () => {
      window.removeEventListener("popstate", cancel);
      cancel();
    };
  }, []);
  const panelDrag = useSheetDrag(
    panelRef,
    () => {
      markUsed("sheet-drag");
      haptic("snap");
      handleClose();
    },
    {
      scrimRef,
      // A grab while the panel slides away takes it back: the close is called off
      onRegrab: () => {
        if (!closingRef.current || committedRef.current) return false;
        closingRef.current = false;
        window.clearTimeout(closeTimer.current);
        closeTimer.current = undefined;
        for (const el of [scrimRef.current, dialogRef.current, panelRef.current]) {
          if (el) el.dataset.state = "open";
        }
        if (dialogRef.current) dialogRef.current.inert = false;
        if (panelRef.current) setInertExceptDrag(panelRef.current, false);
        desktopWrapRef.current?.classList.remove("pointer-events-none");
        return true;
      },
    }
  );
  panelSettled.current = panelDrag.settled;

  // Keyboard navigation on desktop: Enter adds, Esc closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // An open sheet (Chỉ ghi kcal, meal switcher) closes itself on Esc; the add screen stays
        if (quickOpen || switcherOpen || reviewOpen || (selectedFood && !isDesktop)) return;
        e.preventDefault();
        handleClose(true);
      } else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        // If not typing in input or if adding (the Chỉ ghi kcal form handles its own Enter)
        if (selectedFood && loggedGrams > 0 && !quickOpen) {
          handleAddFood();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, selectedFood, loggedGrams, handleAddFood, quickOpen, switcherOpen, reviewOpen, isDesktop]);

  const mealNameVi = mealSlot ? getMealSlotNameVi(mealSlot) : "—";

  // Meta line for a food row in the list
  const getFoodMeta = foodMeta;

  // Shared by the phone sheet and the desktop dialog
  const newFoodHref = mealSlot ? `/foods/new?meal=${mealSlot}` : "/foods/new";
  // The live catalogue is not here yet (or did not come): say that, never "no foods"
  const onPickSimilar = useCallback((food: FoodItem) => pickFood(food), [pickFood]);
  const clearFilter = useCallback(() => setFilter("all"), [setFilter]);
  // Memoised with the list's other props (listPick): a keystroke in the grams field must not redraw the list
  const emptyState = useMemo(
    () =>
      catalogPending || catalogFailed ? (
        <CatalogStatus failed={catalogFailed} onRetry={retryCatalog} />
      ) : (
        <FoodEmptyState
          query={query}
          filter={filter}
          noFavourites={noFavourites}
          similarFoods={similarFoods}
          getMeta={getFoodMeta}
          onPickSimilar={onPickSimilar}
          onClearFilter={clearFilter}
          newFoodHref={newFoodHref}
        />
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogPending, catalogFailed, retryCatalog, query, filter, noFavourites, similarFoods, newFoodHref]
  );

  // Chỉ ghi kcal, Gần đây and Bữa ăn của tôi: shared by the phone sheet and the desktop dialog
  const shortcuts = (
    <AddShortcuts
      recents={recentShortcuts}
      frequent={frequentShortcuts}
      favourites={favouriteShortcuts}
      savedMeals={savedMealShortcuts}
      onAddRecent={(r) => {
        markUsed("shortlist-add");
        void addWithPortion(r.food, r.grams, r.label);
      }}
      onOpenRecent={(r) => pickFood(r.food, { label: r.label, grams: r.grams })}
      onAddSavedMeal={addSavedMealToMeal}
      onQuickKcal={() => setQuickOpen(true)}
    />
  );

  const createFoodLink = useMemo(() => <CreateFoodButton href={newFoodHref} />, [newFoodHref]);

  // The list's selection props: one tapped row for the portion panel; the + circle of each row is the tray. Stable between renders
  // (the callbacks read the latest handlers through a ref), so a keystroke in the grams field does not redraw the list.
  const latest = useRef({ pickFromList, pickFood, setFilter });
  latest.current = { pickFromList, pickFood, setFilter };
  const onPickRow = useCallback((food: FoodItem) => latest.current.pickFromList(food), []);
  const onOpenRow = useCallback((food: FoodItem) => latest.current.pickFood(food), []);
  const onToggleTray = useCallback((food: FoodItem) => {
    markUsed("tray-add");
    setTray((t) => toggleTray(t, food));
  }, []);
  const trayIds = useMemo(() => tray.map((t) => t.food.id), [tray]);
  const listPick = useMemo(
    () => ({
      selectedId: selectedFood?.id,
      onPick: onPickRow,
      onOpen: favouritesOnly ? onOpenRow : undefined,
      tray: { ids: trayIds, onToggle: onToggleTray },
    }),
    [selectedFood?.id, onPickRow, favouritesOnly, onOpenRow, trayIds, onToggleTray]
  );

  return (
    // Opened over a tab (the intercepting route) the page under it is the real screen, still mounted; nothing here is in the
    // page's flow. Opened straight (a link, a reload) there is nothing under it: plain paper.
    <div className={standalone ? "min-h-dvh bg-page text-text font-sans" : "text-text font-sans"}>
      <div ref={scrimRef} aria-hidden="true" data-state={sheetState} onClick={() => handleClose()} className="m-scrim m-scrim-dialog m-quick fixed inset-0 z-nav bg-scrim" />

      {/* ============================================================== */}
      {/* DESKTOP MODAL OVER TODAY (≥1024px)                             */}
      {/* ============================================================== */}
      {isDesktop && (
      <>
        <div
          ref={desktopWrapRef}
          onClick={() => handleClose()}
          className="fixed inset-0 z-sheet flex items-center justify-center p-4"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dlg-title"
            data-sheet-route
            data-state={sheetState}
            onClick={(e) => e.stopPropagation()}
            className="m-pop w-[min(900px,100%-32px)] bg-card rounded-card border border-transparent p-6 shadow-2xl flex flex-col gap-4 max-h-[92dvh] overflow-y-auto"
          >
            {/* The page's heading (Hôm nay behind is a picture without one since cc-55b), as the phone sheet has */}
            <h1 className="sr-only">Thêm món</h1>
            {/* Dialog Header */}
            <header className="flex items-start justify-between gap-4">
              <div className="flex flex-col items-start">
                <button
                  type="button"
                  onClick={() => setSwitcherOpen(true)}
                  aria-haspopup="listbox"
                  className="min-h-11 px-2 -ml-2 rounded-lg bg-transparent border-0 text-text font-normal text-lg flex items-center gap-2 cursor-pointer hover:bg-surface active:scale-[0.98] transition-press"
                >
                  <span id="dlg-title">
                    Thêm vào: <strong className="font-bold">{mealNameVi}</strong>{dayText}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className="text-xs text-secondary mt-0.5">
                  Tự chọn theo giờ trong ngày · bấm để đổi bữa
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <IconButton
                  onClick={() => handleClose()}
                  label="Đóng"
                  tone="surface" className="text-text hover:bg-divider"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </IconButton>
              </div>
            </header>

            {/* Two Pane Layout */}
            <div className="flex gap-6 items-start">
              {/* Left Pane: Search & Results */}
              <div data-align-container="add-list" className="flex-1 min-w-[340px] flex flex-col gap-3">
                <FoodSearchField value={query} onChange={setQuery} inputRef={desktopSearchInputRef} />

                {/* Filter row: Tất cả, Yêu thích, then categories with foods */}
                <ChipGroup scroll items={filterItems} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />

                {ready && showShortcuts && shortcuts}

                {/* Results: grouped or flat */}
                {catalogPending && list.foods.length > 0 && <CatalogNote />}
                {ready && (
                <FoodList
                  dataTour="add-results"
                  list={list}
                  {...listPick}
                  getMeta={getFoodMeta}
                  categoryName={categoryName}
                  showCategory={!isCategoryFilter(filter)}
                  isFavourite={isFavouriteFood}
                  showSourceTag={query.trim() !== ""}
                  empty={emptyState}
                  footer={createFoodLink}
                  className="max-h-[360px] overflow-y-auto pb-1"
                />
                )}
                {tray.length > 0 && (
                  <TrayBar
                    totals={trayTotalsNow}
                    mealName={mealNameVi}
                    canAdd={trayAddable}
                    submitting={isSubmitting}
                    onReview={() => setReviewOpen(true)}
                    onAdd={handleAddTray}
                  />
                )}
              </div>

              {/* Right Pane: Selected Food Portion & Macros, or an empty state until a food is picked */}
              <div className="min-h-0 w-[340px] shrink-0 self-stretch overflow-y-auto overscroll-contain">
                {selectedFood ? (
                  <PortionPanel
                    food={selectedFood}
                    gramsInput={gramsInput}
                    setGramsInput={setGramsInput}
                    selectedServingLabel={selectedServingLabel}
                    setSelectedServingLabel={setSelectedServingLabel}
                    onFoodChange={(newFood) => setSelectedFood(newFood)}
                    mealSlot={mealSlot}
                    onAdd={handleAddFood}
                    onAddAndContinue={handleAddAndContinue}
                    onDishEdit={onDishEdit}
              notice={dishNotice}
                    isSubmitting={isSubmitting}
                    showMicros={true}
                    className="rounded-card border border-transparent shadow-ring bg-card p-4"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-sm text-secondary p-4">
                    Chọn một món để xem khẩu phần
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-secondary pt-1 border-t border-card-border">
              Enter để thêm · Esc để đóng
            </div>
          </div>
        </div>
      </>
      )}

      {/* ============================================================== */}
      {/* MOBILE / TABLET LAYOUT (<1024px)                               */}
      {/* ============================================================== */}
      {!isDesktop && (
      <>
        {/* Main Sheet Container: opens tall, the header stays pinned and everything under it scrolls as one */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Thêm món vào ${mealNameVi}`}
          data-align-container="add-list"
          data-add-panel
          data-sheet-route
          data-state={sheetState}
          data-under-sheet={selectedFood !== null && !isDesktop ? "" : undefined}
          className="m-sheet m-quick m-vt-sheet fixed inset-x-0 bottom-0 top-[8dvh] z-nav flex flex-col rounded-t-sheet bg-card shadow-sheet"
        >
          {/* Pinned header: grabber, meal switcher + close, search, chips. cc-62 (S15): the list fades out under it (a 12 px edge) */}
          <div className="relative z-sticky flex shrink-0 flex-col gap-3 px-4 pt-3 pb-3 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-linear-to-b after:from-card after:to-transparent">
            {/* Grabber: drag it down to close (a 24 px strip around the bar) */}
            <div
              aria-hidden="true"
              data-sheet-handle
              data-sheet-drag
              {...panelDrag.handlers}
              style={{ touchAction: "none" }}
              className="-mx-4 -mt-3 -mb-2 flex h-6 shrink-0 cursor-grab items-center justify-center self-stretch"
            >
              <div className="h-1 w-10 rounded-full bg-grabber" />
            </div>
            {/* The phone sheet's heading: /add has no visible h1 on a phone (the desktop modal sits over Today's header) */}
            <h1 className="sr-only">Thêm món</h1>

            <div data-sheet-drag {...panelDrag.handlers} style={{ touchAction: "none" }} className="flex items-start justify-between gap-2">
              <div className="flex flex-col items-start">
                <button
                  type="button"
                  onClick={() => setSwitcherOpen(true)}
                  aria-haspopup="listbox"
                  aria-label="Đổi bữa"
                  className="-ml-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-2 text-lg text-text active:scale-[0.98] transition-press"
                >
                  <span>
                    Thêm vào: <strong className="font-bold">{mealNameVi}</strong>{dayText}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className="text-xs font-normal text-secondary">Tự chọn theo giờ trong ngày · chạm để đổi</div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <IconButton
                  onClick={() => handleClose()}
                  label="Đóng"
                  tone="surface" className="text-text"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </IconButton>
              </div>
            </div>

            <FoodSearchField value={query} onChange={setQuery} inputRef={phoneSearchInputRef} className="shrink-0" />

            {/* Filter row: Tất cả, Yêu thích, then categories with foods */}
            <ChipGroup scroll items={filterItems} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />
          </div>

          {/* One scroll region: carousels, the food list and the create button (the last item stays reachable) */}
          <div data-add-scroll className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
            {ready && showShortcuts && shortcuts}

            {catalogPending && list.foods.length > 0 && <CatalogNote />}
            {ready && (
            <FoodList
              dataTour="add-results"
              list={list}
              {...listPick}
              getMeta={getFoodMeta}
              categoryName={categoryName}
              showCategory={!isCategoryFilter(filter)}
              isFavourite={isFavouriteFood}
              showSourceTag={query.trim() !== ""}
              empty={emptyState}
              footer={createFoodLink}
            />
            )}
          </div>

          {/* The tray bar, under the list while the tray holds a food. cc-64 (A1): it opens and closes with Expand, so the
              list above eases instead of jumping */}
          <div
            className={`relative shrink-0 ${
              tray.length > 0 ? "before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-3 before:bg-linear-to-t before:from-card before:to-transparent" : ""
            }`}
          >
            <Expand open={tray.length > 0} className="px-4 pb-2">
              <TrayBar
                totals={trayTotalsNow}
                mealName={mealNameVi}
                canAdd={trayAddable}
                submitting={isSubmitting}
                onReview={() => setReviewOpen(true)}
                onAdd={handleAddTray}
              />
            </Expand>
          </div>
        </div>
      </>
      )}

      {/* The portion sheet (phone): white, over the list, as in design/portion-mockup */}
      <Sheet
        open={selectedFood !== null && !isDesktop}
        onClose={() => {
          setSelectedFood(null);
          // cc-67: back to the list with the keyboard ready, as when the sheet opened
          phoneSearchInputRef.current?.focus({ preventScroll: true });
        }}
        labelledBy="portion-sheet-title"
        stacked
        quick
      >
        {selectedFood && (
          <div className="-mx-4 max-h-[86dvh] overflow-y-auto overscroll-contain px-4 pb-[env(safe-area-inset-bottom)]">
            <PortionPanel
              food={selectedFood}
              gramsInput={gramsInput}
              setGramsInput={setGramsInput}
              selectedServingLabel={selectedServingLabel}
              setSelectedServingLabel={setSelectedServingLabel}
              onFoodChange={(newFood) => setSelectedFood(newFood)}
              mealSlot={mealSlot}
              onAdd={handleAddFood}
              onAddAndContinue={handleAddAndContinue}
              onDishEdit={onDishEdit}
                    notice={dishNotice}
              isSubmitting={isSubmitting}
              headingId="portion-sheet-title"
            />
          </div>
        )}
      </Sheet>

      <TrayReviewSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        items={tray}
        totals={trayTotalsNow}
        mealName={mealNameVi}
        canAdd={trayAddable}
        submitting={isSubmitting}
        onRemove={(id) => {
          const next = removeFromTray(tray, id);
          setTray(next);
          if (next.length === 0) setReviewOpen(false);
        }}
        onChangeItem={(id, patch) => setTray((t) => patchTrayItem(t, id, patch))}
        onChangeMeal={() => {
          reopenReview.current = true;
          setReviewOpen(false);
          setSwitcherOpen(true);
        }}
        onAdd={handleAddTray}
      />

      <QuickAddSheet open={quickOpen} onClose={() => setQuickOpen(false)} mealName={mealNameVi} onSubmit={submitQuickEntry} />

      {/* Meal Switcher Bottom Sheet */}
      <MealSwitcher
        open={switcherOpen}
        onClose={() => {
          setSwitcherOpen(false);
          if (reopenReview.current) {
            reopenReview.current = false;
            setReviewOpen(true);
          }
        }}
        selectedSlot={mealSlot}
        onSelectSlot={(slot) => setOverrideSlot(slot)}
        mealCalories={mealCalories}
      />
    </div>
  );
}

// Days older than yesterday are read-only, so the add form opens for today and yesterday (an older ?date= goes back to that day's Today view)
function AddFoodGate({ standalone }: { standalone: boolean }) {
  const isPastDay = usePastDayRedirect();
  if (isPastDay) return standalone ? <div className="w-full min-h-dvh bg-page" /> : null;
  return <AddFoodInner standalone={standalone} />;
}

/**
 * The add sheet. `standalone`: opened straight (a link, a reload: app/(app)/add/page.tsx), so it has the page to itself.
 * Not standalone: the intercepting route (app/(app)/(tabs)/@sheet/(.)add) draws it over the tab it was opened from, which
 * stays mounted underneath.
 */
export function AddScreen({ standalone = false }: { standalone?: boolean }) {
  return (
    <Suspense fallback={standalone ? <div className="w-full min-h-dvh bg-page" /> : null}>
      <AddFoodGate standalone={standalone} />
    </Suspense>
  );
}
