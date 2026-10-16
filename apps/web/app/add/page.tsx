"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDiary } from "@/lib/diary-store";
import { hasEnergy } from "@/lib/diary-edits";
import { usePastDayRedirect } from "@/hooks/use-past-day-redirect";
import { useBack } from "@/hooks/use-back";
import { MOCK_FOODS, type FoodItem, type FoodServing } from "@/lib/mock/foods";
import { useFoodBrowse } from "@/hooks/use-food-browse";
import { lastPortionOf, resolveRecent, type ResolvedRecent } from "@/lib/recent-foods";
import { savedMealTotals, type SavedMeal } from "@/lib/saved-meals";
import type { QuickEntryInput, QuickEntryResult } from "@/lib/quick-entry";
import { AddShortcuts, type RecentShortcut, type SavedMealShortcut } from "@/components/add/add-shortcuts";
import { QuickAddSheet } from "@/components/add/quick-add-sheet";
import { ChipRow } from "@/components/foods/chip-row";
import { FoodList } from "@/components/foods/food-list";
import { FoodEmptyState } from "@/components/foods/food-empty-state";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { foodMeta } from "@/lib/food-meta";
import { CreateFoodButton } from "@/components/foods/create-food-button";
import { isCategoryFilter } from "@/lib/food-categories";
import { resolveFavourites } from "@/lib/favourites";
import { CompareBar } from "@/components/foods/compare-bar";
import { MAX_COMPARE_FOODS, compareHref } from "@/lib/food-compare";

import {
  parseMealSlot,
  getDefaultMealSlot,
  getMealSlotNameVi,
  type MealSlot,
  MEAL_SLOTS,
} from "@/lib/meal-slot";
import { parseGramsInput } from "@/lib/portion";
import { MealSwitcher } from "@/components/meal-switcher";
import { PortionPanel } from "@/components/ui/portion-panel";
import { HomeScreen } from "@/components/home/home-screen";

import { useMealSlot } from "@/lib/use-meal-slot";

// The add sheet shows carousels of the newest: Khám phá holds the full lists
const MAX_SHORTCUT_RECENTS = 8;
const MAX_SHORTCUT_MEALS = 8;
const MAX_SHORTCUT_FAVOURITES = 8;

