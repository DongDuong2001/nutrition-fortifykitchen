"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Expand } from "@/components/ui/expand";
import { ChipGroup } from "@/components/ui/chip-group";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { CATALOG_FOODS, type FoodItem } from "@/lib/catalog";
import {
  EDIT_STEP_GRAMS,
  canEditParts,
  dishViewOf,
  editParts,
  editTotals,
  foodsByKey,
  isEdited,
  loadDishRecipes,
  peekDishRecipes,
  partGrams,
  saveEditedDish,
  scaledAddOn,
  servingsOf,
  type DishEdit,
  type DishRecipes,
  type EditPart,
} from "@/lib/dish-recipes";
import { formatAmount } from "@/lib/format";
import { kcalValue } from "@/lib/kcal";
import { calculateMacroPreview, gramFieldText, parseGramsInput } from "@/lib/portion";

export interface DishPartsProps {
  food: FoodItem;
  /** The chosen portion in grams */
  portionGrams: number;
  /**
   * What the sheet needs to know of the dish: its parts added up and a way to make its one-off food, or null while the
   * parts load or when one of them has no data (then they are shown, not changed). Called when the parts or the portion change.
   */
  onEdit: (edit: DishEdit | null) => void;
}

const PARTS_OPEN_KEY = "h1t_dish_parts_open";

const kcalOf = (part: EditPart, grams: number) => (part.food ? calculateMacroPreview(part.food.nutrients, grams).calories : null);

/** The gram field of a part: typing is free (a comma, an empty box), the number is read as it comes. */
function GramField({ name, grams, onChange }: { name: string; grams: number; onChange: (grams: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="flex h-11 w-[72px] items-center gap-1 rounded-xl bg-surface px-2 text-text focus-within:ring-2 focus-within:ring-cobalt">
      <input
        inputMode="decimal"
        aria-label={`Số gam ${name}`}
        value={draft ?? (grams > 0 ? gramFieldText(grams) : "0")}
        onFocus={(e) => {
          setDraft(grams > 0 ? gramFieldText(grams) : "0");
          e.currentTarget.select();
        }}
        onBlur={() => setDraft(null)}
        // Enter settles the number; it must not reach the add sheet's Enter, which logs the dish
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.blur();
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(parseGramsInput(e.target.value));
        }}
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-right text-base font-semibold tabular-nums outline-none"
      />
      <span className="text-cap text-secondary">g</span>
    </label>
  );
}

const stepClass =
  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-surface text-lg font-bold text-text active:scale-[0.97] transition-press motion-reduce:active:scale-100 disabled:cursor-default disabled:opacity-40";

/**
 * cc-54 "Thành phần": what is inside a premade dish, for the portion that is chosen, collapsed until asked for, and the
 * dish's add-on chips ("+ Bún 100 g"). cc-67: each part has a gram field with − and + 10 g (0 takes the part out), a chip
 * puts its add-on in the list as a part, and Khôi phục goes back to the recipe. The sheet shows the kcal and macros of the
 * parts added up, and saving logs ONE entry for the changed dish (lib/dish-recipes saveEditedDish). Nothing shows for a
 * dish without a recipe. The recipes (lib/dish-recipes) load when this mounts, never with the page.
 */
