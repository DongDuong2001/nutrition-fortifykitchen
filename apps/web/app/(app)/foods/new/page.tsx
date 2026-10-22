"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useDiary } from "@/lib/diary-store";
import { getMealSlotNameVi } from "@/lib/meal-slot";
import { useMealSlot } from "@/lib/use-meal-slot";
import { formatAmount } from "@/lib/format";
import { parseNumberInput } from "@/lib/parse-number";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Segmented } from "@/components/ui/segmented";
import { SectionTitle } from "@/components/ui/section-title";
import { Expand } from "@/components/ui/expand";
import { Field, UnitField, fieldClass, fieldErrorId } from "@/components/foods/food-field";
import { nutrientDot } from "@/lib/nutrient-colors";
import { MAIN_FIELDS, customFoodPayload, fieldForKey, type LabelField } from "@/lib/custom-food-fields";
import { NutrientPickerSheet } from "@/components/foods/nutrient-picker-sheet";
import { SHEET_EXIT_MS } from "@/components/ui/sheet";
import { RecipeBuilder, useRecipeDraft } from "@/components/foods/recipe-builder";
import { draftToRecipe, recipeDraftFromFood, recipeToDraft, RECIPE_ID_PREFIX } from "@/lib/recipe";
import { getRecipe, saveRecipe } from "@/lib/recipe-store";
import { useBack } from "@/hooks/use-back";
import { markUsed } from "@/lib/onboarding-store";
import { setPresent } from "@/lib/tour-bus";
import { HOME_ROUTE } from "@/lib/nav";
import { AlertLine } from "@/components/ui/alert-line";

/**
 * Two columns, as long as a column holds its longest label ("Năng lượng *") on one line and a number beside its unit: below 18 rem
 * of card (360 px with the phone's text at 125 % or more) the fields stack in one column instead of wrapping or cutting.
 */
const NUMBER_GRID = "grid grid-cols-1 gap-x-4 gap-y-3 @min-[18rem]:grid-cols-2";

