"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDiary } from "@/lib/diary-store";
import { canLog } from "@/lib/diary-edits";
import { usePastDayRedirect } from "@/hooks/use-past-day-redirect";
import { useBack } from "@/hooks/use-back";
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
import { ChipRow } from "@/components/foods/chip-row";
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
import { HomeScreen } from "@/components/home/home-screen";
import { AppShell } from "@/components/ui/app-shell";
import type { DishEdit } from "@/lib/dish-recipes";

import { useMealSlot } from "@/lib/use-meal-slot";
import { HOME_ROUTE } from "@/lib/nav";
import { navigateFromSheet } from "@/lib/sheet-history";
import { cameFromHome, homeDay, homeScroll } from "@/lib/home-scroll";
import { SHEET_EXIT_MS, useSheetDrag } from "@/components/ui/sheet";

// The add sheet shows carousels of the newest: Khám phá holds the full lists
const MAX_SHORTCUT_RECENTS = 8;
const MAX_SHORTCUT_MEALS = 8;
const MAX_SHORTCUT_FAVOURITES = 8;

function AddFoodInner() {
  const router = useRouter();
  // Closing the sheet returns to the tab it was opened from (the diary when there is no history)
  const goBack = useBack();
  const searchParams = useSearchParams();
  const { data, addFoodEntry, addFoodEntries, recentFoods, savedMeals, addSavedMeal, addQuickEntry, favouriteIds, addedEntries, dayArchive, todayIso, hydrated } = useDiary();
  // cc-68: /add?date=YYYY-MM-DD adds to yesterday (the gate below sends a day that cannot be edited back to Hôm nay)
  // (the + of the nav carries no date: it adds to the day Hôm nay was showing, which lib/home-scroll remembers)
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
  const [isDesktop, setIsDesktop] = useState(false);

  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const phoneSearchInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // cc-55: /add is a sheet over Hôm nay. Hôm nay is drawn behind it where it was scrolled to; the panel (a dialog on a
  // desktop) slides up from @starting-style, and ✕, the scrim or a drag down slide it away before the route pops.
  const panelRef = useRef<HTMLDivElement>(null);
  const behindRef = useRef<HTMLDivElement>(null);
  // cc-57: closing sets data-state="closed" on these elements directly (no React re-render of the page and its Hôm nay
  // backdrop just as the slide starts), so the render below never changes sheetState
  const scrimRef = useRef<HTMLDivElement>(null);
  const desktopWrapRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const sheetState = "open";
  // The picture of Hôm nay behind the sheet is one element for the life of the page: nothing here re-renders it
  // (Hôm nay's own frame is app/(app)/(tabs)/layout.tsx, which /add is outside: the backdrop brings its own)
  const backdrop = useMemo(
    () => (
      <AppShell alignContainer="home-page">
        <HomeScreen backdrop />
      </AppShell>
    ),
    []
  );
  useEffect(() => {
    if (behindRef.current) behindRef.current.scrollTop = homeScroll();
  }, []);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Focus goes into the dialog: the search field, on a phone too (cc-58). No scroll, so the open motion stays as it is.
  useEffect(() => {
    if (isDesktop && desktopSearchInputRef.current) {
      desktopSearchInputRef.current.focus();
    } else if (!isDesktop) {
      phoneSearchInputRef.current?.focus({ preventScroll: true });
    }
  }, [isDesktop]);

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
  } = useFoodBrowse();

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
      todayIso
        ? [...addedEntries, ...Array.from({ length: SHORTLIST_DAYS - 1 }, (_, i) => dayEntries(shiftIsoDate(todayIso, -(i + 1)), todayIso)).flat()]
        : addedEntries,
    // dayArchive: dayEntries reads it
    [addedEntries, dayArchive, todayIso]
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
    const ofMeal = mealSlot ? recentForMeal(diaryEntries, mealSlot).map((s) => shortcutOf(s, "meal")).filter((r): r is RecentShortcut => r !== null) : [];
    if (ofMeal.length > 0) return dedupeTwins(ofMeal, (r) => r.food);
    return dedupeTwins(
      recentFoods
        .map((r) => resolveRecent(r, MOCK_FOODS))
        .filter((r): r is ResolvedRecent => r !== null)
        .map((r) => ({ key: `${r.food.id}|${r.label}`, food: r.food, label: r.label, grams: r.grams })),
      (r) => r.food
    ).slice(0, MAX_SHORTCUT_RECENTS);
  }, [recentFoods, diaryEntries, mealSlot, shortcutOf]);
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
      dedupeTwins(resolveFavourites(favouriteIds, MOCK_FOODS), (food) => food)
        .filter((food) => !recentShortcuts.some((r) => twinIdsOf(r.food).includes(food.id)) && !frequentShortcuts.some((r) => twinIdsOf(r.food).includes(food.id)))
        .slice(0, MAX_SHORTCUT_FAVOURITES)
        .map((food) => {
          const last = lastPortionOf(twinIdsOf(food), recentFoods, MOCK_FOODS);
          const serving = last ? { label: last.label, grams: last.grams } : defaultPortionOf(food);
          return { key: `fav|${food.id}`, food: last?.food ?? food, label: serving.label, grams: serving.grams };
        }),
    [favouriteIds, recentFoods, recentShortcuts, frequentShortcuts, catalogVersion]
  );
  const savedMealShortcuts = useMemo<SavedMealShortcut[]>(
    () =>
      savedMeals
        .map((meal) => ({ meal, ...savedMealTotals(meal, MOCK_FOODS) }))
        .filter((s) => s.itemCount > 0)
        .slice(0, MAX_SHORTCUT_MEALS),
    [savedMeals, catalogVersion]
  );

  const showShortcuts = !query.trim() && filter === "all";
  const favouritesOnly = filter === "favorite" && !query.trim();

  // Active grams number
  const parsedGrams = useMemo(() => {
    return parseGramsInput(gramsInput);
  }, [gramsInput]);
  // The grams a save logs: the parts added up for a changed dish
  const loggedGrams = dishEdit?.edited ? dishEdit.grams : parsedGrams;

  // Submit action
  const handleAddFood = async () => {
    if (!selectedFood || loggedGrams <= 0 || isSubmitting || mealSlot === null) return;
    setIsSubmitting(true);
    try {
      const entry = toLog();
      const saved = entry ? await addFoodEntry(entry.food, entry.grams, mealSlot, entry.label, { day: addToDay }) : false;
      if (saved) {
        tourAction("portion-confirmed");
        navigateFromSheet(router, homeHref);
      }
    } finally {
      setIsSubmitting(false);
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
    if (!trayAddable || mealSlot === null || isSubmitting) return;
    setIsSubmitting(true);
    if (addFoodEntries(tray, mealSlot, addToDay)) {
      setTray([]);
      navigateFromSheet(router, homeHref);
    } else {
      setIsSubmitting(false);
    }
  };

  // One tap on a recent (or a favourite with history): add with the last portion, 5 s undo, back to the diary
  // A ref, not state: two taps in the same frame must not both add (the second would replace the undo of the first)
  const oneTapLock = useRef(false);

  const addWithPortion = async (food: FoodItem, grams: number, label: string) => {
    if (oneTapLock.current || isSubmitting || mealSlot === null) return;
    // Unknown energy cannot be logged in one tap: open the portion panel, which says why
    if (!canLog(food)) {
      pickFood(food, { label, grams });
      return;
    }
    oneTapLock.current = true;
    setIsSubmitting(true);
    try {
      await addFoodEntry(food, grams, mealSlot, label, { undoable: true, day: addToDay });
      navigateFromSheet(router, homeHref);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSavedMealToMeal = (meal: SavedMeal) => {
    if (oneTapLock.current || mealSlot === null) return;
    oneTapLock.current = true;
    addSavedMeal(meal, mealSlot, addToDay);
    navigateFromSheet(router, homeHref);
  };

  const submitQuickEntry = (input: QuickEntryInput): QuickEntryResult => {
    if (oneTapLock.current) return { ok: false, field: "kcal", message: "Đang thêm…" };
    if (mealSlot === null) return { ok: false, field: "kcal", message: "Chưa chọn bữa" };
    const result = addQuickEntry(input, mealSlot, addToDay);
    if (result.ok) {
      oneTapLock.current = true;
      navigateFromSheet(router, homeHref);
    }
    return result;
  };

  // A favourite with a last portion adds in one tap, like a recent. Without history the portion panel opens.
  const pickFromList = (food: FoodItem) => {
    const last = favouritesOnly ? lastPortionOf(twinIdsOf(food), recentFoods, MOCK_FOODS) : null;
    if (last) void addWithPortion(last.food, last.grams, last.label);
    else pickFood(food);
  };

  // `instant`: Esc on a keyboard closes at once (a keyboard action never waits for an animation)
  const handleClose = useCallback((instant = false) => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (typeof window !== "undefined") {
      const openerId =
        sessionStorage.getItem("last_add_opener_id") ||
        (mealSlot ? `desktop-add-${mealSlot}` : "desktop-add-btn");
      sessionStorage.removeItem("last_add_opener_id");
      sessionStorage.setItem("return_focus_id", openerId);
    }
    // data-state="closed" also tells the Back that follows that the sheet has slid down already (lib/nav-direction)
    for (const el of [scrimRef.current, dialogRef.current, panelRef.current]) {
      if (!el) continue;
      el.dataset.state = "closed";
      if (el !== scrimRef.current) el.inert = true;
    }
    desktopWrapRef.current?.classList.add("pointer-events-none");
    if (instant) return goBack();
    // Stored, so a Back pressed during the slide cancels it instead of going back twice
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = undefined;
      if (window.location.pathname === "/add") goBack();
    }, SHEET_EXIT_MS);
  }, [mealSlot, goBack]);
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
  const panelDrag = useSheetDrag(panelRef, () => {
    markUsed("sheet-drag");
    handleClose();
  });

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
  const emptyState = catalogPending || catalogFailed ? (
    <CatalogStatus failed={catalogFailed} onRetry={retryCatalog} />
  ) : (
    <FoodEmptyState
      query={query}
      filter={filter}
      noFavourites={noFavourites}
      similarFoods={similarFoods}
      getMeta={getFoodMeta}
      onPickSimilar={(food) => pickFood(food)}
      onClearFilter={() => setFilter("all")}
      newFoodHref={newFoodHref}
    />
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

  const createFoodLink = <CreateFoodButton href={newFoodHref} />;

  // The list's selection props: one tapped row for the portion panel; the + circle of each row is the tray
  const listPick = {
    selectedId: selectedFood?.id,
    onPick: pickFromList,
    onOpen: favouritesOnly ? pickFood : undefined,
    tray: {
      ids: tray.map((t) => t.food.id),
      onToggle: (food: FoodItem) => {
        markUsed("tray-add");
        setTray((t) => toggleTray(t, food));
      },
    },
  };

  return (
    <div className="min-h-screen bg-page text-text font-sans">
      {/* Hôm nay behind the sheet (both widths), scrolled to where it was left: a light, inert copy (HomeScreen backdrop);
          no blur on the scrim */}
      <div ref={behindRef} data-add-behind={cameFromHome() ? "home" : "light"} aria-hidden="true" inert className="pointer-events-none fixed inset-0 select-none overflow-hidden">
        {backdrop}
      </div>
      <div ref={scrimRef} aria-hidden="true" data-state={sheetState} onClick={() => handleClose()} className="m-scrim m-scrim-dialog fixed inset-0 z-40 bg-scrim" />

      {/* ============================================================== */}
      {/* DESKTOP MODAL OVER TODAY (≥1024px)                             */}
      {/* ============================================================== */}
      <div className="hidden lg:block">
        <div
          ref={desktopWrapRef}
          onClick={() => handleClose()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dlg-title"
            data-sheet-route
            data-state={sheetState}
            onClick={(e) => e.stopPropagation()}
            className="m-pop w-[min(900px,100%-32px)] bg-card border border-card-border rounded-[18px] p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
          >
            {/* The page's heading (Hôm nay behind is a picture without one since cc-55b), as the phone sheet has */}
            <h1 className="sr-only">Thêm món</h1>
            {/* Dialog Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col items-start">
                <button
                  type="button"
                  onClick={() => setSwitcherOpen(true)}
                  aria-haspopup="listbox"
                  className="min-h-[44px] px-2 -ml-2 rounded-lg bg-transparent border-0 text-text font-normal text-lg flex items-center gap-2 cursor-pointer hover:bg-surface active:scale-[0.98] transition-press"
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
                <button
                  type="button"
                  onClick={() => handleClose()}
                  aria-label="Đóng"
                  className="w-11 h-11 rounded-full bg-surface text-text flex items-center justify-center border-0 cursor-pointer hover:bg-divider active:scale-[0.97] transition-press"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Two Pane Layout */}
            <div className="flex gap-6 items-start">
              {/* Left Pane: Search & Results */}
              <div data-align-container="add-list" className="flex-1 min-w-[340px] flex flex-col gap-3">
                <FoodSearchField value={query} onChange={setQuery} inputRef={desktopSearchInputRef} />

                {/* Filter row: Tất cả, Yêu thích, then categories with foods */}
                <ChipRow items={filterItems} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />

                {showShortcuts && shortcuts}

                {/* Results: grouped or flat */}
                {catalogPending && list.foods.length > 0 && <CatalogNote />}
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
                    className="rounded-[18px] border border-card-border bg-card p-4"
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
      </div>

      {/* ============================================================== */}
      {/* MOBILE / TABLET LAYOUT (<1024px)                               */}
      {/* ============================================================== */}
      <div className="lg:hidden">
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
          className="m-sheet m-vt-sheet fixed inset-x-0 bottom-0 top-[8dvh] z-40 flex flex-col rounded-t-[20px] bg-card shadow-xl"
        >
          {/* Pinned header: grabber, meal switcher + close, search, chips */}
          <div className="flex shrink-0 flex-col gap-3 px-4 pt-3 pb-3">
            {/* Grabber: drag it down to close (a 24 px strip around the bar) */}
            <div
              aria-hidden="true"
              data-sheet-handle
              {...panelDrag}
              style={{ touchAction: "none" }}
              className="-mx-4 -mt-3 -mb-2 flex h-6 shrink-0 cursor-grab items-center justify-center self-stretch"
            >
              <div className="h-1 w-10 rounded-full bg-grabber" />
            </div>
            {/* The phone sheet's heading: /add has no visible h1 on a phone (the desktop modal sits over Today's header) */}
            <h1 className="sr-only">Thêm món</h1>

            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col items-start">
                <button
                  type="button"
                  onClick={() => setSwitcherOpen(true)}
                  aria-haspopup="listbox"
                  aria-label="Đổi bữa"
                  className="-ml-2 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-2 text-lg text-text active:scale-[0.98] transition-press"
                >
                  <span>
                    Thêm vào: <strong className="font-bold">{mealNameVi}</strong>{dayText}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className="text-xs font-medium text-secondary">Tự chọn theo giờ trong ngày · chạm để đổi</div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleClose()}
                  aria-label="Đóng"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-surface text-text active:scale-[0.97] transition-press"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>

            <FoodSearchField value={query} onChange={setQuery} inputRef={phoneSearchInputRef} className="shrink-0" />

            {/* Filter row: Tất cả, Yêu thích, then categories with foods */}
            <ChipRow items={filterItems} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />
          </div>

          {/* One scroll region: carousels, the food list and the create button (the last item stays reachable) */}
          <div data-add-scroll className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
            {showShortcuts && shortcuts}

            {catalogPending && list.foods.length > 0 && <CatalogNote />}
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
          </div>

          {/* The tray bar, under the list while the tray holds a food */}
          {tray.length > 0 && (
            <div className="shrink-0 px-4 pb-2">
              <TrayBar
                totals={trayTotalsNow}
                mealName={mealNameVi}
                canAdd={trayAddable}
                submitting={isSubmitting}
                onReview={() => setReviewOpen(true)}
                onAdd={handleAddTray}
              />
            </div>
          )}
        </div>
      </div>

      {/* The portion sheet (phone): white, over the list, as in design/portion-mockup */}
      <Sheet
        open={selectedFood !== null && !isDesktop}
        onClose={() => {
          setSelectedFood(null);
          // cc-67: back to the list with the keyboard ready, as when the sheet opened
          phoneSearchInputRef.current?.focus({ preventScroll: true });
        }}
        labelledBy="portion-sheet-title"
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
function AddFoodGate() {
  const isPastDay = usePastDayRedirect();
  if (isPastDay) return <div className="w-full min-h-screen bg-page" />;
  return <AddFoodInner />;
}

export default function AddFoodPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-page" />}>
      <AddFoodGate />
    </Suspense>
  );
}
