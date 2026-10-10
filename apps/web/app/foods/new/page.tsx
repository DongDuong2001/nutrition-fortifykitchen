"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useDiary } from "@/lib/diary-store";
import { parseMealSlot, getMealSlotNameVi, type MealSlot } from "@/lib/meal-slot";

function CreateFoodInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addFoodEntry } = useDiary();

  const mealSlot: MealSlot = parseMealSlot(searchParams.get("meal"));
  const mealNameVi = getMealSlotNameVi(mealSlot);

  // Form Fields
  const [nameVi, setNameVi] = useState("");
  const [servingSize, setServingSize] = useState("100");
  const [servingUnit, setServingUnit] = useState<"g" | "ml" | "cái">("g");

  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  // Optional Micros (Natri, Canxi, Sắt, Kali, Vitamin D)
  const [showMicros, setShowMicros] = useState(false);
  const [sodium, setSodium] = useState("");
  const [calcium, setCalcium] = useState("");
  const [iron, setIron] = useState("");
  const [potassium, setPotassium] = useState("");
  const [vitaminD, setVitaminD] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (field: string, val: string) => {
    let err = "";
    if (field === "nameVi") {
      if (!val.trim()) err = "Vui lòng nhập tên món ăn.";
    } else if (field === "servingSize") {
      const num = parseFloat(val.replace(",", "."));
      if (isNaN(num) || num <= 0) err = "Khẩu phần phải lớn hơn 0.";
    } else if (field === "calories") {
      if (val.trim() !== "") {
        const num = parseFloat(val.replace(",", "."));
        if (isNaN(num) || num < 0) err = "Năng lượng không hợp lệ.";
      }
    }
    setErrors((prev) => ({ ...prev, [field]: err }));
    return err;
  };

  const handleBlur = (field: string, val: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errName = validateField("nameVi", nameVi);
    const errSize = validateField("servingSize", servingSize);

    setTouched({
      nameVi: true,
      servingSize: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
    });

    if (errName || errSize) {
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedSize = parseFloat(servingSize.replace(",", ".")) || 100;
      const parsedCals = parseFloat(calories.replace(",", ".")) || 0;
      const parsedPro = parseFloat(protein.replace(",", ".")) || 0;
      const parsedCarbs = parseFloat(carbs.replace(",", ".")) || 0;
      const parsedFat = parseFloat(fat.replace(",", ".")) || 0;

      const createdFood = await apiClient.createFood({
        nameVi: nameVi.trim(),
        servingUnit,
        servingSize: parsedSize,
        calories: parsedCals,
        protein: parsedPro,
        carbs: parsedCarbs,
        fat: parsedFat,
        micros: {
          sodium: sodium ? parseFloat(sodium.replace(",", ".")) : undefined,
          calcium: calcium ? parseFloat(calcium.replace(",", ".")) : undefined,
          iron: iron ? parseFloat(iron.replace(",", ".")) : undefined,
          potassium: potassium ? parseFloat(potassium.replace(",", ".")) : undefined,
          vitamin_d: vitaminD ? parseFloat(vitaminD.replace(",", ".")) : undefined,
        },
      });

      // Add to diary and redirect
      await addFoodEntry(createdFood, parsedSize, mealSlot, `${parsedSize} ${servingUnit}`);
      router.push("/today");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-text font-sans flex flex-col">
      {/* Header (Dark Ink) */}
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
              TẠO MÓN MỚI
            </h1>
          </div>
        </div>
      </header>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 w-full max-w-[560px] mx-auto p-4 flex flex-col gap-4 pb-28">
        {/* Name Field */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cf-name" className="text-sm font-bold text-text">
            Tên món <span className="text-destructive">*</span>
          </label>
          <input
            id="cf-name"
            type="text"
            value={nameVi}
            onChange={(e) => {
              setNameVi(e.target.value);
              if (touched.nameVi) validateField("nameVi", e.target.value);
            }}
            onBlur={() => handleBlur("nameVi", nameVi)}
            placeholder="Ví dụ: Bánh tráng trộn"
            className={`h-12 px-3.5 rounded-xl border-2 bg-white text-base text-text outline-none transition-colors ${
              touched.nameVi && errors.nameVi ? "border-destructive" : "border-card-border focus:border-blue"
            }`}
          />
          {touched.nameVi && errors.nameVi && (
            <span role="alert" className="text-xs text-destructive font-semibold">
              {errors.nameVi}
            </span>
          )}
        </div>

        {/* Serving Size & Unit */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5 w-32 shrink-0">
            <label htmlFor="cf-size" className="text-sm font-bold text-text">
              Khẩu phần
            </label>
            <input
              id="cf-size"
              type="text"
              inputMode="decimal"
              value={servingSize}
              onChange={(e) => {
                setServingSize(e.target.value);
                if (touched.servingSize) validateField("servingSize", e.target.value);
              }}
              onBlur={() => handleBlur("servingSize", servingSize)}
              className={`h-12 px-3.5 rounded-xl border-2 bg-white text-base font-bold tabular-nums text-text outline-none text-right transition-colors ${
                touched.servingSize && errors.servingSize ? "border-destructive" : "border-card-border focus:border-blue"
              }`}
            />
          </div>

          {/* Unit radio group */}
          <div role="radiogroup" aria-label="Đơn vị khẩu phần" className="flex gap-2 pb-0.5">
            {(["g", "ml", "cái"] as const).map((u) => {
              const isChecked = servingUnit === u;
              return (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={isChecked}
                  onClick={() => setServingUnit(u)}
                  className={`min-h-[44px] min-w-[52px] px-4 rounded-full text-sm font-semibold border-0 cursor-pointer active:scale-[0.97] transition-colors ${
                    isChecked ? "bg-ink text-white" : "bg-card text-text border border-card-border hover:bg-page"
                  }`}
                >
                  {u}
                </button>
              );
            })}
          </div>
        </div>
        {touched.servingSize && errors.servingSize && (
          <span role="alert" className="text-xs text-destructive font-semibold -mt-2">
            {errors.servingSize}
          </span>
        )}

        {/* Nutrition Info Card */}
        <div className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3">
          <div>
            <h2 className="m-0 text-base font-bold text-text">Dinh dưỡng mỗi khẩu phần</h2>
            <p className="m-0 text-xs text-secondary mt-1 leading-relaxed">
              Lấy số trên nhãn dinh dưỡng của gói. Bỏ trống = chưa biết, không phải 0.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col gap-1">
              <label htmlFor="cf-kcal" className="text-xs font-bold text-secondary">
                Năng lượng (kcal)
              </label>
              <input
                id="cf-kcal"
                type="text"
                inputMode="decimal"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="0"
                className="h-12 px-3 rounded-xl border-2 border-card-border focus:border-blue bg-white text-base font-bold tabular-nums text-text outline-none text-right"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="cf-pro" className="text-xs font-bold text-secondary">
                Đạm (g)
              </label>
              <input
                id="cf-pro"
                type="text"
                inputMode="decimal"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
                className="h-12 px-3 rounded-xl border-2 border-card-border focus:border-blue bg-white text-base font-bold tabular-nums text-text outline-none text-right"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="cf-carb" className="text-xs font-bold text-secondary">
                Tinh bột (g)
              </label>
              <input
                id="cf-carb"
                type="text"
                inputMode="decimal"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
                className="h-12 px-3 rounded-xl border-2 border-card-border focus:border-blue bg-white text-base font-bold tabular-nums text-text outline-none text-right"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="cf-fat" className="text-xs font-bold text-secondary">
                Béo (g)
              </label>
              <input
                id="cf-fat"
                type="text"
                inputMode="decimal"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
                className="h-12 px-3 rounded-xl border-2 border-card-border focus:border-blue bg-white text-base font-bold tabular-nums text-text outline-none text-right"
              />
            </div>
          </div>
        </div>

        {/* Expandable Micros */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={showMicros}
            onClick={() => setShowMicros(!showMicros)}
            className="w-full min-h-[48px] px-4 rounded-xl border border-card-border bg-card text-text flex items-center justify-between font-semibold text-sm cursor-pointer hover:bg-page transition-colors"
          >
            <span>+ Thêm vi chất (Natri, Canxi, Sắt, Kali, Vitamin D…)</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-secondary transform transition-transform duration-200 ${showMicros ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {showMicros && (
            <div className="bg-card border border-card-border rounded-2xl p-4 grid grid-cols-2 gap-3 animate-in fade-in duration-200">
              <div className="flex flex-col gap-1">
                <label htmlFor="cf-na" className="text-xs font-bold text-secondary">
                  Natri (mg)
                </label>
                <input
                  id="cf-na"
                  type="text"
                  inputMode="decimal"
                  value={sodium}
                  onChange={(e) => setSodium(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-blue bg-white text-sm font-semibold tabular-nums text-text outline-none text-right"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="cf-k" className="text-xs font-bold text-secondary">
                  Kali (mg)
                </label>
                <input
                  id="cf-k"
                  type="text"
                  inputMode="decimal"
                  value={potassium}
                  onChange={(e) => setPotassium(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-blue bg-white text-sm font-semibold tabular-nums text-text outline-none text-right"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="cf-ca" className="text-xs font-bold text-secondary">
                  Canxi (mg)
                </label>
                <input
                  id="cf-ca"
                  type="text"
                  inputMode="decimal"
                  value={calcium}
                  onChange={(e) => setCalcium(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-blue bg-white text-sm font-semibold tabular-nums text-text outline-none text-right"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="cf-fe" className="text-xs font-bold text-secondary">
                  Sắt (mg)
                </label>
                <input
                  id="cf-fe"
                  type="text"
                  inputMode="decimal"
                  value={iron}
                  onChange={(e) => setIron(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-blue bg-white text-sm font-semibold tabular-nums text-text outline-none text-right"
                />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label htmlFor="cf-vitd" className="text-xs font-bold text-secondary">
                  Vitamin D (µg)
                </label>
                <input
                  id="cf-vitd"
                  type="text"
                  inputMode="decimal"
                  value={vitaminD}
                  onChange={(e) => setVitaminD(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-blue bg-white text-sm font-semibold tabular-nums text-text outline-none text-right"
                />
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-page/95 backdrop-blur-sm border-t border-card-border p-3 z-30">
        <div className="w-full max-w-[560px] mx-auto">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full min-h-[52px] rounded-full bg-blue text-white font-bold text-base cursor-pointer hover:bg-blue/90 active:scale-[0.98] transition-all border-0 flex items-center justify-center shadow-md disabled:opacity-50"
          >
            Lưu và thêm vào {mealNameVi}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreateFoodPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-page" />}>
      <CreateFoodInner />
    </Suspense>
  );
}
