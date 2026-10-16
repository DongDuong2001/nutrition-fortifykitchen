"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDiary } from "@/lib/diary-store";
import { NO_ENERGY_MESSAGE, hasEnergy } from "@/lib/diary-edits";
import { MOCK_FOODS, type FoodItem } from "@/lib/mock/foods";
import { getMealSlotNameVi } from "@/lib/meal-slot";
import { useMealSlot } from "@/lib/use-meal-slot";
import { parseGramsInput, calculateMacroPreview, gramsServingLabel } from "@/lib/portion";
import { goodSourcesOf, microRowsFor } from "@/lib/food-detail";
import { categoryLabel, categoryOf } from "@/lib/food-categories";
import { formatAmount } from "@/lib/format";
import { foodSourceLabel } from "@/lib/food-meta";
import { isManualFood, isProxy } from "@/lib/food-source";
import { SourceSheet } from "@/components/foods/source-sheet";
import { FoodMicros, GoodSources } from "@/components/foods/food-micros";
import { ComparePicker } from "@/components/foods/compare-picker";
import { PillButton } from "@/components/ui/pill-button";
import { compareHref } from "@/lib/food-compare";
import { ChipGroup } from "@/components/ui/chip-group";
import { StatGroup } from "@/components/ui/stat-group";
import { Toast } from "@/components/ui/toast";
import { AppHeader, HEADER_ICON_BUTTON } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { useBack } from "@/hooks/use-back";
import { Card } from "@/components/ui/card";
import { ingredientPerServing, isRecipeId } from "@/lib/recipe";
import { getRecipe, syncRecipeFoods } from "@/lib/recipe-store";

