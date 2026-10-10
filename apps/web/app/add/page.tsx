"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDiary } from "@/lib/diary-store";
import { MOCK_FOODS, type FoodItem } from "@/lib/mock/foods";
import { searchFoods, findSimilarFoods } from "@/lib/search";
import {
  parseMealSlot,
  getDefaultMealSlot,
  getMealSlotNameVi,
  type MealSlot,
  MEAL_SLOTS,
} from "@/lib/meal-slot";
import { parseGramsInput, calculateMacroPreview, scaleNutrients } from "@/lib/portion";
import { MealSwitcher } from "@/components/meal-switcher";
import { formatNumber } from "@/lib/format";
import TodayContent from "../today/page";

function AddFoodInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, addFoodEntry, recentSearches, addRecentSearch } = useDiary();

  // Meal slot from query param or default time of day
  const paramMeal = searchParams.get("meal");
  const [mealSlot, setMealSlot] = useState<MealSlot>(() => {
    if (paramMeal) return parseMealSlot(paramMeal);
    return getDefaultMealSlot(new Date(), true);
  });

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [filterChip, setFilterChip] = useState<"all" | "favorite">("all");
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(() => {
    // Default select Chà là if present to match design preview
    return MOCK_FOODS.find((f) => f.id === "food-cha-la") || MOCK_FOODS[0] || null;
  });

  const [gramsInput, setGramsInput] = useState("30");
  const [selectedServingLabel, setSelectedServingLabel] = useState("30 g");
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

  // Sync grams with selected food default serving
  useEffect(() => {
    if (selectedFood) {
      const firstServing = selectedFood.servings[0];
      if (firstServing) {
        setGramsInput(firstServing.grams.toString());
        setSelectedServingLabel(firstServing.label);
      } else {
        setGramsInput("100");
        setSelectedServingLabel("100 g");
      }
    }
  }, [selectedFood]);

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

  // Filtered foods
  const searchResults = useMemo(() => {
    return searchFoods(MOCK_FOODS, query);
  }, [query]);

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

  // Macro preview for selected food & grams
  const macroPreview = useMemo(() => {
    if (!selectedFood) return { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };
    return calculateMacroPreview(selectedFood.nutrients, parsedGrams);
  }, [selectedFood, parsedGrams]);

  // Scaled micros for preview (potassium, calcium, etc.)
  const scaledMicros = useMemo(() => {
    if (!selectedFood) return [];
    const scaled = scaleNutrients(selectedFood.nutrients, parsedGrams);
    const list: { name: string; value: string }[] = [];
    if (scaled.potassium) list.push({ name: "Kali", value: `${formatNumber(Math.round(scaled.potassium))} mg` });
    if (scaled.magnesium) list.push({ name: "Magie", value: `${formatNumber(Math.round(scaled.magnesium))} mg` });
    if (scaled.calcium) list.push({ name: "Canxi", value: `${formatNumber(Math.round(scaled.calcium))} mg` });
    if (scaled.iron) list.push({ name: "Sắt", value: `${formatNumber(scaled.iron)} mg` });
    if (scaled.copper) list.push({ name: "Đồng", value: `${formatNumber(scaled.copper)} mg` });
    if (scaled.pyridoxine) list.push({ name: "Vitamin B6", value: `${formatNumber(scaled.pyridoxine)} mg` });
    return list;
  }, [selectedFood, parsedGrams]);

  // Submit action
  const handleAddFood = async () => {
    if (!selectedFood || parsedGrams <= 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addFoodEntry(selectedFood, parsedGrams, mealSlot, selectedServingLabel);
      if (query.trim()) {
        addRecentSearch(query);
      }
      router.push("/today");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard navigation on desktop: Enter adds, Esc closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/today");
      } else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        // If not typing in input or if adding
        if (selectedFood && parsedGrams > 0) {
          handleAddFood();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFood, parsedGrams, mealSlot, selectedServingLabel]);

  const mealNameVi = getMealSlotNameVi(mealSlot);

  // Meta string for food in search list
  const getFoodMeta = (food: FoodItem) => {
    const defaultServing = food.servings[0] || { label: "100 g", grams: 100 };
    const scaled = scaleNutrients(food.nutrients, defaultServing.grams);
    const cals = Math.round(scaled.energy ?? 0);
    const carbs = Math.round((scaled.carbs ?? 0) * 10) / 10;
    const kali = scaled.potassium ? Math.round(scaled.potassium) : null;

    const parts = [`${formatNumber(cals)} kcal / ${defaultServing.label}`];
    if (carbs > 0) parts.push(`${formatNumber(carbs)} g carb`);
    if (kali) parts.push(`${formatNumber(kali)} mg kali`);
    return parts.join(" · ");
  };

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
          onClick={() => router.push("/today")}
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
                onClick={() => router.push("/today")}
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
              <div className="flex-1 min-w-[340px] flex flex-col gap-3">
                {/* Search Bar */}
                <label className="flex items-center gap-2.5 bg-page border border-card-border rounded-full px-4 min-h-[48px]">
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
                    className="flex-1 bg-transparent border-0 outline-none text-text text-base min-h-[44px]"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Xoá tìm kiếm"
                      onClick={() => setQuery("")}
                      className="text-secondary hover:text-text cursor-pointer p-1"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </label>

                {/* Chips */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-pressed={filterChip === "favorite"}
                    onClick={() => setFilterChip("favorite")}
                    className={`min-h-[44px] px-4 rounded-full text-xs font-semibold cursor-pointer border-0 transition-colors ${
                      filterChip === "favorite" ? "bg-ink text-white" : "bg-page text-text hover:bg-divider"
                    }`}
                  >
                    Yêu thích
                  </button>
                  <button
                    type="button"
                    aria-pressed={filterChip === "all"}
                    onClick={() => setFilterChip("all")}
                    className={`min-h-[44px] px-4 rounded-full text-xs font-semibold cursor-pointer border-0 transition-colors ${
                      filterChip === "all" ? "bg-ink text-white" : "bg-page text-text hover:bg-divider"
                    }`}
                  >
                    Tất cả
                  </button>
                </div>

                {/* Recents */}
                {!query && recentSearches.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="text-xs font-semibold text-secondary">Gần đây</div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.slice(0, 4).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            const foodName = q.split(" ")[0];
                            setQuery(foodName);
                          }}
                          className="min-h-[44px] px-3.5 rounded-full border border-card-border bg-white text-text text-xs font-semibold cursor-pointer hover:bg-page transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results List */}
                <div role="listbox" aria-label="Kết quả tìm kiếm" className="flex flex-col gap-1 max-h-[360px] overflow-y-auto pr-1">
                  {searchResults.map((food) => {
                    const isSelected = selectedFood?.id === food.id;
                    return (
                      <button
                        key={food.id}
                        role="option"
                        aria-selected={isSelected}
                        type="button"
                        onClick={() => setSelectedFood(food)}
                        className={`text-left cursor-pointer border-0 rounded-xl p-3 flex items-center gap-3 min-h-[56px] transition-colors ${
                          isSelected ? "bg-blue/10 text-text font-semibold" : "bg-white hover:bg-page text-text"
                        }`}
                      >
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <div className="text-[15px] font-bold text-text truncate">{food.nameVi}</div>
                          <div className="text-xs text-secondary truncate">{getFoodMeta(food)}</div>
                        </div>
                        {isSelected && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="text-blue shrink-0" aria-hidden="true">
                            <path d="M5 12l5 5 9-10" />
                          </svg>
                        )}
                      </button>
                    );
                  })}

                  {/* Empty state when searching */}
                  {searchResults.length === 0 && (
                    <div className="flex flex-col items-center text-center py-6 gap-2">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-secondary" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-3.5-3.5M8 8l6 6M14 8l-6 6" />
                      </svg>
                      <div className="text-base font-bold">Không có “{query}”</div>
                      <div className="text-xs text-secondary">Thử từ ngắn hơn, bỏ dấu, hoặc tự tạo món.</div>
                      <Link
                        href={`/foods/new?meal=${mealSlot}`}
                        className="mt-2 min-h-[44px] px-6 rounded-full bg-blue text-white font-bold text-xs flex items-center justify-center no-underline hover:bg-blue/90"
                      >
                        + Tạo món mới
                      </Link>

                      {/* Fuzzy matches */}
                      {similarFoods.length > 0 && (
                        <div className="w-full text-left mt-3 flex flex-col gap-1">
                          <div className="text-xs font-semibold text-secondary">Gợi ý gần giống:</div>
                          {similarFoods.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedFood(s)}
                              className="text-left py-2 px-3 rounded-lg hover:bg-page text-sm font-semibold text-text border-0 bg-transparent cursor-pointer flex justify-between"
                            >
                              <span>{s.nameVi}</span>
                              <span className="text-xs text-secondary font-normal">{getFoodMeta(s)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Create new food button at end of list */}
                  <Link
                    href={`/foods/new?meal=${mealSlot}`}
                    className="no-underline text-left rounded-xl p-3 flex flex-col justify-center min-h-[56px] hover:bg-page transition-colors"
                  >
                    <span className="text-[15px] font-bold text-blue">+ Tạo món mới</span>
                    <span className="text-xs text-secondary">Không thấy món? Tự nhập dinh dưỡng</span>
                  </Link>
                </div>
              </div>

              {/* Right Pane: Selected Food Portion & Macros */}
              {selectedFood && (
                <div className="w-[340px] shrink-0 bg-page border border-card-border rounded-xl p-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="m-0 text-xl font-bold text-text truncate">{selectedFood.nameVi}</h3>
                      <Link
                        href={`/foods/${selectedFood.id}?meal=${mealSlot}`}
                        className="text-xs text-blue font-semibold hover:underline shrink-0"
                      >
                        Chi tiết →
                      </Link>
                    </div>
                    {selectedFood.tipVi && (
                      <div className="text-xs text-blue font-medium leading-relaxed">
                        {selectedFood.tipVi}
                      </div>
                    )}
                  </div>

                  {/* Serving size controls */}
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-secondary">Khối lượng:</span>
                      <div className="flex items-center bg-white border-2 border-blue rounded-lg px-2.5 h-10 w-24">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="Số gam"
                          value={gramsInput}
                          onChange={(e) => {
                            setGramsInput(e.target.value);
                            setSelectedServingLabel(`${e.target.value} g`);
                          }}
                          className="w-full bg-transparent border-0 outline-none font-bold text-base tabular-nums text-text text-right"
                        />
                        <span className="text-xs text-secondary ml-1 font-semibold">g</span>
                      </div>
                    </label>

                    {/* Serving chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFood.servings.map((s) => {
                        const isMatch = selectedServingLabel === s.label;
                        return (
                          <button
                            key={s.label}
                            type="button"
                            onClick={() => {
                              setGramsInput(s.grams.toString());
                              setSelectedServingLabel(s.label);
                            }}
                            className={`min-h-[44px] px-3 rounded-full text-xs font-bold border-0 cursor-pointer transition-colors ${
                              isMatch ? "bg-ink text-white" : "bg-white text-text border border-card-border hover:bg-page"
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4-up Macro Preview */}
                  <div className="grid grid-cols-4 gap-2 bg-white rounded-xl p-3 border border-card-border">
                    <div className="flex flex-col items-center">
                      <div className="font-display italic font-black text-xl tabular-nums text-text">
                        {formatNumber(macroPreview.calories)}
                      </div>
                      <div className="text-[11px] text-secondary font-semibold">kcal</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="font-display italic font-black text-xl tabular-nums text-text">
                        {formatNumber(macroPreview.carbs)} g
                      </div>
                      <div className="text-[11px] text-secondary font-semibold">Carb</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="font-display italic font-black text-xl tabular-nums text-text">
                        {formatNumber(macroPreview.protein)} g
                      </div>
                      <div className="text-[11px] text-secondary font-semibold">Đạm</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="font-display italic font-black text-xl tabular-nums text-text">
                        {formatNumber(macroPreview.fat)} g
                      </div>
                      <div className="text-[11px] text-secondary font-semibold">Béo</div>
                    </div>
                  </div>

                  {/* Micros in portion */}
                  {scaledMicros.length > 0 && (
                    <div className="bg-white rounded-xl p-3 border border-card-border flex flex-col gap-1.5">
                      <div className="text-xs font-semibold text-secondary pb-1 border-b border-card-border">
                        Vi chất trong {gramsInput} g:
                      </div>
                      {scaledMicros.map((m) => (
                        <div key={m.name} className="flex justify-between items-center text-xs py-0.5">
                          <span className="font-semibold text-text">{m.name}</span>
                          <span className="text-secondary font-medium tabular-nums">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Primary CTA */}
                  <button
                    type="button"
                    onClick={handleAddFood}
                    disabled={isSubmitting || parsedGrams <= 0}
                    className="w-full min-h-[52px] rounded-full bg-blue text-white font-bold text-base cursor-pointer hover:bg-blue/90 active:scale-[0.98] transition-all border-0 flex items-center justify-center shadow-md disabled:opacity-50"
                  >
                    Thêm vào {mealNameVi}
                  </button>
                </div>
              )}
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
              aria-label="Đóng"
              className="w-11 h-11 rounded-full bg-page text-text flex items-center justify-center no-underline active:scale-[0.97]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Link>
          </div>

          {/* Search Input (min 48px, visible label) */}
          <label className="flex items-center gap-2.5 bg-page border border-card-border rounded-full px-4 min-h-[48px] shrink-0">
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
              className="flex-1 bg-transparent border-0 outline-none text-text text-base min-h-[44px]"
            />
            {query && (
              <button
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => setQuery("")}
                className="text-secondary hover:text-text cursor-pointer p-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </label>

          {/* Filter Chips */}
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              aria-pressed={filterChip === "favorite"}
              onClick={() => setFilterChip("favorite")}
              className={`min-h-[44px] px-4 rounded-full text-xs font-semibold cursor-pointer border-0 transition-colors ${
                filterChip === "favorite" ? "bg-ink text-white" : "bg-page text-text"
              }`}
            >
              Yêu thích
            </button>
            <button
              type="button"
              aria-pressed={filterChip === "all"}
              onClick={() => setFilterChip("all")}
              className={`min-h-[44px] px-4 rounded-full text-xs font-semibold cursor-pointer border-0 transition-colors ${
                filterChip === "all" ? "bg-ink text-white" : "bg-page text-text"
              }`}
            >
              Tất cả
            </button>
          </div>

          {/* Gần đây (Recents) */}
          {!query && recentSearches.length > 0 && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="text-xs font-semibold text-secondary">Gần đây</div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {recentSearches.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      const foodName = q.split(" ")[0];
                      setQuery(foodName);
                    }}
                    className="shrink-0 min-h-[44px] px-3.5 rounded-full border border-card-border bg-white text-text text-xs font-semibold cursor-pointer active:scale-[0.98]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results List */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-0.5">
            {searchResults.map((food) => {
              const isSelected = selectedFood?.id === food.id;
              return (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => setSelectedFood(food)}
                  className={`text-left cursor-pointer border-0 rounded-xl p-3 flex items-center gap-3 min-h-[52px] transition-colors ${
                    isSelected ? "bg-blue/10 text-text" : "bg-white text-text hover:bg-page"
                  }`}
                >
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="text-[15px] font-bold text-text truncate">{food.nameVi}</div>
                    <div className="text-xs text-secondary truncate">{getFoodMeta(food)}</div>
                  </div>
                  {isSelected && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="text-blue shrink-0" aria-hidden="true">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                </button>
              );
            })}

            {/* Empty Search State */}
            {searchResults.length === 0 && (
              <div className="flex flex-col items-center text-center py-6 gap-2">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-secondary" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5M8 8l6 6M14 8l-6 6" />
                </svg>
                <div className="text-lg font-bold">Không có “{query}”</div>
                <div className="text-sm text-secondary">Thử từ ngắn hơn, bỏ dấu, hoặc tự tạo món.</div>
                <Link
                  href={`/foods/new?meal=${mealSlot}`}
                  className="mt-2 min-h-[52px] px-7 rounded-full bg-blue text-white font-bold text-base flex items-center justify-center no-underline active:scale-[0.97]"
                >
                  + Tạo món mới
                </Link>

                {/* Fuzzy Matches */}
                {similarFoods.length > 0 && (
                  <div className="w-full text-left mt-4 flex flex-col gap-1">
                    <div className="text-xs font-semibold text-secondary">Gợi ý gần giống:</div>
                    {similarFoods.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedFood(s)}
                        className="text-left py-2.5 px-3 rounded-xl hover:bg-page text-sm font-semibold text-text border-0 bg-white cursor-pointer flex justify-between items-center min-h-[48px]"
                      >
                        <span>{s.nameVi}</span>
                        <span className="text-xs text-secondary font-normal">{getFoodMeta(s)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create Food Link */}
            <Link
              href={`/foods/new?meal=${mealSlot}`}
              className="no-underline text-left rounded-xl p-3 flex flex-col justify-center min-h-[52px] hover:bg-page transition-colors"
            >
              <span className="text-[15px] font-bold text-blue">+ Tạo món mới</span>
              <span className="text-xs text-secondary">Không thấy món? Tự nhập dinh dưỡng</span>
            </Link>
          </div>

          {/* Bottom Selected Food Portion Panel */}
          {selectedFood && (
            <div className="shrink-0 bg-ink text-white rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-lg font-bold truncate">{selectedFood.nameVi}</div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedFood.tipVi && (
                    <span className="text-xs text-sky truncate max-w-[140px]">
                      {selectedFood.tipVi}
                    </span>
                  )}
                  <Link
                    href={`/foods/${selectedFood.id}?meal=${mealSlot}`}
                    className="text-xs text-sky font-semibold no-underline hover:underline min-h-[44px] inline-flex items-center"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </div>

              {/* Gram Input and Serving Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center bg-surface-dark rounded-xl px-3 h-11 w-28 shrink-0">
                  <span className="sr-only">Khối lượng</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Số gam"
                    value={gramsInput}
                    onChange={(e) => {
                      setGramsInput(e.target.value);
                      setSelectedServingLabel(`${e.target.value} g`);
                    }}
                    className="w-full bg-transparent border-0 outline-none text-white font-bold text-lg tabular-nums text-right"
                  />
                  <span className="text-xs text-muted-on-dark ml-1 font-semibold">g</span>
                </label>

                {selectedFood.servings.map((s) => {
                  const isMatch = selectedServingLabel === s.label;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        setGramsInput(s.grams.toString());
                        setSelectedServingLabel(s.label);
                      }}
                      className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold border-0 cursor-pointer active:scale-[0.97] transition-colors ${
                        isMatch ? "bg-white text-ink" : "bg-surface-dark text-white hover:bg-surface-dark/80"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* 4-up Preview */}
              <div className="grid grid-cols-4 gap-2 pt-1 border-t border-card-border/20">
                <div className="flex flex-col">
                  <div className="font-display italic font-black text-xl tabular-nums">
                    {formatNumber(macroPreview.calories)}
                  </div>
                  <div className="text-xs text-muted-on-dark">kcal</div>
                </div>
                <div className="flex flex-col">
                  <div className="font-display italic font-black text-xl tabular-nums">
                    {formatNumber(macroPreview.carbs)} g
                  </div>
                  <div className="text-xs text-muted-on-dark">Carb</div>
                </div>
                <div className="flex flex-col">
                  <div className="font-display italic font-black text-xl tabular-nums">
                    {formatNumber(macroPreview.protein)} g
                  </div>
                  <div className="text-xs text-muted-on-dark">Đạm</div>
                </div>
                <div className="flex flex-col">
                  <div className="font-display italic font-black text-xl tabular-nums">
                    {formatNumber(macroPreview.fat)} g
                  </div>
                  <div className="text-xs text-muted-on-dark">Béo</div>
                </div>
              </div>

              {/* Action Buttons: Primary CTA + Detail link */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddFood}
                  disabled={isSubmitting || parsedGrams <= 0}
                  className="flex-1 min-h-[52px] rounded-full bg-blue text-white font-bold text-base cursor-pointer hover:bg-blue/90 active:scale-[0.97] transition-all border-0 flex items-center justify-center disabled:opacity-50"
                >
                  Thêm vào {mealNameVi}
                </button>
                <Link
                  href={`/foods/${selectedFood.id}?meal=${mealSlot}`}
                  aria-label="Xem chi tiết vi chất"
                  className="w-12 h-12 rounded-full bg-surface-dark text-white flex items-center justify-center no-underline hover:bg-surface-dark/80 active:scale-[0.97] shrink-0"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meal Switcher Bottom Sheet */}
      <MealSwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        selectedSlot={mealSlot}
        onSelectSlot={(slot) => setMealSlot(slot)}
        mealCalories={mealCalories}
      />
    </div>
  );
}

export default function AddFoodPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-page" />}>
      <AddFoodInner />
    </Suspense>
  );
}
