"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDiary } from "@/lib/diary-store";
import { usePastDayRedirect } from "@/hooks/use-past-day-redirect";
import { MOCK_FOODS, type FoodItem, type FoodServing } from "@/lib/mock/foods";
import { findSimilarFoods } from "@/lib/search";
import {
  buildFoodList,
  categoriesWithFoods,
  categoryLabel,
  categoryOf,
  type FoodFilter,
} from "@/lib/food-categories";
import { resolveRecent, type ResolvedRecent } from "@/lib/recent-foods";
import { ChipRow } from "@/components/foods/chip-row";
import { FoodList } from "@/components/foods/food-list";

import {
  parseMealSlot,
  getDefaultMealSlot,
  getMealSlotNameVi,
  type MealSlot,
  MEAL_SLOTS,
} from "@/lib/meal-slot";
import { parseGramsInput, calculateMacroPreview, scaleNutrients } from "@/lib/portion";
import { MealSwitcher } from "@/components/meal-switcher";
import { formatAmount } from "@/lib/format";
import { PortionPanel } from "@/components/ui/portion-panel";
import TodayContent from "../today/page";

import { useMealSlot } from "@/lib/use-meal-slot";

function AddFoodInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, addFoodEntry, recentFoods, favouriteIds, isFavourite } = useDiary();

  const resolvedSlot = useMealSlot(searchParams.get("meal"));
  const [overrideSlot, setOverrideSlot] = useState<MealSlot | null>(null);
  const mealSlot = overrideSlot ?? resolvedSlot;

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [filter, setFilter] = useState<FoodFilter>("all");
  const [query, setQuery] = useState("");
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

  // Filter and search combined. Grouped only for Tất cả with no query.
  const list = useMemo(() => buildFoodList(MOCK_FOODS, query, filter, favouriteIds), [query, filter, favouriteIds]);
  const searchResults = list.foods;
  const categories = useMemo(() => categoriesWithFoods(MOCK_FOODS), []);
  const categoryName = useCallback((food: FoodItem) => categoryLabel(categoryOf(food)), []);
  const isFavouriteFood = useCallback((food: FoodItem) => isFavourite(food.id), [isFavourite]);

  // Filter row: Tất cả, Yêu thích, then only the categories that have foods
  const filterItems = [
    { id: "all", label: "Tất cả", active: filter === "all", onClick: () => setFilter("all") },
    { id: "favorite", label: "Yêu thích", active: filter === "favorite", onClick: () => setFilter("favorite") },
    ...categories.map((c) => ({
      id: c.key,
      label: c.label,
      active: filter === c.key,
      onClick: () => setFilter(c.key),
    })),
  ];

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

  // Fuzzy suggestions when results are empty
  const similarFoods = useMemo(() => {
    if (searchResults.length === 0 && query.trim()) {
      return findSimilarFoods(MOCK_FOODS, query, 4);
    }
    return [];
  }, [searchResults, query]);

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
      router.push("/today");
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
    router.push("/today");
  }, [mealSlot, router]);

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

  // Meta string for food in search list
  const getFoodMeta = (food: FoodItem) => {
    const defaultServing = food.servings[0] || { label: "100 g", grams: 100 };
    const scaled = scaleNutrients(food.nutrients, defaultServing.grams);
    const cals = Math.round(scaled.energy ?? 0);
    const carbs = Math.round((scaled.carbs ?? 0) * 10) / 10;
    const kali = scaled.potassium ? Math.round(scaled.potassium) : null;

    const parts = [`${formatAmount(cals, "kcal")} kcal / ${defaultServing.label}`];
    if (carbs > 0) parts.push(`${formatAmount(carbs, "g")} g carb`);
    if (kali) parts.push(`${formatAmount(kali, "mg")} mg kali`);
    return parts.join(" · ");
  };

  // Shared by the phone sheet and the desktop dialog
  const newFoodHref = mealSlot ? `/foods/new?meal=${mealSlot}` : "/foods/new";
  const clearFilterButton = (
    <button
      type="button"
      onClick={() => setFilter("all")}
      className="min-h-[44px] px-5 rounded-full bg-page text-text font-semibold text-sm border-0 cursor-pointer active:scale-[0.97]"
    >
      Bỏ lọc
    </button>
  );

  // No saved favourite still shows: an id whose food is gone must not show a blank "Không có “”"
  const noFavourites = filter === "favorite" && !query.trim() && list.foods.length === 0;
  const favouritesEmptyState = (
    <div className="flex flex-col items-center text-center py-6 gap-2">
      <div className="text-base font-bold">Chưa có món yêu thích</div>
      <div className="text-sm text-secondary">Bấm ♡ ở trang chi tiết món để lưu.</div>
      {clearFilterButton}
    </div>
  );

  const searchEmptyState = (
    <div className="flex flex-col items-center text-center py-6 gap-2">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-secondary" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5M8 8l6 6M14 8l-6 6" />
      </svg>
      <div className="text-base font-bold">Không có “{query}”</div>
      <div className="text-sm text-secondary">Thử từ ngắn hơn, bỏ dấu, hoặc tự tạo món.</div>
      {filter !== "all" && clearFilterButton}
      <Link
        href={newFoodHref}
        className="mt-2 min-h-[52px] px-7 rounded-full bg-blue text-white font-bold text-base flex items-center justify-center no-underline active:scale-[0.97]"
      >
        + Tạo món mới
      </Link>

      {/* Fuzzy matches */}
      {similarFoods.length > 0 && (
        <div className="w-full text-left mt-4 flex flex-col gap-1">
          <div className="text-xs font-semibold text-secondary">Gợi ý gần giống:</div>
          {similarFoods.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pickFood(s)}
              className="text-left py-2.5 px-3 rounded-xl hover:bg-page text-sm font-semibold text-text border-0 bg-white cursor-pointer flex justify-between items-center min-h-[48px]"
            >
              <span>{s.nameVi}</span>
              <span className="text-xs text-secondary font-normal">{getFoodMeta(s)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
  const emptyState = noFavourites ? favouritesEmptyState : searchEmptyState;

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
          <TodayContent />
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
                {/* Search Bar */}
                <label data-align-group="add-list" data-align-edge="left" className="flex items-center gap-2.5 bg-page border border-card-border rounded-full px-4 min-h-[48px]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-secondary shrink-0" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                  <span className="sr-only">Tìm món</span>
                  <input
                    ref={desktopSearchInputRef}
                    type="search"
                    aria-label="Tìm món"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm món: cơm, trứng, chà là…"
                    className="flex-1 bg-transparent border-0 outline-none text-text text-base min-h-[44px] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Xoá tìm kiếm"
                      onClick={() => setQuery("")}
                      className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-secondary hover:text-text cursor-pointer border-0 bg-transparent shrink-0"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </label>

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
        <div aria-hidden="true" className="bg-ink h-32 p-4 rounded-b-[20px] text-white">
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

            <Link
              href="/today"
              onClick={handleClose}
              aria-label="Đóng"
              className="w-11 h-11 rounded-full bg-page text-text flex items-center justify-center no-underline active:scale-[0.97]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Link>
          </div>

          {/* Search Input (min 48px, visible label) */}
          <label data-align-group="add-list" data-align-edge="left" className="flex items-center gap-2.5 bg-page border border-card-border rounded-full px-4 min-h-[48px] shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-secondary shrink-0" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="sr-only">Tìm món</span>
            <input
              type="search"
              aria-label="Tìm món"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm món: cơm, trứng, chà là…"
              className="flex-1 bg-transparent border-0 outline-none text-text text-base min-h-[44px] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
            {query && (
              <button
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => setQuery("")}
                className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-secondary hover:text-text cursor-pointer border-0 bg-transparent shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </label>

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
