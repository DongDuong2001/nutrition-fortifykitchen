"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDiary } from "@/lib/diary-store";
import { MOCK_FOODS, type FoodItem } from "@/lib/mock/foods";
import { getMealSlotNameVi } from "@/lib/meal-slot";
import { useMealSlot } from "@/lib/use-meal-slot";
import { parseGramsInput, calculateMacroPreview } from "@/lib/portion";
import { goodSourcesOf, microRowsFor } from "@/lib/food-detail";
import { categoryLabel, categoryOf } from "@/lib/food-categories";
import { formatAmount } from "@/lib/format";
import { foodSourceLabel } from "@/lib/food-meta";
import { FoodMicros, GoodSources } from "@/components/foods/food-micros";
import { ChipGroup } from "@/components/ui/chip-group";
import { StatGroup } from "@/components/ui/stat-group";
import { Toast } from "@/components/ui/toast";
import { AppHeader, HEADER_ICON_BUTTON } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { useBack } from "@/hooks/use-back";

function FoodDetailInner() {
  const params = useParams();
  const router = useRouter();
  // Back goes to where the food was opened from (Khám phá or the add sheet), else to Khám phá
  const goBack = useBack();
  const searchParams = useSearchParams();
  const { addFoodEntry, isFavourite, toggleFavourite, targets: dailyTargets } = useDiary();

  const foodId = params?.id as string;
  const food = useMemo(() => {
    return MOCK_FOODS.find((f) => f.id === foodId);
  }, [foodId]);

  const mealSlot = useMealSlot(searchParams.get("meal"));
  const mealNameVi = mealSlot ? getMealSlotNameVi(mealSlot) : "—";

  const [gramsInput, setGramsInput] = useState(() => {
    return food?.servings[0]?.grams.toString() || "100";
  });
  const [selectedServingLabel, setSelectedServingLabel] = useState(() => {
    return food?.servings[0]?.label || "100 g";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [favouriteToast, setFavouriteToast] = useState<{ message: string } | null>(null);

  useEffect(() => {
    if (food?.servings[0]) {
      setGramsInput(food.servings[0].grams.toString());
      setSelectedServingLabel(food.servings[0].label);
    }
  }, [food]);

  // Auto-dismiss the favourite toast after 4s, like the diary toast
  useEffect(() => {
    if (!favouriteToast) return;
    const timer = setTimeout(() => setFavouriteToast(null), 4000);
    return () => clearTimeout(timer);
  }, [favouriteToast]);

  const saved = food ? isFavourite(food.id) : false;
  const handleToggleFavourite = () => {
    if (!food) return;
    toggleFavourite(food);
    setFavouriteToast({ message: saved ? "Đã bỏ khỏi yêu thích" : "Đã thêm vào yêu thích" });
  };

  const parsedGrams = useMemo(() => parseGramsInput(gramsInput), [gramsInput]);

  const macros = useMemo(() => {
    if (!food) return { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };
    return calculateMacroPreview(food.nutrients, parsedGrams);
  }, [food, parsedGrams]);

  // The 22 counted nutrients for the portion, and those that give 20 % of the target or more
  const micros = useMemo(() => (food ? microRowsFor(food.nutrients, parsedGrams, dailyTargets) : null), [food, parsedGrams, dailyTargets]);
  const goodSources = useMemo(() => (food ? goodSourcesOf(food.nutrients, parsedGrams, dailyTargets) : []), [food, parsedGrams, dailyTargets]);

  const handleAdd = async () => {
    if (!food || parsedGrams <= 0 || isSubmitting || mealSlot === null) return;
    setIsSubmitting(true);
    try {
      await addFoodEntry(food, parsedGrams, mealSlot, selectedServingLabel === CUSTOM_PORTION ? `${gramsInput} g` : selectedServingLabel);
      router.push("/diary");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!food) {
    return (
      <AppShell>
        <AppHeader variant="sub" title="Không tìm thấy món" onBack={goBack} layout="wide" />
        <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pt-4 lg:mx-0 lg:px-8">
          <p className="m-0 text-[15px] text-secondary">Món này không còn trong danh sách.</p>
          <Link href="/explore" className="inline-flex min-h-[44px] items-center font-bold text-blue no-underline">
            Về Khám phá
          </Link>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell
      cta={
        <button
          type="button"
          onClick={handleAdd}
          disabled={isSubmitting || parsedGrams <= 0 || mealSlot === null}
          className="w-full min-h-[52px] rounded-full bg-blue text-on-accent font-bold text-base cursor-pointer hover:bg-blue/90 active:scale-[0.98] transition-all border-0 flex items-center justify-center shadow-md disabled:opacity-50"
        >
          Thêm vào {mealSlot ? mealNameVi : "—"}
        </button>
      }
    >
      <AppHeader
        variant="sub"
        title={food.nameVi}
        subtitle={
          <span className="inline-flex items-center flex-wrap gap-1">
            <span>{categoryLabel(categoryOf(food))}</span>
            <span>·</span>
            {food.brand && (
              <>
                <span>{food.brand}</span>
                <span>·</span>
              </>
            )}
            <Link
              href="/settings/data-sources"
              className="inline-flex items-center min-h-[44px] -my-2.5 px-1 -mx-1 text-inherit underline hover:text-blue transition-colors"
            >
              {foodSourceLabel(food.source)}
            </Link>
            <span>·</span>
            <span>{food.servings[0]?.grams ?? 100} g mỗi khẩu phần</span>
          </span>
        }
        onBack={goBack}
        actions={
          <button
            type="button"
            onClick={handleToggleFavourite}
            aria-pressed={saved}
            aria-label={saved ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
            className={`${HEADER_ICON_BUTTON} -mr-2`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={saved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 21s-7.5-4.6-9.5-9.1C1 8.6 3.1 5.5 6.3 5.5c2 0 3.4 1.1 4.2 2.4.8-1.3 2.2-2.4 4.2-2.4 3.2 0 5.3 3.1 3.8 6.4C19.5 16.4 12 21 12 21z" />
            </svg>
          </button>
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[560px] mx-auto p-4 flex flex-col gap-4">
        {/* Serving and Gram Selection */}
        <div data-align-group="food-detail" className="flex w-full flex-col gap-2">
          <span className="text-[13px] font-semibold text-secondary">Khẩu phần</span>
          <ChipGroup
            columns={Math.min(food.servings.length + 1, 4)}
            tone="light"
            items={[
              ...food.servings.map((s) => ({
                id: s.label,
                label: s.label === `${s.grams} g` ? s.label : `${s.label} · ${s.grams} g`,
                active: selectedServingLabel === s.label,
                onClick: () => {
                  setGramsInput(s.grams.toString());
                  setSelectedServingLabel(s.label);
                },
              })),
              {
                id: "custom",
                label: "Tuỳ chỉnh",
                active: selectedServingLabel === CUSTOM_PORTION,
                onClick: () => setSelectedServingLabel(CUSTOM_PORTION),
              },
            ]}
          />
          {selectedServingLabel === CUSTOM_PORTION && (
            <label className="flex h-11 w-full cursor-text items-center justify-end rounded-xl border border-card-border bg-card px-3 focus-within:ring-2 focus-within:ring-blue">
              <span className="sr-only">Khối lượng theo gam</span>
              <input
                id="fd-size"
                type="text"
                inputMode="decimal"
                aria-label="Khối lượng theo gam"
                value={gramsInput}
                onChange={(e) => setGramsInput(e.target.value)}
                className="h-full w-full border-0 bg-transparent text-right text-sm font-bold tabular-nums text-text outline-none"
              />
              <span className="ml-1 text-xs font-semibold text-secondary">g</span>
            </label>
          )}
        </div>

        {/* Big Kcal & 3-up Macro Card */}
        <div data-align-group="food-detail" className="w-full bg-card border border-card-border rounded-[18px] p-4">
          <StatGroup
            columns={4}
            tone="light"
            items={[
              { id: "cal", value: formatAmount(macros.calories, "kcal"), label: "kcal" },
              { id: "carb", value: `${formatAmount(macros.carbs, "g")} g`, label: "Tinh bột" },
              { id: "protein", value: `${formatAmount(macros.protein, "g")} g`, label: "Đạm" },
              { id: "fat", value: `${formatAmount(macros.fat, "g")} g`, label: "Béo" },
            ]}
          />
        </div>

        <GoodSources rows={goodSources} />
        {micros && <FoodMicros rows={micros.rows} unknown={micros.unknown} portionLabel={`${formatAmount(parsedGrams, "g")} g`} />}
      </main>

      {/* Favourite toast, just above the sticky CTA */}
      {favouriteToast && (
        <div className="fixed bottom-[168px] lg:bottom-24 inset-x-0 px-4 z-40 pointer-events-none">
          <Toast message={favouriteToast.message} />
        </div>
      )}
    </AppShell>
  );
}

const CUSTOM_PORTION = "__custom";

export default function FoodDetailPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-page" />}>
      <FoodDetailInner />
    </Suspense>
  );
}
