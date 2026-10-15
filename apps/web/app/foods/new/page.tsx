"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useDiary } from "@/lib/diary-store";
import { getMealSlotNameVi } from "@/lib/meal-slot";
import { useMealSlot } from "@/lib/use-meal-slot";
import { formatAmount } from "@/lib/format";
import { FormRow } from "@/components/ui/form-row";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { ChipGroup } from "@/components/ui/chip-group";
import { RecipeBuilder, useRecipeDraft } from "@/components/foods/recipe-builder";
import { draftToRecipe, recipeToDraft, RECIPE_ID_PREFIX } from "@/lib/recipe";
import { getRecipe, saveRecipe } from "@/lib/recipe-store";
import { useBack } from "@/hooks/use-back";

function CreateFoodInner() {
  const router = useRouter();
  const goBack = useBack();
  const searchParams = useSearchParams();
  const { addFoodEntry } = useDiary();

  const mealSlot = useMealSlot(searchParams.get("meal"));
  const mealNameVi = mealSlot ? getMealSlotNameVi(mealSlot) : "—";

  // Nhập dinh dưỡng (from a label) or Từ nguyên liệu (a recipe). ?recipe=<id> edits a saved recipe.
  const editId = searchParams.get("recipe");
  const [mode, setMode] = useState<"nutrition" | "recipe">(editId ? "recipe" : searchParams.get("mode") === "recipe" ? "recipe" : "nutrition");
  const recipeState = useRecipeDraft();
  const [recipeMissing, setRecipeMissing] = useState(false);
  const { setDraft: setRecipeDraft } = recipeState;
  useEffect(() => {
    if (!editId) return;
    const stored = getRecipe(editId);
    if (stored) setRecipeDraft(recipeToDraft(stored));
    else setRecipeMissing(true);
  }, [editId, setRecipeDraft]);

  const saveRecipeDraft = () => {
    if (!recipeState.validateAll()) return;
    const id = editId ?? `${RECIPE_ID_PREFIX}${Date.now()}`;
    const existing = editId ? getRecipe(editId) : null;
    saveRecipe(draftToRecipe(recipeState.draft, id, existing?.createdAt ?? new Date().toISOString()));
    const meal = searchParams.get("meal");
    router.push(`/foods/${id}${meal ? `?meal=${meal}` : ""}`);
  };

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
      if (!val.trim()) err = "Nhập tên món ăn";
    } else if (field === "servingSize") {
      const num = parseFloat(val.replace(",", "."));
      if (isNaN(num) || num <= 0) err = "Khẩu phần phải lớn hơn 0.";
    } else if (field === "calories") {
      if (val.trim() !== "") {
        const num = parseFloat(val.replace(",", "."));
        if (isNaN(num) || num < 0) err = "Nhập số năng lượng từ 0 trở lên";
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
    if (mode === "recipe") {
      saveRecipeDraft();
      return;
    }
    if (mealSlot === null || isSubmitting) return;

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
      const parseMacro = (val: string): number | null => {
        const trimmed = val.trim();
        if (trimmed === "") return null;
        const num = parseFloat(trimmed.replace(",", "."));
        return isNaN(num) ? null : Math.max(0, num);
      };
      const parsedPro = parseMacro(protein);
      const parsedCarbs = parseMacro(carbs);
      const parsedFat = parseMacro(fat);

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
      await addFoodEntry(createdFood, parsedSize, mealSlot, `${formatAmount(parsedSize, servingUnit)} ${servingUnit}`);
      router.push("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      cta={
        <button
          type="button"
          onClick={handleSubmit}
          disabled={mode === "recipe" ? recipeMissing : isSubmitting || mealSlot === null}
          className="w-full min-h-[52px] rounded-full bg-blue text-on-accent font-bold text-base cursor-pointer hover:bg-blue/90 active:scale-[0.98] transition-all border-0 flex items-center justify-center shadow-md disabled:opacity-50"
        >
          {mode === "recipe" ? "Lưu món" : `Lưu và thêm vào ${mealNameVi}`}
        </button>
      }
    >
      <AppHeader
        variant="sub"
        title={editId ? "Sửa món" : "Tạo món mới"}
        onBack={goBack}
      />

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 w-full max-w-[560px] mx-auto p-4 flex flex-col gap-4">
        {!editId && (
          <ChipGroup
            columns={2}
            tone="light"
            data-align-group="create-mode"
            items={[
              { id: "nutrition", label: "Nhập dinh dưỡng", active: mode === "nutrition", onClick: () => setMode("nutrition") },
              { id: "recipe", label: "Từ nguyên liệu", active: mode === "recipe", onClick: () => setMode("recipe") },
            ]}
          />
        )}
        {mode === "recipe" ? (
          recipeMissing ? (
            <p className="m-0 text-[15px] text-secondary">Món này không còn trong danh sách.</p>
          ) : (
            <RecipeBuilder state={recipeState} excludeId={editId ?? undefined} />
          )
        ) : (
        <>
        {/* Name Field */}
        <FormRow
          label="Tên món"
          htmlFor="cf-name"
          required
          error={touched.nameVi ? errors.nameVi : undefined}
        >
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
            className={`h-12 px-4 rounded-xl border-2 bg-card text-base text-text outline-none transition-colors ${
              touched.nameVi && errors.nameVi ? "border-destructive" : "border-card-border focus:border-blue"
            }`}
          />
        </FormRow>

        {/* Serving Size & Unit */}
        <FormRow
          label="Khẩu phần"
          htmlFor="cf-size"
          error={touched.servingSize ? errors.servingSize : undefined}
        >
          <div className="flex items-center gap-3">
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
              className={`h-12 px-4 rounded-xl border-2 bg-card text-base font-bold tabular-nums text-text outline-none text-right transition-colors w-32 shrink-0 ${
                touched.servingSize && errors.servingSize ? "border-destructive" : "border-card-border focus:border-blue"
              }`}
            />
            {/* Unit radio group */}
            <div role="radiogroup" aria-label="Đơn vị khẩu phần" className="flex gap-2">
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
                      isChecked ? "bg-ink text-on-dark" : "bg-card text-text border border-card-border hover:bg-page"
                    }`}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          </div>
        </FormRow>

        {/* Nutrition Info Card */}
        <div className="bg-card border border-card-border rounded-[18px] p-4 flex flex-col gap-3">
          <div>
            <h2 className="m-0 text-base font-bold text-text">Dinh dưỡng mỗi khẩu phần</h2>
            <p className="m-0 text-xs text-secondary mt-1 leading-relaxed">
              Lấy số trên nhãn dinh dưỡng của gói. Bỏ trống = chưa có dữ liệu, không phải 0.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <FormRow label="Năng lượng (kcal)" htmlFor="cf-kcal">
              <input
                id="cf-kcal"
                type="text"
                inputMode="decimal"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="0"
                className="h-12 px-3 rounded-xl border-2 border-card-border focus:border-blue bg-card text-base font-bold tabular-nums text-text outline-none text-right"
              />
            </FormRow>

            <FormRow label="Đạm (g)" htmlFor="cf-pro">
              <input
                id="cf-pro"
                type="text"
                inputMode="decimal"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
                className="h-12 px-3 rounded-xl border-2 border-card-border focus:border-blue bg-card text-base font-bold tabular-nums text-text outline-none text-right"
              />
            </FormRow>

            <FormRow label="Tinh bột (g)" htmlFor="cf-carbs">
              <input
                id="cf-carbs"
                type="text"
                inputMode="decimal"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
                className="h-12 px-3 rounded-xl border-2 border-card-border focus:border-blue bg-card text-base font-bold tabular-nums text-text outline-none text-right"
              />
            </FormRow>

            <FormRow label="Chất béo (g)" htmlFor="cf-fat">
              <input
                id="cf-fat"
                type="text"
                inputMode="decimal"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
                className="h-12 px-3 rounded-xl border-2 border-card-border focus:border-blue bg-card text-base font-bold tabular-nums text-text outline-none text-right"
              />
            </FormRow>
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
            <span>+ Thêm vi chất (Natri, Canxi, Sắt…)</span>
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
            <div className="bg-card border border-card-border rounded-[18px] p-4 grid grid-cols-2 gap-3 animate-in fade-in duration-200">
              <FormRow label="Natri (mg)" htmlFor="cf-na">
                <input
                  id="cf-na"
                  type="text"
                  inputMode="decimal"
                  value={sodium}
                  onChange={(e) => setSodium(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-blue bg-card text-sm font-semibold tabular-nums text-text outline-none text-right"
                />
              </FormRow>

              <FormRow label="Kali (mg)" htmlFor="cf-k">
                <input
                  id="cf-k"
                  type="text"
                  inputMode="decimal"
                  value={potassium}
                  onChange={(e) => setPotassium(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-blue bg-card text-sm font-semibold tabular-nums text-text outline-none text-right"
                />
              </FormRow>

              <FormRow label="Canxi (mg)" htmlFor="cf-ca">
                <input
                  id="cf-ca"
                  type="text"
                  inputMode="decimal"
                  value={calcium}
                  onChange={(e) => setCalcium(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-blue bg-card text-sm font-semibold tabular-nums text-text outline-none text-right"
                />
              </FormRow>

              <FormRow label="Sắt (mg)" htmlFor="cf-fe">
                <input
                  id="cf-fe"
                  type="text"
                  inputMode="decimal"
                  value={iron}
                  onChange={(e) => setIron(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-blue bg-card text-sm font-semibold tabular-nums text-text outline-none text-right"
                />
              </FormRow>

              <div className="col-span-2">
                <FormRow label="Vitamin D (µg)" htmlFor="cf-vitd">
                  <input
                    id="cf-vitd"
                    type="text"
                    inputMode="decimal"
                    value={vitaminD}
                    onChange={(e) => setVitaminD(e.target.value)}
                    placeholder="—"
                    className="h-11 px-3 rounded-xl border border-card-border focus:border-blue bg-card text-sm font-semibold tabular-nums text-text outline-none text-right"
                  />
                </FormRow>
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </form>
    </AppShell>
  );
}

export default function CreateFoodPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-page" />}>
      <CreateFoodInner />
    </Suspense>
  );
}
