"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDiary } from "@/lib/diary-store";
import { MOCK_FOODS, type FoodItem } from "@/lib/mock/foods";
import { parseMealSlot, getMealSlotNameVi, type MealSlot } from "@/lib/meal-slot";
import { parseGramsInput, calculateMacroPreview, scaleNutrients } from "@/lib/portion";
import { formatNumber } from "@/lib/format";
import { NUTRIENT_CATALOG } from "@/lib/nutrients";
import { calculateTargets } from "@/lib/targets";
import { SegmentedBar } from "@/components/ui/segmented-bar";

function FoodDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addFoodEntry } = useDiary();

  const foodId = params?.id as string;
  const food = useMemo(() => {
    return MOCK_FOODS.find((f) => f.id === foodId) || MOCK_FOODS[0];
  }, [foodId]);

  const mealSlot: MealSlot = parseMealSlot(searchParams.get("meal"));
  const mealNameVi = getMealSlotNameVi(mealSlot);

  const [gramsInput, setGramsInput] = useState(() => {
    return food?.servings[0]?.grams.toString() || "100";
  });
  const [selectedServingLabel, setSelectedServingLabel] = useState(() => {
    return food?.servings[0]?.label || "100 g";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (food?.servings[0]) {
      setGramsInput(food.servings[0].grams.toString());
      setSelectedServingLabel(food.servings[0].label);
    }
  }, [food]);

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

    const catalogMap = new Map(NUTRIENT_CATALOG.map((c) => [c.id, c]));
    const targetMap: Record<string, number> = {
      potassium: dailyTargets.potassium.min,
      calcium: dailyTargets.calcium.min,
      magnesium: dailyTargets.magnesium.min,
      iron: dailyTargets.iron.min,
      zinc: dailyTargets.zinc.min,
      sodium: dailyTargets.sodium.min,
      copper: 0.9,
      manganese: 2.3,
      vitamin_d: 15,
      vitamin_a: 650,
      vitamin_c: 100,
      vitamin_e: 6.5,
      vitamin_k: 150,
      thiamin: 1.2,
      riboflavin: 1.3,
      niacin: 16,
      pyridoxine: 1.3,
      folate: 400,
      cobalamin: 2.4,
    };

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
        if (key === "energy" || key === "carbs" || key === "protein" || key === "fat" || key === "fiber") {
          continue;
        }

        const def = catalogMap.get(key);
        const name = def?.nameVi || key;
        const unit = def?.unit || "mg";
        const target = targetMap[key];
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
    if (!food || parsedGrams <= 0 || isSubmitting) return;
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
      {/* Header Banner (Dark Ink) */}
      <header className="bg-ink text-white rounded-b-[20px] px-5 pt-3 pb-5 flex flex-col gap-2 shrink-0">
        <div className="w-full max-w-[560px] mx-auto flex flex-col gap-2">
          <Link
            href={`/add?meal=${mealSlot}`}
            aria-label="Quay lại"
            className="w-11 h-11 -ml-3 rounded-lg text-white flex items-center justify-center hover:text-sky active:scale-[0.97] transition-all no-underline"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>

          <div>
            <h1 className="m-0 font-display italic font-extrabold text-[28px] leading-tight uppercase tracking-tight">
              {food.nameVi}
            </h1>
            <p className="m-0 text-xs text-muted-subtitle mt-0.5">
              {food.brand ? `${food.brand} · ` : ""}
              {food.source}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[560px] mx-auto p-4 flex flex-col gap-3.5 pb-24">
        {/* Serving and Gram Selection */}
        <div className="flex items-end gap-2 flex-wrap">
          <label htmlFor="fd-size" className="flex flex-col gap-1.5 text-xs font-bold text-text w-28 shrink-0">
            Khối lượng
            <div className="flex items-center h-12 rounded-xl border-2 border-blue bg-white px-3 box-border">
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
                className="w-full border-0 outline-none bg-transparent font-bold text-lg tabular-nums text-text text-right"
              />
              <span className="text-secondary text-xs ml-1 font-medium">g</span>
            </div>
          </label>

          <div className="flex gap-2 flex-wrap">
            {food.servings.map((s) => {
              const isMatch = selectedServingLabel === s.label;
              return (
                <button
                  key={s.label}
                  type="button"
                  aria-pressed={isMatch}
                  onClick={() => {
                    setGramsInput(s.grams.toString());
                    setSelectedServingLabel(s.label);
                  }}
                  className={`h-12 px-4 rounded-xl text-xs font-bold border-0 cursor-pointer active:scale-[0.97] transition-colors ${
                    isMatch ? "bg-ink text-white" : "bg-card text-text border border-card-border hover:bg-page"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Kcal & 3-up Macro Card */}
        <div className="bg-card border border-card-border rounded-2xl p-4 grid grid-cols-4 gap-2">
          <div className="flex flex-col">
            <div className="font-display italic font-black text-2xl tabular-nums text-text">
              {formatNumber(macros.calories)}
            </div>
            <div className="text-xs text-secondary font-medium">kcal</div>
          </div>
          <div className="flex flex-col">
            <div className="font-display italic font-black text-2xl tabular-nums text-text">
              {formatNumber(macros.carbs)} g
            </div>
            <div className="text-xs text-secondary font-medium">Carb</div>
          </div>
          <div className="flex flex-col">
            <div className="font-display italic font-black text-2xl tabular-nums text-text">
              {formatNumber(macros.protein)} g
            </div>
            <div className="text-xs text-secondary font-medium">Đạm</div>
          </div>
          <div className="flex flex-col">
            <div className="font-display italic font-black text-2xl tabular-nums text-text">
              {formatNumber(macros.fat)} g
            </div>
            <div className="text-xs text-secondary font-medium">Béo</div>
          </div>
        </div>

        {/* Micros in Serving Card with slanted SegmentedBar */}
        <div className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-2">
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
                      {formatNumber(m.value)} {m.unit}
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

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-page/95 backdrop-blur-sm border-t border-card-border p-3 z-30">
        <div className="w-full max-w-[560px] mx-auto">
          <button
            type="button"
            onClick={handleAdd}
            disabled={isSubmitting || parsedGrams <= 0}
            className="w-full min-h-[52px] rounded-full bg-blue text-white font-bold text-base cursor-pointer hover:bg-blue/90 active:scale-[0.98] transition-all border-0 flex items-center justify-center shadow-md disabled:opacity-50"
          >
            Thêm vào {mealNameVi}
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
