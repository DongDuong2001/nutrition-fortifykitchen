"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useDiary } from "@/lib/diary-store";
import { getMealSlotNameVi } from "@/lib/meal-slot";
import { useMealSlot } from "@/lib/use-meal-slot";
import { formatAmount } from "@/lib/format";
import { parseNumberInput } from "@/lib/parse-number";
import { nutrientName } from "@/lib/nutrients";
import { FormRow } from "@/components/ui/form-row";
import { Expand } from "@/components/ui/expand";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { ChipGroup } from "@/components/ui/chip-group";
import { RecipeBuilder, useRecipeDraft } from "@/components/foods/recipe-builder";
import { draftToRecipe, recipeDraftFromFood, recipeToDraft, RECIPE_ID_PREFIX } from "@/lib/recipe";
import { getRecipe, saveRecipe } from "@/lib/recipe-store";
import { useBack } from "@/hooks/use-back";
import { markUsed } from "@/lib/onboarding-store";
import { HOME_ROUTE } from "@/lib/nav";

function CreateFoodInner() {
  const router = useRouter();
  const goBack = useBack();
  const searchParams = useSearchParams();
  const { addFoodEntry } = useDiary();

  const mealSlot = useMealSlot(searchParams.get("meal"));
  const mealNameVi = mealSlot ? getMealSlotNameVi(mealSlot) : "—";

  // Tính từ nguyên liệu (a recipe, the default) or Tự nhập (typed from a label). ?recipe=<id> edits a saved recipe;
  // ?from=<food id> starts a recipe from a catalogue dish that has one (Tùy chỉnh thành món của tôi).
  const editId = searchParams.get("recipe");
  const fromId = searchParams.get("from");
  const requestedMode = searchParams.get("mode");
  const [mode, setMode] = useState<"nutrition" | "recipe">(
    editId || fromId ? "recipe" : requestedMode === "nutrition" || requestedMode === "manual" ? "nutrition" : "recipe"
  );
  const recipeState = useRecipeDraft();
  const [recipeMissing, setRecipeMissing] = useState(false);
  const { setDraft: setRecipeDraft } = recipeState;
  useEffect(() => {
    if (!editId) return;
    const stored = getRecipe(editId);
    if (stored) setRecipeDraft(recipeToDraft(stored));
    else setRecipeMissing(true);
  }, [editId, setRecipeDraft]);
  useEffect(() => {
    if (!fromId || editId) return;
    let cancelled = false;
    apiClient.getFood(fromId).then((food) => {
      const draft = food ? recipeDraftFromFood(food) : null;
      if (cancelled) return;
      if (draft) setRecipeDraft(draft);
      else setRecipeMissing(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fromId, editId, setRecipeDraft]);

  // A ref, not state: two taps in the same frame must save once (a second id would make a second recipe)
  const recipeSaving = useRef(false);
  const [recipeSaveError, setRecipeSaveError] = useState<string | null>(null);
  const saveRecipeDraft = () => {
    if (recipeSaving.current || !recipeState.validateAll()) return;
    recipeSaving.current = true;
    setRecipeSaveError(null);
    const id = editId ?? `${RECIPE_ID_PREFIX}${Date.now()}`;
    const existing = editId ? getRecipe(editId) : null;
    if (!saveRecipe(draftToRecipe(recipeState.draft, id, existing?.createdAt ?? new Date().toISOString()))) {
      recipeSaving.current = false;
      setRecipeSaveError("Không lưu được món vào máy này. Bộ nhớ đầy hoặc đang bị chặn. Thử lại sau khi giải phóng dung lượng.");
      return;
    }
    markUsed("create-food");
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

  // Optional micros (sodium, potassium, calcium, iron, vitamin D)
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
      const num = parseNumberInput(val);
      if (num === null || num <= 0) err = "Khẩu phần phải lớn hơn 0.";
    } else if (field === "calories") {
      // Blank is unknown, and an unknown energy is never logged as 0 kcal
      const num = parseNumberInput(val);
      if (val.trim() === "") err = "Nhập năng lượng (kcal) để ghi vào nhật ký";
      else if (num === null) err = "Nhập số năng lượng từ 0 trở lên";
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
    const errCals = validateField("calories", calories);

    setTouched({
      nameVi: true,
      servingSize: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
    });

    if (errName || errSize || errCals) {
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedSize = parseNumberInput(servingSize) || 100;
      const parsedCals = parseNumberInput(calories) ?? 0;
      const parseMacro = (val: string): number | null => parseNumberInput(val);
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
          sodium: parseNumberInput(sodium) ?? undefined,
          calcium: parseNumberInput(calcium) ?? undefined,
          iron: parseNumberInput(iron) ?? undefined,
          potassium: parseNumberInput(potassium) ?? undefined,
          vitamin_d: parseNumberInput(vitaminD) ?? undefined,
        },
      });

      markUsed("create-food");
      // Add to diary and redirect
      await addFoodEntry(createdFood, parsedSize, mealSlot, `${formatAmount(parsedSize, servingUnit)} ${servingUnit}`);
      router.push(HOME_ROUTE);
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
          className="w-full min-h-[52px] rounded-full bg-cobalt text-on-accent font-bold text-base cursor-pointer hover:bg-cobalt/90 m-tint transition-press border-0 flex items-center justify-center shadow-md disabled:opacity-50"
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
          <div role="group" aria-label="Cách tạo món" data-tour="create-mode" className="flex flex-col gap-2">
            <ChipGroup
              columns={2}
              tone="light"
              data-align-group="create-mode"
              items={[
                { id: "recipe", label: "Tính từ nguyên liệu", active: mode === "recipe", onClick: () => setMode("recipe") },
                { id: "nutrition", label: "Tự nhập", active: mode === "nutrition", onClick: () => setMode("nutrition") },
              ]}
            />
            {mode === "recipe" ? (
              <p className="m-0 text-cap leading-snug text-secondary">Kcal và 22 vi chất tự tính từ dữ liệu trong app</p>
            ) : (
              <p role="note" className="m-0 rounded-xl bg-warning-bg px-3 py-2 text-cap leading-snug text-warning-text">
                Tự nhập chỉ có kcal và chất đa lượng. Vi chất để trống nếu bạn không nhập. Món sẽ có nhãn Tự nhập.
              </p>
            )}
          </div>
        )}
        {mode === "recipe" ? (
          recipeMissing ? (
            <p className="m-0 text-callout text-secondary">Món này không còn trong danh sách.</p>
          ) : (
            <>
              <RecipeBuilder state={recipeState} excludeId={editId ?? undefined} />
              {recipeSaveError && (
                <p role="alert" className="m-0 text-cap font-medium leading-snug text-destructive-text">
                  {recipeSaveError}
                </p>
              )}
              <p className="m-0 text-xs leading-snug text-secondary">Món được lưu vào tài khoản. Danh sách nguyên liệu chỉ có trên máy này.</p>
            </>
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
            className={`h-12 px-4 rounded-xl border-2 bg-surface text-base text-text outline-none transition-colors ${
              touched.nameVi && errors.nameVi ? "border-destructive" : "border-card-border focus:border-cobalt"
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
              className={`h-12 px-4 rounded-xl border-2 bg-surface text-base font-bold tabular-nums text-text outline-none text-right transition-colors w-32 shrink-0 ${
                touched.servingSize && errors.servingSize ? "border-destructive" : "border-card-border focus:border-cobalt"
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
                    className={`min-h-11 min-w-[52px] px-4 rounded-full text-sm font-semibold border-0 cursor-pointer active:scale-[0.97] transition-press ${
                      isChecked ? "bg-ink text-on-dark" : "bg-surface text-text border border-card-border hover:bg-paper-dark"
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
        <div className="bg-card rounded-card border border-transparent shadow-ring lg:shadow-card p-4 flex flex-col gap-3">
          <div>
            <h2 className="m-0 text-base font-bold text-text">Dinh dưỡng mỗi khẩu phần</h2>
            <p className="m-0 text-xs text-secondary mt-1 leading-relaxed">
              Lấy số trên nhãn dinh dưỡng của gói. Bỏ trống = chưa có dữ liệu, không phải 0.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <FormRow label="Năng lượng (kcal)" htmlFor="cf-kcal" required error={touched.calories ? errors.calories : undefined}>
              <input
                id="cf-kcal"
                type="text"
                inputMode="decimal"
                value={calories}
                onChange={(e) => {
                  setCalories(e.target.value);
                  if (touched.calories) validateField("calories", e.target.value);
                }}
                onBlur={() => handleBlur("calories", calories)}
                placeholder="0"
                className={`h-12 px-3 rounded-xl border-2 bg-surface text-base font-bold tabular-nums text-text outline-none text-right ${
                  touched.calories && errors.calories ? "border-destructive" : "border-card-border focus:border-cobalt"
                }`}
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
                className="h-12 px-3 rounded-xl border-2 border-card-border focus:border-cobalt bg-surface text-base font-bold tabular-nums text-text outline-none text-right"
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
                className="h-12 px-3 rounded-xl border-2 border-card-border focus:border-cobalt bg-surface text-base font-bold tabular-nums text-text outline-none text-right"
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
                className="h-12 px-3 rounded-xl border-2 border-card-border focus:border-cobalt bg-surface text-base font-bold tabular-nums text-text outline-none text-right"
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
            className="w-full min-h-12 px-4 rounded-xl border border-card-border bg-card text-text flex items-center justify-between font-semibold text-sm cursor-pointer hover:bg-surface transition-colors"
          >
            <span>+ Thêm vi chất ({nutrientName("sodium")}, {nutrientName("calcium")}, {nutrientName("iron")}…)</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="m-chevron text-secondary"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <Expand open={showMicros} className="bg-card rounded-card border border-transparent shadow-ring lg:shadow-card p-4 grid grid-cols-2 gap-3">
              <FormRow label={`${nutrientName("sodium")} (mg)`} htmlFor="cf-na">
                <input
                  id="cf-na"
                  type="text"
                  inputMode="decimal"
                  value={sodium}
                  onChange={(e) => setSodium(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-cobalt bg-surface text-base font-semibold tabular-nums text-text outline-none text-right"
                />
              </FormRow>

              <FormRow label={`${nutrientName("potassium")} (mg)`} htmlFor="cf-k">
                <input
                  id="cf-k"
                  type="text"
                  inputMode="decimal"
                  value={potassium}
                  onChange={(e) => setPotassium(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-cobalt bg-surface text-base font-semibold tabular-nums text-text outline-none text-right"
                />
              </FormRow>

              <FormRow label={`${nutrientName("calcium")} (mg)`} htmlFor="cf-ca">
                <input
                  id="cf-ca"
                  type="text"
                  inputMode="decimal"
                  value={calcium}
                  onChange={(e) => setCalcium(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-cobalt bg-surface text-base font-semibold tabular-nums text-text outline-none text-right"
                />
              </FormRow>

              <FormRow label={`${nutrientName("iron")} (mg)`} htmlFor="cf-fe">
                <input
                  id="cf-fe"
                  type="text"
                  inputMode="decimal"
                  value={iron}
                  onChange={(e) => setIron(e.target.value)}
                  placeholder="—"
                  className="h-11 px-3 rounded-xl border border-card-border focus:border-cobalt bg-surface text-base font-semibold tabular-nums text-text outline-none text-right"
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
                    className="h-11 px-3 rounded-xl border border-card-border focus:border-cobalt bg-surface text-base font-semibold tabular-nums text-text outline-none text-right"
                  />
                </FormRow>
              </div>
          </Expand>
        </div>
        </>
        )}
      </form>
    </AppShell>
  );
}

export default function CreateFoodPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-dvh bg-page" />}>
      <CreateFoodInner />
    </Suspense>
  );
}