/** The macro rows keep their identity colour (dot); the other top-level rows take their nutrient colour, sub-rows a connector. */
const MACRO_DOT: Record<string, string> = { energy: "bg-macro-kcal", protein: "bg-macro-dam", carbs: "bg-macro-tinhbot", fat: "bg-macro-beo" };

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

  // Every number field, by input id (lib/custom-food-fields): blank is no data, never 0
  const [values, setValues] = useState<Record<string, string>>({});
  const setValue = (id: string, value: string) => setValues((prev) => ({ ...prev, [id]: value }));
  const calories = values["cf-kcal"] ?? "";

  // + Thêm vi chất khác: the keys added under the main block, in the order they were picked
  const [added, setAdded] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  // The button's tip (lib/tips food-new-nutrients) waits for the button, which only Tự nhập shows
  const manual = mode === "nutrition";
  useEffect(() => {
    if (!manual) return;
    setPresent("add-nutrient", true);
    return () => setPresent("add-nutrient", false);
  }, [manual]);
  const focusAfterPick = useRef<number | null>(null);
  useEffect(() => () => window.clearTimeout(focusAfterPick.current ?? undefined), []);
  const pickNutrient = (key: string) => {
    setAdded((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setPickerOpen(false);
    // The sheet hands focus back to its opener as it closes; the new field takes it once the sheet is down
    window.clearTimeout(focusAfterPick.current ?? undefined);
    focusAfterPick.current = window.setTimeout(() => {
      const el = document.getElementById(fieldForKey(key)!.id);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, SHEET_EXIT_MS + 20);
  };
  const removeNutrient = (key: string) => {
    const id = fieldForKey(key)!.id;
    setAdded((prev) => prev.filter((k) => k !== key));
    setValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    document.getElementById("cf-add-nutrient")?.focus();
  };

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

    setTouched({ nameVi: true, servingSize: true, calories: true });

    if (errName || errSize || errCals) {
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedSize = parseNumberInput(servingSize) || 100;
      // A field taken off with its × has dropped its value, so this is exactly what the form shows
      const { calories: parsedCals, ...nutrition } = customFoodPayload(values);

      const createdFood = await apiClient.createFood({
        nameVi: nameVi.trim(),
        servingUnit,
        servingSize: parsedSize,
        calories: parsedCals ?? 0,
        ...nutrition,
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
                Vi chất để trống nếu bạn không nhập. Món sẽ có nhãn Tự nhập.
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
        <section aria-labelledby="cf-nutrition" className="@container flex flex-col gap-3 rounded-card border border-transparent bg-card p-4 shadow-ring lg:shadow-card">
          <div>
            <SectionTitle id="cf-nutrition">Dinh dưỡng mỗi khẩu phần</SectionTitle>
            <p className="m-0 mt-1 text-cap leading-snug text-secondary">
              Lấy số trên nhãn dinh dưỡng của gói. Bỏ trống = chưa có dữ liệu, không phải 0.
            </p>
          </div>

          <div className={NUMBER_GRID}>
            {MAIN_FIELDS.map((f, i) => {
              const kcal = f.id === "cf-kcal";
              const error = kcal && touched.calories ? errors.calories : undefined;
              // A sub-row starts a new grid row under its parent (Chất xơ under Tinh bột, Bão hòa under Chất béo)
              const startsRow = f.indent && !MAIN_FIELDS[i - 1]?.indent;
              return (
                <NumberField
                  key={f.id}
                  field={f}
                  value={values[f.id] ?? ""}
                  onChange={(v) => {
                    setValue(f.id, v);
                    if (kcal && touched.calories) validateField("calories", v);
                  }}
                  onBlur={kcal ? () => handleBlur("calories", calories) : undefined}
                  error={error}
                  className={startsRow ? "col-start-1" : ""}
                />
              );
            })}
          </div>
        </section>

        {/* + Thêm vi chất khác: what else the label states, one field per pick */}
        <div className="flex flex-col gap-2">
          <Expand open={added.length > 0} className="@container rounded-card border border-transparent bg-card p-4 shadow-ring lg:shadow-card">
            <div className={NUMBER_GRID}>
              {added.map((key) => {
                const f = fieldForKey(key)!;
                return <NumberField key={key} field={f} value={values[f.id] ?? ""} onChange={(v) => setValue(f.id, v)} onRemove={() => removeNutrient(key)} />;
              })}
            </div>
          </Expand>
          <button
            id="cf-add-nutrient"
            type="button"
            data-tour="add-nutrient"
            aria-haspopup="dialog"
            onClick={() => {
              setPickerOpen(true);
              markUsed("add-nutrient");
            }}
            className="flex min-h-[52px] w-full cursor-pointer items-center gap-2 rounded-[14px] border border-transparent bg-card px-4 text-left text-callout font-semibold text-cobalt shadow-ring m-tint transition-press"
          >
            + Thêm vi chất khác
          </button>
        </div>
        <NutrientPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} added={added} onPick={pickNutrient} />
        </>
        )}
      </form>
      </main>
    </AppShell>
  );
}

/** One number field of the label: its name and unit, "–" while blank (no data, never 0); an added one has a × that takes it off. */
function NumberField({
  field,
  value,
  onChange,
  onBlur,
  error,
  onRemove,
  className = "",
}: {
  field: LabelField;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  onRemove?: () => void;
  className?: string;
}) {
  const dot = field.indent ? undefined : MACRO_DOT[field.key] ? { className: MACRO_DOT[field.key] } : { color: nutrientDot(field.key) };
  return (
    <Field
      label={
        <>
          {field.indent && <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-bl-[3px] border-b-2 border-l-2 border-divider align-[3px]" />}
          {field.label}
        </>
      }
      htmlFor={field.id}
      required={field.required}
      dot={dot}
      error={error}
      className={className}
      action={
        onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Bỏ ${field.label}`}
            className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-surface text-secondary before:absolute before:-inset-2.5 before:content-[''] active:scale-[0.97] transition-press motion-reduce:active:scale-100"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )
      }
    >
      <UnitField unit={field.unit}>
        <input
          id={field.id}
          type="text"
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="–"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? fieldErrorId(field.id) : undefined}
          className={`text-base ${fieldClass({ bad: !!error, inCard: true, number: true })}`}
        />
      </UnitField>
    </Field>
  );
}

export default function CreateFoodPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-dvh bg-page" />}>
      <CreateFoodInner />
    </Suspense>
  );
}
