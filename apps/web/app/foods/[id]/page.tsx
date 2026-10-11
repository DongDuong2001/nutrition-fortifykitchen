"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDiary } from "@/lib/diary-store";
import { MOCK_FOODS, type FoodItem } from "@/lib/mock/foods";
import { getMealSlotNameVi } from "@/lib/meal-slot";
import { useMealSlot } from "@/lib/use-meal-slot";
import { parseGramsInput, calculateMacroPreview, scaleNutrients } from "@/lib/portion";
import { formatAmount } from "@/lib/format";
import { getNutrientDefinition } from "@/lib/nutrients";
import { calculateTargets } from "@/lib/targets";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import { ChipGroup } from "@/components/ui/chip-group";
import { StatGroup } from "@/components/ui/stat-group";
import { Toast } from "@/components/ui/toast";
import { AppHeader } from "@/components/ui/app-header";

function FoodDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addFoodEntry, isFavourite, toggleFavourite } = useDiary();

  const foodId = params?.id as string;
  const food = useMemo(() => {
    return MOCK_FOODS.find((f) => f.id === foodId) || MOCK_FOODS[0];
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
    setFavouriteToast({ message: saved ? "Đã bỏ khỏi Yêu thích" : "Đã lưu vào Yêu thích" });
  };

  const parsedGrams = useMemo(() => parseGramsInput(gramsInput), [gramsInput]);

  const macros = useMemo(() => {
    if (!food) return { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };
    return calculateMacroPreview(food.nutrients, parsedGrams);
  }, [food, parsedGrams]);

  // Daily targets for calculating % of today's target
  const dailyTargets = useMemo(() => {
    return calculateTargets({
      weightKg: 65,
      goal: "maintain",
      trainingMinutes: 60,
      sex: "male",
    });
  }, []);

  // Scaled nutrients list for "Vi chất trong X g"
  const microsList = useMemo(() => {
    if (!food) return [];
    const scaled = scaleNutrients(food.nutrients, parsedGrams);

    const items: {
      id: string;
      name: string;
      value: number;
      unit: string;
      pct: number | null;
    }[] = [];

    for (const [key, val] of Object.entries(scaled)) {
      if (val !== null && val > 0) {
        // Exclude general macros from micros table
        if (key === "energy" || key === "carbs" || key === "protein" || key === "fat" || key === "fiber" || key === "net_carbs") {
          continue;
        }

        const def = getNutrientDefinition(key);
        const name = def?.nameVi || key;
        const unit = def?.unit || "mg";
        const target = dailyTargets[key]?.min ?? (def?.id ? dailyTargets[def.id]?.min : undefined);
        const pct = target ? Math.round((val / target) * 100) : null;

        items.push({
          id: key,
          name,
          value: val,
          unit,
          pct,
        });
      }
    }

    return items;
  }, [food, parsedGrams, dailyTargets]);

  const handleAdd = async () => {
    if (!food || parsedGrams <= 0 || isSubmitting || mealSlot === null) return;
    setIsSubmitting(true);
    try {
      await addFoodEntry(food, parsedGrams, mealSlot, selectedServingLabel);
      router.push("/today");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!food) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-secondary">Không tìm thấy món.</p>
          <Link href="/add" className="text-blue font-bold">Quay lại tìm món</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-text font-sans flex flex-col">
      <AppHeader
        variant="sub"
        title={food.nameVi}
        subtitle={`${food.brand ? `${food.brand} · ` : ""}${food.source}`}
        backHref={`/add${mealSlot ? `?meal=${mealSlot}` : ""}`}
        alignGroup="food-header"
        actions={
          <button
            type="button"
            onClick={handleToggleFavourite}
            aria-pressed={saved}
            aria-label={saved ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
            className="w-11 h-11 -mr-2 rounded-lg bg-transparent border-0 text-white flex items-center justify-center cursor-pointer hover:text-sky active:scale-[0.97] transition-colors"
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
      <main className="flex-1 w-full max-w-[560px] mx-auto p-4 flex flex-col gap-3.5 pb-24">
        {/* Serving and Gram Selection */}
        <div data-align-group="food-detail" className="w-full">
          <ChipGroup
            columns={food.servings.length + 1}
            tone="light"
            leadingInput={
              <label className="flex items-center justify-center bg-white border-2 border-blue rounded-xl px-2 h-11 w-full cursor-text box-border">
                <span className="sr-only">Khối lượng</span>
                <input
                  id="fd-size"
                  type="text"
                  inputMode="decimal"
                  aria-label="Khối lượng theo gam"
                  value={gramsInput}
                  onChange={(e) => {
                    setGramsInput(e.target.value);
                    setSelectedServingLabel(`${e.target.value} g`);
                  }}
                  className="w-full border-0 outline-none bg-transparent font-bold text-sm tabular-nums text-text text-right"
                />
                <span className="text-secondary text-xs ml-1 font-semibold">g</span>
              </label>
            }
            items={food.servings.map((s) => ({
              id: s.label,
              label: s.label,
              active: selectedServingLabel === s.label,
              onClick: () => {
                setGramsInput(s.grams.toString());
                setSelectedServingLabel(s.label);
              },
            }))}
          />
        </div>

        {/* Big Kcal & 3-up Macro Card */}
        <div data-align-group="food-detail" className="w-full bg-card border border-card-border rounded-2xl p-4">
          <StatGroup
            columns={4}
            tone="light"
            items={[
              { id: "cal", value: formatAmount(macros.calories, "kcal"), label: "kcal" },
              { id: "carb", value: `${formatAmount(macros.carbs, "g")} g`, label: "Carb" },
              { id: "protein", value: `${formatAmount(macros.protein, "g")} g`, label: "Đạm" },
              { id: "fat", value: `${formatAmount(macros.fat, "g")} g`, label: "Béo" },
            ]}
          />
        </div>

        {/* Micros in Serving Card with slanted SegmentedBar */}
        <div data-align-group="food-detail" className="w-full bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-2">
          <h2 className="m-0 text-base font-bold text-text">
            Vi chất trong {gramsInput} g
          </h2>

          <div className="divide-y divide-divider flex flex-col">
            {microsList.map((m) => (
              <div key={m.id} className="py-2.5 flex flex-col gap-1 min-h-[44px] justify-center">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-text">{m.name}</span>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-bold text-text">
                      {formatAmount(m.value, m.unit)} {m.unit}
                    </span>
                    {m.pct !== null && (
                      <span className="text-xs text-secondary font-semibold min-w-[36px] text-right">
                        {m.pct}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact slanted bar for visual context */}
                {m.pct !== null && (
                  <SegmentedBar
                    aria-label={`Tiến độ ${m.name}`}
                    percentage={m.pct}
                    tone="light"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tip Box */}
        {food.tipVi && (
          <div className="bg-card border border-card-border border-l-4 border-l-blue rounded-xl p-3.5 text-sm leading-relaxed">
            <strong className="text-blue font-bold">Mẹo: </strong>
            {food.tipVi}
          </div>
        )}
      </main>

      {/* Favourite toast, just above the sticky CTA */}
      {favouriteToast && (
        <div className="fixed bottom-24 inset-x-0 px-4 z-40 pointer-events-none">
          <Toast message={favouriteToast.message} />
        </div>
      )}

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-page/95 backdrop-blur-sm border-t border-card-border p-3 z-30">
        <div className="w-full max-w-[560px] mx-auto">
          <button
            type="button"
            onClick={handleAdd}
            disabled={isSubmitting || parsedGrams <= 0 || mealSlot === null}
            className="w-full min-h-[52px] rounded-full bg-blue text-white font-bold text-base cursor-pointer hover:bg-blue/90 active:scale-[0.98] transition-all border-0 flex items-center justify-center shadow-md disabled:opacity-50"
          >
            Thêm vào {mealSlot ? mealNameVi : "—"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FoodDetailPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-page" />}>
      <FoodDetailInner />
    </Suspense>
  );
}