function FoodDetailInner() {
  const params = useParams();
  const router = useRouter();
  // Back goes to where the food was opened from (Khám phá or the add sheet), else to Khám phá
  const goBack = useBack();
  const searchParams = useSearchParams();
  const { addFoodEntry, isFavourite, toggleFavourite, targets: dailyTargets } = useDiary();

  const foodId = params?.id as string;
  // A recipe lives in this account's storage: read after mount (the server and the first render agree on a skeleton)
  const isRecipe = isRecipeId(foodId);
  const [recipesReady, setRecipesReady] = useState(false);
  useEffect(() => {
    if (!isRecipeId(foodId)) return;
    syncRecipeFoods();
    setRecipesReady(true);
  }, [foodId]);
  const food = useMemo(() => {
    return MOCK_FOODS.find((f) => f.id === foodId);
    // recipesReady: the stored recipes are put into the catalogue by then
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodId, recipesReady]);
  const recipe = useMemo(() => (isRecipe && recipesReady ? getRecipe(foodId) : null), [isRecipe, recipesReady, foodId]);

  const mealSlot = useMealSlot(searchParams.get("meal"));
  const mealNameVi = mealSlot ? getMealSlotNameVi(mealSlot) : "—";

  const [gramsInput, setGramsInput] = useState(() => {
    return food?.servings[0]?.grams.toString() || "100";
  });
  const [selectedServingLabel, setSelectedServingLabel] = useState(() => {
    return food?.servings[0]?.label || "100 g";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
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
      const added = await addFoodEntry(food, parsedGrams, mealSlot, selectedServingLabel === CUSTOM_PORTION ? gramsServingLabel(parsedGrams) : selectedServingLabel);
      if (added) router.push("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRecipe && !recipesReady) {
    return (
      <AppShell>
        <h1 className="sr-only">Món của tôi</h1>
        <div role="status" aria-busy="true" className="mx-auto h-40 w-full max-w-[560px] rounded-2xl bg-level-empty motion-safe:animate-pulse lg:mx-0" />
      </AppShell>
    );
  }

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
          disabled={isSubmitting || parsedGrams <= 0 || mealSlot === null || !hasEnergy(food)}
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
          recipe ? (
            <span>
              Món của tôi · {recipe.servings} phần · {recipe.ingredients.length} nguyên liệu
            </span>
          ) : (
          <span className="inline-flex items-center flex-wrap gap-1">
            {/* The title above keeps two lines; a longer name is shown in full here */}
            {food.nameVi.length > 40 && <span className="basis-full break-words font-semibold">{food.nameVi}</span>}
            <span>{categoryLabel(categoryOf(food))}</span>
            <span>·</span>
            {food.brand && (
              <>
                <span>{food.brand}</span>
                <span>·</span>
              </>
            )}
            <button
              type="button"
              onClick={() => setSourceOpen(true)}
              aria-haspopup="dialog"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -my-2.5 px-2 -mx-2 cursor-pointer border-0 bg-transparent text-inherit underline hover:text-blue transition-colors"
            >
              {foodSourceLabel(food.source)}
            </button>
            {isProxy(food) && (
              <span className="inline-flex h-6 items-center rounded-full bg-warning-bg px-2 text-xs font-bold text-warning-text">Ước tính</span>
            )}
            {isManualFood(food) && (
              <span className="inline-flex h-6 items-center rounded-full border border-card-border bg-page px-2 text-xs font-bold text-secondary">Tự nhập</span>
            )}
            <span>·</span>
            <span>{food.servings[0]?.grams ?? 100} g mỗi khẩu phần</span>
          </span>
          )
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
        {!hasEnergy(food) && (
          <p role="alert" data-align-group="food-detail" className="m-0 rounded-xl bg-warning-bg px-3 py-2 text-[13px] leading-snug text-warning-text">
            {NO_ENERGY_MESSAGE}
          </p>
        )}
        {/* Serving and Gram Selection */}
        <div data-align-group="food-detail" className="flex w-full flex-col gap-2">
          <span className="text-[13px] font-semibold text-secondary">Khẩu phần</span>
          <ChipGroup
            columns={Math.min(food.servings.length + 1, 4)}
            tone="light"
            items={[
              ...food.servings.map((s) => ({
                id: s.label,
                label: s.display ?? (s.label === `${s.grams} g` ? s.label : `${s.label} · ${s.grams} g`),
                active: selectedServingLabel === s.label,
                onClick: () => {
                  setGramsInput(s.grams.toString());
                  setSelectedServingLabel(s.label);
                },
              })),
              {
                id: "custom",
                label: "Tùy chỉnh",
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
                className="h-full w-full border-0 bg-transparent text-right text-sm font-bold tabular-nums text-text outline-none focus-visible:outline-none"
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
              { id: "fat", value: `${formatAmount(macros.fat, "g")} g`, label: "Chất béo" },
            ]}
          />
        </div>

        {recipe && (
          <Card as="section" aria-label="Trong 1 phần" data-align-group="food-detail" className="flex flex-col gap-1 p-4">
            <div className="flex min-h-[44px] items-center justify-between gap-2">
              <h2 className="m-0 text-base font-bold text-text">Trong 1 phần</h2>
              <Link
                href={`/foods/new?recipe=${recipe.id}${searchParams.get("meal") ? `&meal=${searchParams.get("meal")}` : ""}`}
                className="inline-flex min-h-[44px] items-center px-2 text-sm font-bold text-blue no-underline"
              >
                Sửa
              </Link>
            </div>
            <ul className="m-0 flex list-none flex-col p-0">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={`${ingredient.foodId}-${index}`} className="flex items-baseline justify-between gap-3 border-t border-divider py-2">
                  <span className="min-w-0 break-words text-[15px] leading-snug text-text">{ingredient.name}</span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums text-text">
                    {formatAmount(ingredientPerServing(ingredient, recipe.servings), ingredient.unit)} {ingredient.unit}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <PillButton variant="secondary" onClick={() => setCompareOpen(true)} aria-haspopup="dialog" data-tour="food-compare">
          So sánh
        </PillButton>

        {food.recipe && (
          <PillButton
            variant="secondary"
            href={`/foods/new?from=${encodeURIComponent(food.id)}${searchParams.get("meal") ? `&meal=${searchParams.get("meal")}` : ""}`}
          >
            Tùy chỉnh thành món của tôi
          </PillButton>
        )}

        <GoodSources rows={goodSources} />
        {micros && <FoodMicros rows={micros.rows} unknown={micros.unknown} portionLabel={`${formatAmount(parsedGrams, "g")} g`} />}
      </main>

      <SourceSheet food={food} open={sourceOpen} onClose={() => setSourceOpen(false)} />

      <ComparePicker
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        lockedIds={[food.id]}
        onConfirm={(ids) => {
          setCompareOpen(false);
          router.push(compareHref(ids));
        }}
      />

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
