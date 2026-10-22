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
import { Expand } from "@/components/ui/expand";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Segmented } from "@/components/ui/segmented";
import { SectionTitle } from "@/components/ui/section-title";
import { Field, UnitField, fieldClass, fieldErrorId } from "@/components/foods/food-field";
import { nutrientDot } from "@/lib/nutrient-colors";
import { RecipeBuilder, useRecipeDraft } from "@/components/foods/recipe-builder";
import { draftToRecipe, recipeDraftFromFood, recipeToDraft, RECIPE_ID_PREFIX } from "@/lib/recipe";
import { getRecipe, saveRecipe } from "@/lib/recipe-store";
import { useBack } from "@/hooks/use-back";
import { markUsed } from "@/lib/onboarding-store";
import { HOME_ROUTE } from "@/lib/nav";
import { AlertLine } from "@/components/ui/alert-line";

/** The typed-in food: kcal and the three macros (dot = macro identity colour), then the optional micros (dot = nutrient colour). */
const MACRO_FIELDS = [
  { id: "cf-kcal", label: "Năng lượng", unit: "kcal", dot: "bg-macro-kcal", placeholder: "Ví dụ: 250" },
  { id: "cf-pro", label: "Đạm", unit: "g", dot: "bg-macro-dam", placeholder: "Ví dụ: 12" },
  { id: "cf-carbs", label: "Tinh bột", unit: "g", dot: "bg-macro-tinhbot", placeholder: "Ví dụ: 30" },
  { id: "cf-fat", label: "Chất béo", unit: "g", dot: "bg-macro-beo", placeholder: "Ví dụ: 8" },
] as const;
const MICRO_FIELDS = [
  { id: "cf-na", label: nutrientName("sodium"), unit: "mg", nutrient: "sodium", placeholder: "Ví dụ: 200" },
  { id: "cf-k", label: nutrientName("potassium"), unit: "mg", nutrient: "potassium", placeholder: "Ví dụ: 300" },
  { id: "cf-ca", label: nutrientName("calcium"), unit: "mg", nutrient: "calcium", placeholder: "Ví dụ: 120" },
  { id: "cf-fe", label: nutrientName("iron"), unit: "mg", nutrient: "iron", placeholder: "Ví dụ: 2" },
  { id: "cf-vitd", label: "Vitamin D", unit: "µg", nutrient: "vitamin_d", placeholder: "Ví dụ: 1" },
] as const;

