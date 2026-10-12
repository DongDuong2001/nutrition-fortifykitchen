"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDiary } from "@/lib/diary-store";
import { usePastDayRedirect } from "@/hooks/use-past-day-redirect";
import { useBack } from "@/hooks/use-back";
import { MOCK_FOODS, type FoodItem, type FoodServing } from "@/lib/mock/foods";
import { useFoodBrowse } from "@/hooks/use-food-browse";
import { resolveRecent, type ResolvedRecent } from "@/lib/recent-foods";
import { ChipRow } from "@/components/foods/chip-row";
import { FoodList } from "@/components/foods/food-list";
import { FoodEmptyState } from "@/components/foods/food-empty-state";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { foodMeta } from "@/lib/food-meta";

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
import { TodayScreen } from "@/components/today/today-screen";

import { useMealSlot } from "@/lib/use-meal-slot";

function AddFoodInner() {
  const router = useRouter();
  // Closing the sheet returns to the tab it was opened from (the diary when there is no history)
  const goBack = useBack();
  const searchParams = useSearchParams();
  const { data, addFoodEntry, recentFoods } = useDiary();

  const resolvedSlot = useMealSlot(searchParams.get("meal"));
  const [overrideSlot, setOverrideSlot] = useState<MealSlot | null>(null);
  const mealSlot = overrideSlot ?? resolvedSlot;

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  const [gramsInput, setGramsInput] = useState("");
  const [selectedServingLabel, setSelectedServingLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const { query, setQuery, filter, setFilter, list, filterItems, categoryName, isFavouriteFood, similarFoods, noFavourites } =
    useFoodBrowse();

  // Recents are foods with the serving they were logged with. Tapping one picks it.
  const recentItems = useMemo(
    () =>
      recentFoods
        .map((r) => resolveRecent(r, MOCK_FOODS))
        .filter((r): r is ResolvedRecent => r !== null)
        .map((r) => ({
          id: `${r.food.id}|${r.label}`,
          label: `${r.food.nameVi} ${r.label}`,
          onClick: () => pickFood(r.food, { label: r.label, grams: r.grams }),
        })),
    [recentFoods, pickFood]
  );


  // Active grams number
  const parsedGrams = useMemo(() => {
    return parseGramsInput(gramsInput);
  }, [gramsInput]);

  // Submit action
  const handleAddFood = async () => {
    if (!selectedFood || parsedGrams <= 0 || isSubmitting || mealSlot === null) return;
    setIsSubmitting(true);
    try {
      await addFoodEntry(selectedFood, parsedGrams, mealSlot, selectedServingLabel);
      router.push("/diary");
    } finally {
      setIsSubmitting(false);
    }
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
        e.preventDefault();
        handleClose();
      } else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        // If not typing in input or if adding
        if (selectedFood && parsedGrams > 0) {
          handleAddFood();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, selectedFood, parsedGrams, handleAddFood]);

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
      getMeta={getFoodMeta}
      onPickSimilar={(food) => pickFood(food)}
      onClearFilter={() => setFilter("all")}
      newFoodHref={newFoodHref}
    />
  );

  const createFoodLink = (
    <Link
      href={newFoodHref}
      className="-mx-3 no-underline text-left rounded-xl p-3 flex flex-col justify-center min-h-[52px] hover:bg-page transition-colors"
    >
      <span className="text-[15px] font-bold text-blue">+ Tạo món mới</span>
      <span className="text-xs text-secondary">Không thấy món? Tự nhập dinh dưỡng</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-page text-text font-sans">
      {/* ============================================================== */}
      {/* DESKTOP MODAL OVER TODAY (≥1024px)                             */}
      {/* ============================================================== */}
      <div className="hidden lg:block relative min-h-screen">
        {/* Background Today page (inert while modal is open) */}
        <div aria-hidden="true" className="pointer-events-none select-none opacity-40">
          <TodayScreen />
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
            className="w-[min(900px,100%-32px)] bg-card border border-card-border rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
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

            {/* Two Pane Layout */}
            <div className="flex gap-6 items-start">
              {/* Left Pane: Search & Results */}
              <div data-align-container="add-list" className="flex-1 min-w-[340px] flex flex-col gap-3">
                <FoodSearchField value={query} onChange={setQuery} inputRef={desktopSearchInputRef} />

                {/* Filter row: Tất cả, Yêu thích, then categories with foods */}
                <ChipRow items={filterItems} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />

                {/* Recents: tap to pick that food with that serving */}
                {!query && recentItems.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="text-xs font-semibold text-secondary">Gần đây</div>
                    <ChipRow items={recentItems} ariaLabel="Món gần đây" />
                  </div>
                )}

                {/* Results: grouped or flat */}
                <FoodList
                  list={list}
                  selectedId={selectedFood?.id}
                  onPick={pickFood}
                  getMeta={getFoodMeta}
                  categoryName={categoryName}
                  isFavourite={isFavouriteFood}
                  empty={emptyState}
                  footer={createFoodLink}
                  className="max-h-[360px] overflow-y-auto pb-1"
                />
              </div>

              {/* Right Pane: Selected Food Portion & Macros, or an empty state until a food is picked */}
              <div className="w-[340px] shrink-0 self-stretch">
                {selectedFood ? (
                  <PortionPanel
                    food={selectedFood}
                    gramsInput={gramsInput}
                    setGramsInput={setGramsInput}
                    selectedServingLabel={selectedServingLabel}
                    setSelectedServingLabel={setSelectedServingLabel}
                    mealSlot={mealSlot}
                    onAdd={handleAddFood}
                    isSubmitting={isSubmitting}
                    tone="light"
                    showMicros={true}
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
      <div className="lg:hidden flex flex-col min-h-screen relative bg-page pb-28">
        {/* Background header banner */}
        <div aria-hidden="true" className="bg-ink h-32 p-4 rounded-b-[20px] text-on-dark">
          <div className="font-display italic font-black text-xl tracking-wide">
            H1T <span className="text-sky">MICRO</span>
          </div>
        </div>

        {/* Main Sheet Container */}
        <div
          role="dialog"
          aria-label={`Thêm món vào ${mealNameVi}`}
          data-align-container="add-list"
          className="absolute inset-x-0 top-14 bottom-0 bg-card rounded-t-[20px] p-4 flex flex-col gap-3.5 shadow-xl min-h-[calc(100vh-56px)]"
        >
          {/* Top Grabber */}
          <div aria-hidden="true" className="w-10 h-1 rounded-full bg-grabber self-center shrink-0" />
          {/* The phone sheet's heading: /add has no visible h1 on a phone (the desktop modal sits over Today's header) */}
          <h1 className="sr-only">Thêm món</h1>

          {/* Header Row: Meal Switcher Trigger + Close Button */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col items-start">
              <button
                type="button"
                onClick={() => setSwitcherOpen(true)}
                aria-haspopup="listbox"
                aria-label="Đổi bữa"
                className="min-h-[44px] px-2 -ml-2 rounded-lg bg-transparent border-0 text-text text-lg flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <span>
                  Thêm vào: <strong className="font-bold">{mealNameVi}</strong>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div className="text-xs text-secondary font-medium">
                Tự chọn theo giờ trong ngày · chạm để đổi
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng"
              className="w-11 h-11 rounded-full bg-page text-text flex items-center justify-center border-0 cursor-pointer active:scale-[0.97]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <FoodSearchField value={query} onChange={setQuery} className="shrink-0" />

          {/* Filter row: Tất cả, Yêu thích, then categories with foods */}
          <ChipRow items={filterItems} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />

          {/* Gần đây (Recents): tap to pick that food with that serving */}
          {!query && recentItems.length > 0 && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="text-xs font-semibold text-secondary">Gần đây</div>
              <ChipRow items={recentItems} ariaLabel="Món gần đây" />
            </div>
          )}

          {/* Results: grouped or flat */}
          <FoodList
            list={list}
            selectedId={selectedFood?.id}
            onPick={pickFood}
            getMeta={getFoodMeta}
            categoryName={categoryName}
            isFavourite={isFavouriteFood}
            empty={emptyState}
            footer={createFoodLink}
            className="min-h-0 flex-1 overflow-y-auto pb-1"
          />

          {/* Bottom Selected Food Portion Panel */}
          {selectedFood && (
            <div className="shrink-0">
              <PortionPanel
                food={selectedFood}
                gramsInput={gramsInput}
                setGramsInput={setGramsInput}
                selectedServingLabel={selectedServingLabel}
                setSelectedServingLabel={setSelectedServingLabel}
                mealSlot={mealSlot}
                onAdd={handleAddFood}
                isSubmitting={isSubmitting}
                tone="dark"
                showMicros={false}
              />
            </div>
          )}
        </div>
      </div>

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