function AddFoodInner() {
  const router = useRouter();
  // Closing the sheet returns to the tab it was opened from (the diary when there is no history)
  const goBack = useBack();
  const searchParams = useSearchParams();
  const { data, addFoodEntry, recentFoods, savedMeals, addSavedMeal, addQuickEntry, favouriteIds } = useDiary();

  const resolvedSlot = useMealSlot(searchParams.get("meal"));
  const [overrideSlot, setOverrideSlot] = useState<MealSlot | null>(null);
  const mealSlot = overrideSlot ?? resolvedSlot;

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  // So sánh mode: the rows become selectable (up to 3) and a bar offers "So sánh (n)"
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const [gramsInput, setGramsInput] = useState("");
  const [selectedServingLabel, setSelectedServingLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Autofocus search on desktop only
  useEffect(() => {
    if (isDesktop && desktopSearchInputRef.current) {
      desktopSearchInputRef.current.focus();
    }
  }, [isDesktop]);

  // Pick a food with one serving (default: its first). Sets the amount too, so the portion panel shows it.
  const pickFood = useCallback((food: FoodItem, serving?: FoodServing) => {
    const s = serving ?? food.servings[0] ?? { label: "100 g", grams: 100 };
    setSelectedFood(food);
    setGramsInput(String(s.grams));
    setSelectedServingLabel(s.label);
  }, []);

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
        cals[s] = m.kcal;
      }
    }
    return cals;
  }, [data]);

  // Search, filter and list: the same state as Khám phá
  const { query, setQuery, filter, setFilter, list, filterItems, categoryName, isFavouriteFood, similarFoods, noFavourites, catalogError, retryCatalog } =
    useFoodBrowse();

  // Recents are foods with the serving they were logged with: tap = add with that serving, chevron = portion panel
  const recentShortcuts = useMemo<RecentShortcut[]>(
    () =>
      recentFoods
        .map((r) => resolveRecent(r, MOCK_FOODS))
        .filter((r): r is ResolvedRecent => r !== null)
        .map((r) => ({ key: `${r.food.id}|${r.label}`, food: r.food, label: r.label, grams: r.grams }))
        .slice(0, MAX_SHORTCUT_RECENTS),
    [recentFoods]
  );
  // Favourites add with the portion they were last logged with, else their first serving
  // A favourite already in Gần đây is not repeated (two identical buttons confuse screen readers)
  const favouriteShortcuts = useMemo<RecentShortcut[]>(
    () =>
      resolveFavourites(favouriteIds, MOCK_FOODS)
        .filter((food) => !recentShortcuts.some((r) => r.food.id === food.id))
        .slice(0, MAX_SHORTCUT_FAVOURITES)
        .map((food) => {
          const last = lastPortionOf(food.id, recentFoods, MOCK_FOODS);
          const serving = last ? { label: last.label, grams: last.grams } : (food.servings[0] ?? { label: "100 g", grams: 100 });
          return { key: `fav|${food.id}`, food, label: serving.label, grams: serving.grams };
        }),
    [favouriteIds, recentFoods, recentShortcuts]
  );
  const savedMealShortcuts = useMemo<SavedMealShortcut[]>(
    () =>
      savedMeals
        .map((meal) => ({ meal, ...savedMealTotals(meal, MOCK_FOODS) }))
        .filter((s) => s.itemCount > 0)
        .slice(0, MAX_SHORTCUT_MEALS),
    [savedMeals]
  );

  const showShortcuts = !query.trim() && filter === "all" && !compareMode;
  const favouritesOnly = filter === "favorite" && !query.trim();

  // Active grams number
  const parsedGrams = useMemo(() => {
    return parseGramsInput(gramsInput);
  }, [gramsInput]);

  // Submit action
  const handleAddFood = async () => {
    if (!selectedFood || parsedGrams <= 0 || isSubmitting || mealSlot === null) return;
    setIsSubmitting(true);
    try {
      if (await addFoodEntry(selectedFood, parsedGrams, mealSlot, selectedServingLabel)) router.push("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit and stay to add more foods to the same meal slot
  const handleAddAndContinue = async () => {
    if (!selectedFood || parsedGrams <= 0 || isSubmitting || mealSlot === null) return;
    setIsSubmitting(true);
    try {
      const ok = await addFoodEntry(selectedFood, parsedGrams, mealSlot, selectedServingLabel);
      if (ok) {
        setAddedCount((c) => c + 1);
        setSelectedFood(null);
        setGramsInput("");
        setSelectedServingLabel("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // One tap on a recent (or a favourite with history): add with the last portion, 5 s undo, back to the diary
  // A ref, not state: two taps in the same frame must not both add (the second would replace the undo of the first)
  const oneTapLock = useRef(false);

  const addWithPortion = async (food: FoodItem, grams: number, label: string) => {
    if (oneTapLock.current || isSubmitting || mealSlot === null) return;
    // Unknown energy cannot be logged in one tap: open the portion panel, which says why
    if (!hasEnergy(food)) {
      pickFood(food, { label, grams });
      return;
    }
    oneTapLock.current = true;
    setIsSubmitting(true);
    try {
      await addFoodEntry(food, grams, mealSlot, label, { undoable: true });
      router.push("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSavedMealToMeal = (meal: SavedMeal) => {
    if (oneTapLock.current || mealSlot === null) return;
    oneTapLock.current = true;
    addSavedMeal(meal, mealSlot);
    router.push("/");
  };

  const submitQuickEntry = (input: QuickEntryInput): QuickEntryResult => {
    if (oneTapLock.current) return { ok: false, field: "kcal", message: "Đang thêm…" };
    if (mealSlot === null) return { ok: false, field: "kcal", message: "Chưa chọn bữa" };
    const result = addQuickEntry(input, mealSlot);
    if (result.ok) {
      oneTapLock.current = true;
      router.push("/");
    }
    return result;
  };

  const toggleCompare = (food: FoodItem) => {
    setCompareIds((prev) =>
      prev.includes(food.id) ? prev.filter((id) => id !== food.id) : prev.length >= MAX_COMPARE_FOODS ? prev : [...prev, food.id]
    );
  };
  const compareFull = compareIds.length >= MAX_COMPARE_FOODS;
  const compareDisabledIds = useMemo(
    () => (compareMode && compareFull ? list.foods.map((f) => f.id).filter((id) => !compareIds.includes(id)) : undefined),
    [compareMode, compareFull, list.foods, compareIds]
  );
  const compareNames = compareIds.map((id) => MOCK_FOODS.find((f) => f.id === id)?.nameVi ?? id);
  const openCompare = () => router.push(compareHref(compareIds));

  // A favourite with a last portion adds in one tap, like a recent. Without history the portion panel opens.
  const pickFromList = (food: FoodItem) => {
    const last = favouritesOnly ? lastPortionOf(food.id, recentFoods, MOCK_FOODS) : null;
    if (last) void addWithPortion(last.food, last.grams, last.label);
    else pickFood(food);
  };

  const handleClose = useCallback(() => {
    if (typeof window !== "undefined") {
      const openerId =
        sessionStorage.getItem("last_add_opener_id") ||
        (mealSlot ? `desktop-add-${mealSlot}` : "desktop-add-btn");
      sessionStorage.removeItem("last_add_opener_id");
      sessionStorage.setItem("return_focus_id", openerId);
    }
    goBack();
  }, [mealSlot, goBack]);

  // Keyboard navigation on desktop: Enter adds, Esc closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // An open sheet (Chỉ ghi kcal, meal switcher) closes itself on Esc; the add screen stays
        if (quickOpen || switcherOpen) return;
        e.preventDefault();
        handleClose();
      } else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        // If not typing in input or if adding (the Chỉ ghi kcal form handles its own Enter)
        if (selectedFood && parsedGrams > 0 && !quickOpen && !compareMode) {
          handleAddFood();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, selectedFood, parsedGrams, handleAddFood, quickOpen, switcherOpen, compareMode]);

  const mealNameVi = mealSlot ? getMealSlotNameVi(mealSlot) : "—";

  // Meta line for a food row in the list
  const getFoodMeta = foodMeta;

  // Shared by the phone sheet and the desktop dialog
  const newFoodHref = mealSlot ? `/foods/new?meal=${mealSlot}` : "/foods/new";
  const emptyState = (
    <FoodEmptyState
      query={query}
      filter={filter}
      noFavourites={noFavourites}
      similarFoods={similarFoods}
      catalogError={catalogError}
      onRetryCatalog={retryCatalog}
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
      favourites={favouriteShortcuts}
      savedMeals={savedMealShortcuts}
      onAddRecent={(r) => void addWithPortion(r.food, r.grams, r.label)}
      onOpenRecent={(r) => pickFood(r.food, { label: r.label, grams: r.grams })}
      onAddSavedMeal={addSavedMealToMeal}
      onQuickKcal={() => setQuickOpen(true)}
    />
  );

  const createFoodLink = <CreateFoodButton href={newFoodHref} />;

  // "So sánh" in the header: turns the rows into selectable items. Pressing it again leaves the mode.
  const compareToggle = (
    <button
      type="button"
      aria-pressed={compareMode}
      onClick={() => {
        setCompareMode((on) => !on);
        setCompareIds([]);
      }}
      className={`min-h-[44px] cursor-pointer rounded-full px-4 text-sm font-bold active:scale-[0.97] motion-reduce:active:scale-100 ${
        compareMode ? "border-0 bg-ink text-on-dark" : "border border-card-border bg-card text-text hover:bg-page"
      }`}
    >
      So sánh
    </button>
  );

  // The list's selection props: one tapped row for the portion panel, or the ticked rows in So sánh mode
  const listPick = compareMode
    ? { selectedId: undefined, selectedIds: compareIds, disabledIds: compareDisabledIds, onPick: toggleCompare, onOpen: undefined }
    : { selectedId: selectedFood?.id, selectedIds: undefined, disabledIds: undefined, onPick: pickFromList, onOpen: favouritesOnly ? pickFood : undefined };

  return (
    <div className="min-h-screen bg-page text-text font-sans">
      {/* ============================================================== */}
      {/* DESKTOP MODAL OVER TODAY (≥1024px)                             */}
      {/* ============================================================== */}
      <div className="hidden lg:block relative min-h-screen">
        {/* Background Today page (inert while modal is open) */}
        <div aria-hidden="true" className="pointer-events-none select-none opacity-40">
          <HomeScreen />
        </div>

        {/* Modal Overlay / Scrim */}
        <div
          onClick={handleClose}
          className="fixed inset-0 bg-scrim z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dlg-title"
            onClick={(e) => e.stopPropagation()}
            className="w-[min(900px,100%-32px)] bg-card border border-card-border rounded-[18px] p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
          >
            {/* Dialog Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col items-start">
                <button
                  type="button"
                  onClick={() => setSwitcherOpen(true)}
                  aria-haspopup="listbox"
                  className="min-h-[44px] px-2 -ml-2 rounded-lg bg-transparent border-0 text-text font-normal text-lg flex items-center gap-2 cursor-pointer hover:bg-page active:scale-[0.98] transition-all"
                >
                  <span id="dlg-title">
                    Thêm vào: <strong className="font-bold">{mealNameVi}</strong>
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
                {compareToggle}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Đóng"
                  className="w-11 h-11 rounded-full bg-page text-text flex items-center justify-center border-0 cursor-pointer hover:bg-divider transition-colors active:scale-[0.97]"
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
                {addedCount > 0 && (
                  <div
                    role="status"
                    className="flex items-center justify-between rounded-xl bg-blue/10 border border-blue/20 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-text">
                      Đã thêm {addedCount} món vào {mealNameVi}
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className="min-h-[36px] px-3 rounded-full bg-blue text-on-accent font-bold cursor-pointer active:scale-[0.97] motion-reduce:active:scale-100 transition-all border-0"
                    >
                      Hoàn tất
                    </button>
                  </div>
                )}
                <FoodSearchField value={query} onChange={setQuery} inputRef={desktopSearchInputRef} />

                {/* Filter row: Tất cả, Yêu thích, then categories with foods */}
                <ChipRow items={filterItems} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />

                {showShortcuts && shortcuts}

                {/* Results: grouped or flat */}
                <FoodList
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
              </div>

              {/* Right Pane: Selected Food Portion & Macros, or an empty state until a food is picked */}
              <div className="w-[340px] shrink-0 self-stretch">
                {compareMode ? (
                  <CompareBar names={compareNames} onSubmit={openCompare} className="p-4" />
                ) : selectedFood ? (
                  <PortionPanel
                    food={selectedFood}
                    gramsInput={gramsInput}
                    setGramsInput={setGramsInput}
                    selectedServingLabel={selectedServingLabel}
                    setSelectedServingLabel={setSelectedServingLabel}
                    mealSlot={mealSlot}
                    onAdd={handleAddFood}
                    onAddAndContinue={handleAddAndContinue}
                    isSubmitting={isSubmitting}
                    tone="light"
                    showMicros={true}
                  />
                ) : addedCount > 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-card border border-card-border rounded-[18px] gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue/10 text-blue font-bold text-base">
                      {addedCount}
                    </div>
                    <div className="font-bold text-text text-base">
                      Đã thêm {addedCount} món vào {mealNameVi}
                    </div>
                    <p className="text-xs text-secondary leading-relaxed m-0">
                      Chọn tiếp món khác trong danh sách hoặc bấm hoàn tất để trở về nhật ký.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className="min-h-[44px] px-6 rounded-full bg-blue text-on-accent font-bold text-sm cursor-pointer hover:bg-blue/90 active:scale-[0.97] motion-reduce:active:scale-100 transition-all border-0 shadow-sm"
                    >
                      Hoàn tất bữa ăn
                    </button>
                  </div>
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
      <div className="lg:hidden flex flex-col min-h-screen relative bg-page pb-28">
        {/* Background header banner */}
        <div aria-hidden="true" className="bg-ink h-32 p-4 rounded-b-[20px] text-on-dark">
          <div className="font-display italic font-black text-xl tracking-wide">
            H1T <span className="text-sky">MICRO</span>
          </div>
        </div>

        {/* Main Sheet Container: opens tall, the header stays pinned and everything under it scrolls as one */}
        <div
          role="dialog"
          aria-label={`Thêm món vào ${mealNameVi}`}
          data-align-container="add-list"
          className="fixed inset-x-0 bottom-0 top-[8dvh] z-40 flex flex-col rounded-t-[20px] bg-card shadow-xl"
        >
          {/* Pinned header: grabber, meal switcher + close, search, chips */}
          <div className="flex shrink-0 flex-col gap-3 px-4 pt-3 pb-3">
            <div aria-hidden="true" className="h-1 w-10 shrink-0 self-center rounded-full bg-grabber" />
            {/* The phone sheet's heading: /add has no visible h1 on a phone (the desktop modal sits over Today's header) */}
            <h1 className="sr-only">Thêm món</h1>

            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col items-start">
                <button
                  type="button"
                  onClick={() => setSwitcherOpen(true)}
                  aria-haspopup="listbox"
                  aria-label="Đổi bữa"
                  className="-ml-2 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-2 text-lg text-text transition-transform active:scale-[0.98]"
                >
                  <span>
                    Thêm vào: <strong className="font-bold">{mealNameVi}</strong>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className="text-xs font-medium text-secondary">Tự chọn theo giờ trong ngày · chạm để đổi</div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {compareToggle}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Đóng"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-page text-text active:scale-[0.97]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>

            {addedCount > 0 && (
              <div
                role="status"
                className="flex items-center justify-between rounded-xl bg-blue/10 border border-blue/20 px-3 py-2 text-xs"
              >
                <span className="font-semibold text-text">
                  Đã thêm {addedCount} món vào {mealNameVi}
                </span>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="min-h-[36px] px-3 rounded-full bg-blue text-on-accent font-bold cursor-pointer active:scale-[0.97] motion-reduce:active:scale-100 transition-all border-0"
                >
                  Hoàn tất
                </button>
              </div>
            )}

            <FoodSearchField value={query} onChange={setQuery} className="shrink-0" />

            {/* Filter row: Tất cả, Yêu thích, then categories with foods */}
            <ChipRow items={filterItems} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />
          </div>

          {/* One scroll region: carousels, the food list and the create button (the last item stays reachable) */}
          <div data-add-scroll className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
            {showShortcuts && shortcuts}

            <FoodList
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

          {/* Bottom Selected Food Portion Panel */}
          {compareMode && (
            <div className="shrink-0 border-t border-divider px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
              <CompareBar names={compareNames} onSubmit={openCompare} />
            </div>
          )}
          {!compareMode && selectedFood && (
            <div className="shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <PortionPanel
                food={selectedFood}
                gramsInput={gramsInput}
                setGramsInput={setGramsInput}
                selectedServingLabel={selectedServingLabel}
                setSelectedServingLabel={setSelectedServingLabel}
                mealSlot={mealSlot}
                onAdd={handleAddFood}
                onAddAndContinue={handleAddAndContinue}
                isSubmitting={isSubmitting}
                tone="dark"
                showMicros={false}
              />
            </div>
          )}
        </div>
      </div>

      <QuickAddSheet open={quickOpen} onClose={() => setQuickOpen(false)} mealName={mealNameVi} onSubmit={submitQuickEntry} />

      {/* Meal Switcher Bottom Sheet */}
      <MealSwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        selectedSlot={mealSlot}
        onSelectSlot={(slot) => setOverrideSlot(slot)}
        mealCalories={mealCalories}
      />
    </div>
  );
}

// Past days are read-only, so the add form only opens for today (a past ?date= goes back to that day's Today view)
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