function CreateFoodInner() {
  const router = useRouter();
  const goBack = useBack();
  const searchParams = useSearchParams();
  const { addFoodEntry } = useDiary();

  const mealSlot = useMealSlot(searchParams.get("meal"));
  const mealNameVi = mealSlot ? getMealSlotNameVi(mealSlot) : "—";

  // Tính từ nguyên liệu (a recipe, the default) or Tự nhập (typed from a label). ?recipe=<id> edits a saved recipe;
  // ?from=<food id> starts a recipe from a catalogue dish that has one (Tùy chỉnh món này).
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
          className="glass-cobalt flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-full border-0 text-body-lg font-bold text-on-accent m-tint transition-press disabled:opacity-50"
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
      <main className="flex flex-1 flex-col">
      <form onSubmit={handleSubmit} className="flex-1 w-full max-w-[560px] mx-auto p-4 flex flex-col gap-4">
        {!editId && (
          <div data-tour="create-mode" className="flex flex-col gap-2">
            <Segmented
              label="Cách tạo món"
              alignGroup="create-mode"
              value={mode === "recipe" ? "recipe" : "nutrition"}
              onChange={setMode}
              items={[
                { key: "recipe", label: "Tính từ nguyên liệu" },
                { key: "nutrition", label: "Tự nhập" },
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
              <AlertLine show={!!recipeSaveError} gap={4} className="m-0 text-cap font-medium leading-snug text-destructive-text">
                {recipeSaveError}
              </AlertLine>
              <p className="m-0 text-xs leading-snug text-secondary">Món được lưu vào tài khoản. Danh sách nguyên liệu chỉ có trên máy này.</p>
            </>
          )
        ) : (
        <>
        {/* Name Field */}
        <Field label="Tên món" htmlFor="cf-name" required error={touched.nameVi ? errors.nameVi : undefined}>
          <input
            id="cf-name"
            type="text"
            autoComplete="off"
            enterKeyHint="next"
            value={nameVi}
            onChange={(e) => {
              setNameVi(e.target.value);
              if (touched.nameVi) validateField("nameVi", e.target.value);
            }}
            onBlur={() => handleBlur("nameVi", nameVi)}
            placeholder="Ví dụ: Bánh tráng trộn"
            aria-invalid={touched.nameVi && errors.nameVi ? true : undefined}
            aria-describedby={touched.nameVi && errors.nameVi ? fieldErrorId("cf-name") : undefined}
            className={`text-base ${fieldClass({ bad: !!(touched.nameVi && errors.nameVi) })}`}
          />
        </Field>

        {/* Serving Size & Unit */}
        <Field label="Khẩu phần" htmlFor="cf-size" error={touched.servingSize ? errors.servingSize : undefined}>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="cf-size"
              type="text"
              inputMode="decimal"
              enterKeyHint="next"
              value={servingSize}
              onChange={(e) => {
                setServingSize(e.target.value);
                if (touched.servingSize) validateField("servingSize", e.target.value);
              }}
              onBlur={() => handleBlur("servingSize", servingSize)}
              placeholder="Ví dụ: 100"
              aria-invalid={touched.servingSize && errors.servingSize ? true : undefined}
              aria-describedby={touched.servingSize && errors.servingSize ? fieldErrorId("cf-size") : undefined}
              className={`text-base ${fieldClass({ bad: !!(touched.servingSize && errors.servingSize), number: true })} !w-32 shrink-0`}
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
                    className={`min-h-11 min-w-[52px] cursor-pointer rounded-full border-0 px-4 text-callout font-semibold transition-press active:scale-[0.97] motion-reduce:active:scale-100 ${
                      isChecked ? "bg-ink text-on-dark" : "bg-card text-text shadow-field"
                    }`}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          </div>
        </Field>

        {/* Nutrition Info Card */}
        <section aria-labelledby="cf-nutrition" className="flex flex-col gap-3 rounded-card border border-transparent bg-card p-4 shadow-ring lg:shadow-card">
          <div>
            <SectionTitle id="cf-nutrition">Dinh dưỡng mỗi khẩu phần</SectionTitle>
            <p className="m-0 mt-1 text-cap leading-snug text-secondary">
              Lấy số trên nhãn dinh dưỡng của gói. Bỏ trống = chưa có dữ liệu, không phải 0.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {MACRO_FIELDS.map((f) => {
              const error = f.id === "cf-kcal" && touched.calories ? errors.calories : undefined;
              const value = { "cf-kcal": calories, "cf-pro": protein, "cf-carbs": carbs, "cf-fat": fat }[f.id] as string;
              const set = { "cf-kcal": setCalories, "cf-pro": setProtein, "cf-carbs": setCarbs, "cf-fat": setFat }[f.id] as (v: string) => void;
              return (
                <Field key={f.id} label={f.label} htmlFor={f.id} required={f.id === "cf-kcal"} dot={{ className: f.dot }} error={error} data-align-group="create-macro">
                  <UnitField unit={f.unit}>
                    <input
                      id={f.id}
                      type="text"
                      inputMode="decimal"
                      enterKeyHint={f.id === "cf-fat" ? "done" : "next"}
                      value={value}
                      onChange={(e) => {
                        set(e.target.value);
                        if (f.id === "cf-kcal" && touched.calories) validateField("calories", e.target.value);
                      }}
                      onBlur={f.id === "cf-kcal" ? () => handleBlur("calories", calories) : undefined}
                      placeholder={f.placeholder}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? fieldErrorId(f.id) : undefined}
                      className={`text-base ${fieldClass({ bad: !!error, inCard: true, number: true })}`}
                    />
                  </UnitField>
                </Field>
              );
            })}
          </div>
        </section>

        {/* Expandable Micros */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={showMicros}
            onClick={() => setShowMicros(!showMicros)}
            className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-2 rounded-[14px] border border-transparent bg-card px-4 text-left text-callout font-semibold text-text shadow-ring m-tint transition-press"
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
              className="m-chevron shrink-0 text-secondary"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <Expand open={showMicros} className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-transparent bg-card p-4 shadow-ring lg:shadow-card">
            {MICRO_FIELDS.map((f) => {
              const value = { "cf-na": sodium, "cf-k": potassium, "cf-ca": calcium, "cf-fe": iron, "cf-vitd": vitaminD }[f.id] as string;
              const set = { "cf-na": setSodium, "cf-k": setPotassium, "cf-ca": setCalcium, "cf-fe": setIron, "cf-vitd": setVitaminD }[f.id] as (v: string) => void;
              return (
                <Field key={f.id} label={f.label} htmlFor={f.id} dot={{ color: nutrientDot(f.nutrient) }} data-align-group="create-micro">
                  <UnitField unit={f.unit}>
                    <input
                      id={f.id}
                      type="text"
                      inputMode="decimal"
                      enterKeyHint={f.id === "cf-vitd" ? "done" : "next"}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={f.placeholder}
                      className={`text-base ${fieldClass({ inCard: true, number: true })}`}
                    />
                  </UnitField>
                </Field>
              );
            })}
          </Expand>
        </div>
        </>
        )}
      </form>
      </main>
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