export function DishParts({ food, portionGrams, onEdit }: DishPartsProps) {
  // cc-64 (A7): already loaded (a press on the row started it), the parts are there on the first frame
  const [recipes, setRecipes] = useState<DishRecipes | null>(peekDishRecipes);
  // cc-67: a person who changes the parts of a dish finds them open the next time (a convenience of this device)
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(PARTS_OPEN_KEY) === "1") setOpen(true);
    } catch {
      // Storage unavailable: they start closed
    }
  }, []);
  // What the user changed, by part key (grams for one serving) and which add-ons are on (by chip label)
  const [typed, setTyped] = useState<Record<string, number>>({});
  const [added, setAdded] = useState<string[]>([]);
  // The alternative chosen for a part (Đổi nguyên liệu), by part key: the alternative's key
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const panelId = useId();
  // Subscribes to the catalogue: the demo ingredients (or the live load) arrive after this mounts
  const { version } = useCatalogFoods();

  useEffect(() => {
    let current = true;
    loadDishRecipes().then(
      (loaded) => current && setRecipes(loaded),
      () => {}
    );
    return () => {
      current = false;
    };
  }, []);

  const view = useMemo(() => (recipes ? dishViewOf(food, recipes, foodsByKey(CATALOG_FOODS)) : null), [recipes, food, version]);
  // No grams yet: one serving of the recipe
  const servings = view ? (portionGrams > 0 ? servingsOf(portionGrams, view.servingGrams) : 1) : 0;
  const parts = useMemo(() => (view ? editParts(view, typed, added, swaps) : []), [view, typed, added, swaps]);
  const editable = canEditParts(parts);
  const totals = useMemo(() => editTotals(parts, servings), [parts, servings]);
  const edited = editable && isEdited(parts);

  const edit = useMemo<DishEdit | null>(
    () => (editable ? { edited, grams: totals.grams, per100: totals.per100, save: () => saveEditedDish(food, totals.ingredients) } : null),
    [editable, edited, totals, food]
  );
  useEffect(() => {
    onEdit(edit);
  }, [edit, onEdit]);
  useEffect(() => () => onEdit(null), [onEdit]);

  const setGrams = useCallback(
    (part: EditPart, grams: number) => {
      const shown = partGrams(part, servings);
      if (Math.abs(grams - shown) < 0.05) return;
      setTyped((prev) => ({ ...prev, [part.key]: servings > 0 ? Math.round((grams / servings) * 1000) / 1000 : 0 }));
    },
    [servings]
  );
  const restore = () => {
    setTyped({});
    setAdded([]);
    setSwaps({});
  };
  // Choosing the recipe's own food again takes the swap away
  const swap = (part: EditPart, choice: string) =>
    setSwaps((prev) => {
      const next = { ...prev, [part.key]: choice };
      if (choice === part.key) delete next[part.key];
      return next;
    });

  const shown = !!view && view.parts.length > 0;
  // Recipes that arrive after the sheet opened: the block grows open (Expand) instead of pushing the button in one frame
  // (-mt-4 / pt-4: the sheet's 16 px column gap moves inside, so it grows with the block)
  if (!shown) return <Expand open={false} wrapClassName="-mt-4" className="pt-4">{null}</Expand>;

  const toggle = (label: string) => setAdded((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));
  const totalKcal = calculateMacroPreview(totals.per100, totals.grams).calories;

  return (
    <Expand open wrapClassName="-mt-4" className="pt-4">
      <div
        role="group"
        aria-label="Thành phần"
        data-tour="dish-parts"
        data-align-group="portion"
        data-align-edge="left"
        className="flex w-full flex-col gap-3"
      >
        <div className="flex w-full flex-col rounded-2xl border border-card-border bg-card">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              setOpen(!open);
              try {
                window.localStorage.setItem(PARTS_OPEN_KEY, open ? "0" : "1");
              } catch {
                // Storage unavailable
              }
            }}
            className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent px-4 text-left text-text"
          >
            <span className="text-callout font-bold">Thành phần</span>
            <span className="flex items-center gap-2 text-cap text-secondary">
              {edited ? "Đã chỉnh" : `${parts.length} nguyên liệu`}
              <svg className="m-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>
          <Expand open={open} id={panelId}>
            <Expand open={edited}>
              <div className="flex min-h-11 items-center justify-between gap-3 border-t border-divider px-4 text-cap text-secondary">
                <span>Đã chỉnh so với công thức</span>
                <button type="button" onClick={restore} className="flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-cap font-bold text-cobalt">
                  Khôi phục
                </button>
              </div>
            </Expand>
            <ul className="m-0 flex list-none flex-col p-0">
              {parts.map((part) => {
                const grams = partGrams(part, servings);
                const kcal = kcalOf(part, grams);
                // An add-on can share a name with a part of the recipe (more beef): it says it was put in
                const label = part.added ? `${part.name} (thêm)` : part.name;
                return (
                  <li
                    key={part.key}
                    data-align-group="dish-parts"
                    className={`grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-t border-divider px-4 py-2 text-cap ${editable && grams <= 0 ? "opacity-60" : ""}`}
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="break-words font-semibold leading-snug text-text">{label}</span>
                      <span className="tabular-nums text-secondary" aria-label={kcal === null && grams > 0 ? "chưa có dữ liệu năng lượng" : undefined}>
                        {grams <= 0 ? "Không dùng" : kcal === null ? "—" : `${kcalValue(kcal)} kcal`}
                      </span>
                    </span>
                    {editable ? (
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Giảm ${EDIT_STEP_GRAMS} g ${label}`}
                          disabled={grams <= 0}
                          onClick={() => setGrams(part, Math.max(0, Math.round((grams - EDIT_STEP_GRAMS) * 10) / 10))}
                          className={stepClass}
                        >
                          −
                        </button>
                        <GramField name={label} grams={grams} onChange={(g) => setGrams(part, g)} />
                        <button
                          type="button"
                          aria-label={`Tăng ${EDIT_STEP_GRAMS} g ${label}`}
                          onClick={() => setGrams(part, Math.round((grams + EDIT_STEP_GRAMS) * 10) / 10)}
                          className={stepClass}
                        >
                          +
                        </button>
                      </span>
                    ) : (
                      <span className="text-right tabular-nums text-secondary">{formatAmount(grams, "g")} g</span>
                    )}
                    {editable && part.options.length > 1 && (
                      <label className="col-span-2 mt-2 flex min-h-11 items-center justify-between gap-3 text-secondary">
                        <span>Đổi nguyên liệu</span>
                        <select
                          aria-label={`Đổi nguyên liệu ${part.options[0].name}`}
                          value={part.choice}
                          onChange={(e) => swap(part, e.target.value)}
                          className="h-11 min-w-0 max-w-[70%] flex-1 cursor-pointer rounded-xl border-0 bg-surface px-3 text-cap font-semibold text-text focus-visible:outline-2 focus-visible:outline-cobalt"
                        >
                          {part.options.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </li>
                );
              })}
              {editable && (
                <li data-align-group="dish-parts" className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-t border-divider px-4 py-2 text-cap font-bold text-text">
                  <span>Tổng</span>
                  <span className="tabular-nums">
                    {formatAmount(totals.grams, "g")} g{typeof totalKcal === "number" ? ` · ${kcalValue(totalKcal)} kcal` : ""}
                  </span>
                </li>
              )}
            </ul>
          </Expand>
        </div>
        {editable && view.addOns.length > 0 && (
          <ChipGroup
            data-align-group="portion"
            columns={view.addOns.length}
            items={view.addOns.map((a) => {
              const { grams } = scaledAddOn(a, servings);
              return {
                id: a.label,
                label: `${a.label} ${formatAmount(grams, "g")} g`,
                active: added.includes(a.label),
                onClick: () => toggle(a.label),
              };
            })}
          />
        )}
      </div>
    </Expand>
  );
}
