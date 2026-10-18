"use client";

import React, { useCallback, useMemo, useState } from "react";
import { FormRow } from "@/components/ui/form-row";
import { formatAmount } from "@/lib/format";
import { COUNTED_NUTRIENT_KEYS } from "@/lib/day-totals";
import {
  MAX_SERVINGS,
  MIN_SERVINGS,
  clampServings,
  cookedWarning,
  countedKnown,
  hasErrors,
  parseAmount,
  perServingNutrients,
  servingGrams,
  validateDraft,
  type IngredientUnit,
  type Recipe,
  type RecipeDraft,
  type RecipeErrors,
} from "@/lib/recipe";
import { catalogueLookup } from "@/lib/recipe-store";
import type { FoodItem } from "@/lib/mock/foods";
import { IngredientPicker } from "./ingredient-picker";

export const EMPTY_DRAFT: RecipeDraft = { name: "", servings: 1, ingredients: [], cooked: "" };

/** The unit a food is naturally measured in: ml for a drink logged in ml, else g. */
function defaultUnit(food: FoodItem): IngredientUnit {
  return /\bml$/i.test(food.servings[0]?.label ?? "") ? "ml" : "g";
}

/** The draft of the builder and everything it does to it. The page keeps it so the CTA can save. */
export function useRecipeDraft(initial: RecipeDraft = EMPTY_DRAFT) {
  const [draft, setDraft] = useState<RecipeDraft>(initial);
  const [shown, setShown] = useState<{ name: boolean; ingredients: boolean; cooked: boolean; amounts: Record<number, boolean> }>({
    name: false,
    ingredients: false,
    cooked: false,
    amounts: {},
  });

  const errors = useMemo(() => validateDraft(draft), [draft]);

  const update = useCallback((patch: Partial<RecipeDraft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const setServings = useCallback((n: number) => setDraft((d) => ({ ...d, servings: clampServings(n) })), []);
  const addIngredients = useCallback((foods: FoodItem[]) => {
    setDraft((d) => ({
      ...d,
      ingredients: [...d.ingredients, ...foods.map((food) => ({ foodId: food.id, name: food.nameVi, amount: "", unit: defaultUnit(food) }))],
    }));
  }, []);
  const setAmount = useCallback((index: number, amount: string) => {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.map((x, i) => (i === index ? { ...x, amount } : x)) }));
  }, []);
  const toggleUnit = useCallback((index: number) => {
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((x, i) => (i === index ? { ...x, unit: x.unit === "g" ? "ml" : "g" } : x)),
    }));
  }, []);
  const removeIngredient = useCallback((index: number) => {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, i) => i !== index) }));
    setShown((s) => ({ ...s, amounts: {} }));
  }, []);

  /** Shows every error and returns whether the draft can be saved. */
  const validateAll = useCallback((): boolean => {
    const e = validateDraft(draft);
    setShown({
      name: true,
      ingredients: true,
      cooked: true,
      amounts: Object.fromEntries(draft.ingredients.map((_, i) => [i, true])),
    });
    return !hasErrors(e);
  }, [draft]);

  return { draft, setDraft, update, setServings, addIngredients, setAmount, toggleUnit, removeIngredient, errors, shown, setShown, validateAll };
}

export type RecipeDraftState = ReturnType<typeof useRecipeDraft>;

/** The recipe a draft means right now (amounts that are not numbers count as 0), for the live preview. */
function previewRecipe(draft: RecipeDraft): Recipe {
  const cooked = draft.cooked.trim() === "" ? null : parseAmount(draft.cooked);
  return {
    id: "recipe-preview",
    name: draft.name,
    servings: clampServings(draft.servings),
    ingredients: draft.ingredients.map((i) => ({ foodId: i.foodId, name: i.name, grams: parseAmount(i.amount) ?? 0, unit: i.unit })),
    cookedGrams: cooked !== null && cooked > 0 ? cooked : null,
    createdAt: "",
  };
}

const INPUT =
  "h-12 w-full rounded-xl border-2 bg-surface px-4 text-base text-text outline-none transition-colors";
const BORDER_OK = "border-card-border focus:border-blue";
const BORDER_BAD = "border-destructive";

function StepButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-card-border bg-card text-xl font-bold text-text active:scale-[0.97] disabled:cursor-default disabled:opacity-40 motion-reduce:active:scale-100"
    >
      {children}
    </button>
  );
}

/** Từ nguyên liệu: name, servings, ingredients with grams, the cooked weight, and the live "Mỗi phần" card. */
export function RecipeBuilder({ state, excludeId }: { state: RecipeDraftState; excludeId?: string }) {
  const { draft, update, setServings, addIngredients, setAmount, toggleUnit, removeIngredient, errors, shown, setShown } = state;
  const [pickerOpen, setPickerOpen] = useState(false);
  const recipe = useMemo(() => previewRecipe(draft), [draft]);
  const nutrients = useMemo(() => perServingNutrients(recipe, catalogueLookup), [recipe]);
  const grams = servingGrams(recipe);
  const known = countedKnown(nutrients);
  const hasWeight = recipe.ingredients.some((i) => i.grams > 0);
  const cookedNote = useMemo(() => cookedWarning(draft), [draft]);

  const showName = shown.name && errors.name;
  const showList = shown.ingredients && errors.ingredients;
  const showCooked = shown.cooked && errors.cooked;

  const macro = (key: string, label: string) => {
    const v = nutrients[key];
    return { key, label, value: v === null || v === undefined ? "—" : `${formatAmount(v, "g")} g` };
  };
  const kcal = nutrients.energy;
  const stats = [macro("protein", "Đạm"), macro("carbs", "Tinh bột"), macro("fat", "Chất béo")];

  return (
    <div className="flex flex-col gap-4">
      <FormRow label="Tên món" htmlFor="rb-name" required error={showName ? errors.name : undefined}>
        <input
          id="rb-name"
          type="text"
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          onBlur={() => setShown((s) => ({ ...s, name: true }))}
          placeholder="Ví dụ: Cơm chiên trứng"
          className={`${INPUT} ${showName ? BORDER_BAD : BORDER_OK}`}
        />
      </FormRow>

      <FormRow label="Số phần" htmlFor="rb-servings">
        <div className="flex items-center gap-3">
          <StepButton label="Bớt một phần" onClick={() => setServings(draft.servings - 1)} disabled={draft.servings <= MIN_SERVINGS}>
            −
          </StepButton>
          <span id="rb-servings" role="status" className="min-w-[72px] text-center text-base font-bold tabular-nums text-text">
            {draft.servings} phần
          </span>
          <StepButton label="Thêm một phần" onClick={() => setServings(draft.servings + 1)} disabled={draft.servings >= MAX_SERVINGS}>
            +
          </StepButton>
        </div>
      </FormRow>

      <section aria-labelledby="rb-ingredients" className="flex flex-col gap-2">
        <h2 id="rb-ingredients" className="m-0 text-xs font-bold text-text">
          Nguyên liệu
        </h2>
        {draft.ingredients.length === 0 ? (
          <p className="m-0 rounded-xl border border-dashed border-card-border bg-card px-4 py-3 text-[13px] leading-snug text-secondary">
            Chưa có nguyên liệu
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {draft.ingredients.map((ingredient, index) => {
              const amountError = shown.amounts[index] ? errors.amounts[index] : undefined;
              const id = `rb-amount-${index}`;
              return (
                <li key={`${ingredient.foodId}-${index}`} data-align-group="recipe-row" className="flex flex-col gap-1 rounded-[18px] lg:shadow-card border border-card-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 break-words text-[15px] font-semibold leading-snug text-text">{ingredient.name}</span>
                    <button
                      type="button"
                      aria-label={`Bỏ ${ingredient.name}`}
                      onClick={() => removeIngredient(index)}
                      className="-mr-1 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-secondary hover:bg-surface active:scale-[0.97] motion-reduce:active:scale-100"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id={id}
                      type="text"
                      inputMode="decimal"
                      aria-label={`Khối lượng ${ingredient.name}`}
                      aria-invalid={amountError ? true : undefined}
                      aria-describedby={amountError ? `${id}-error` : undefined}
                      value={ingredient.amount}
                      onChange={(e) => setAmount(index, e.target.value)}
                      onBlur={() => setShown((s) => ({ ...s, amounts: { ...s.amounts, [index]: true } }))}
                      placeholder="0"
                      className={`h-11 min-w-0 flex-1 rounded-xl border-2 bg-surface px-3 text-right text-base font-bold tabular-nums text-text outline-none ${
                        amountError ? BORDER_BAD : BORDER_OK
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleUnit(index)}
                      aria-label={`Đơn vị của ${ingredient.name}: ${ingredient.unit}. Chạm để đổi`}
                      className="inline-flex h-11 min-w-[56px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-card-border bg-surface px-3 text-sm font-semibold text-text active:scale-[0.97] motion-reduce:active:scale-100"
                    >
                      {ingredient.unit}
                    </button>
                  </div>
                  {amountError && (
                    <p id={`${id}-error`} role="alert" className="m-0 text-xs font-medium leading-snug text-destructive-text">
                      {amountError}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {showList && (
          <p role="alert" className="m-0 text-xs font-medium leading-snug text-destructive-text">
            {errors.ingredients}
          </p>
        )}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          className="flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-xl border border-card-border bg-card px-4 text-sm font-semibold text-blue m-tint"
        >
          + Thêm nguyên liệu
        </button>
      </section>

      <FormRow
        label="Khối lượng sau khi nấu (không bắt buộc)"
        htmlFor="rb-cooked"
        error={showCooked ? errors.cooked : undefined}
      >
        <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            id="rb-cooked"
            type="text"
            inputMode="decimal"
            value={draft.cooked}
            onChange={(e) => update({ cooked: e.target.value })}
            onBlur={() => setShown((s) => ({ ...s, cooked: true }))}
            placeholder="—"
            className={`${INPUT} text-right font-bold tabular-nums ${showCooked ? BORDER_BAD : BORDER_OK}`}
          />
          <span className="shrink-0 text-sm font-semibold text-secondary">g</span>
        </div>
        <p className="m-0 text-xs leading-snug text-secondary">
          Cân cả nồi sau khi nấu để ghi theo gram cho đúng. Bỏ trống thì mỗi phần tính theo tổng nguyên liệu.
        </p>
        {cookedNote && (
          <p role="note" className="m-0 rounded-xl bg-warning-bg px-3 py-2 text-xs leading-snug text-warning-text">
            {cookedNote}
          </p>
        )}
        </div>
      </FormRow>

      <section aria-label="Mỗi phần" data-recipe-card className="flex flex-col gap-3 rounded-[18px] bg-surface-dark p-4 text-on-dark">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="m-0 text-[13px] font-bold text-sky">Mỗi phần · {hasWeight ? `${formatAmount(grams, "g")} g` : "—"}</h2>
          <span className="font-display text-[32px] font-extrabold leading-none tabular-nums">
            {kcal === null || kcal === undefined ? "—" : formatAmount(kcal, "kcal")}
            <span className="ml-1 text-[13px] font-semibold text-muted-on-dark">kcal</span>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.key} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-on-dark">{s.label}</span>
              <span className="text-[15px] font-bold tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
        <p className="m-0 border-t border-muted-on-dark/30 pt-2 text-[13px] leading-snug text-muted-on-dark">
          {hasWeight ? `Đủ dữ liệu ${known}/${COUNTED_NUTRIENT_KEYS.length} vi chất` : "Thêm nguyên liệu để xem dinh dưỡng"}
        </p>
      </section>

      <IngredientPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        disabledIds={excludeId ? [excludeId] : []}
        onConfirm={(foods) => {
          addIngredients(foods);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
