"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { QuickAddRow } from "@/components/add/quick-add-row";
import { SavedMealManageSheet } from "@/components/explore/saved-meal-manage-sheet";
import { useDiary } from "@/lib/diary-store";
import { MOCK_FOODS } from "@/lib/mock/foods";
import { formatAmount } from "@/lib/format";
import { getMealSlotNameVi } from "@/lib/meal-slot";
import { useMealSlot } from "@/lib/use-meal-slot";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { savedMealTotals, type SavedMeal } from "@/lib/saved-meals";

function MoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="19" cy="12" r="1.9" />
    </svg>
  );
}

/**
 * Bữa ăn của tôi in Khám phá: each saved meal is one tap that adds every food to the meal of the time of day
 * (one undo toast removes them all). The ⋯ renames or deletes it. `limit` shows the newest few with a link to all.
 */
export function SavedMealsCard({ limit }: { limit?: number }) {
  const { savedMeals, addSavedMeal, renameSavedMeal, deleteSavedMeal, hydrated } = useDiary();
  const slot = useMealSlot(null);
  // The card stays on screen after a tap, and each add replaces the toast (and its undo): a short lock stops a double tap
  const lock = useRef(false);
  const addOnce = (meal: SavedMeal) => {
    if (lock.current || !slot) return;
    lock.current = true;
    addSavedMeal(meal, slot);
    setTimeout(() => {
      lock.current = false;
    }, 600);
  };
  const [managedId, setManagedId] = useState<string | null>(null);

  // The foods of a saved meal are looked up in the catalogue, which may still be on its way
  const { version: catalogVersion } = useCatalogFoods();
  const rows = useMemo(
    () => savedMeals.map((meal) => ({ meal, ...savedMealTotals(meal, MOCK_FOODS) })).filter((r) => r.itemCount > 0),
    [savedMeals, catalogVersion]
  );
  const shown = limit ? rows.slice(0, limit) : rows;
  const managed = rows.find((r) => r.meal.id === managedId) ?? null;
  const slotName = slot ? getMealSlotNameVi(slot) : null;

  return (
    <Card as="section" aria-labelledby="explore-saved-meals" className="flex flex-col gap-1">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <SectionTitle id="explore-saved-meals">Bữa ăn của tôi</SectionTitle>
        {limit && rows.length > limit && (
          <Link href="/explore/meals" className="flex min-h-11 items-center text-cap font-bold text-cobalt no-underline">
            Xem tất cả ({rows.length})
          </Link>
        )}
      </div>

      {!hydrated ? (
        <div aria-hidden="true" className="h-[52px] rounded-xl bg-level-empty motion-safe:animate-pulse" />
      ) : shown.length === 0 ? (
        <p className="m-0 py-2 text-cap leading-snug text-secondary">
          Chưa có Bữa ăn của tôi. Mở ⋯ ở một bữa trên Hôm nay và chọn Lưu thành Bữa ăn của tôi.
        </p>
      ) : (
        <>
          {slotName && <p className="m-0 text-cap leading-snug text-secondary">Một chạm thêm cả bữa vào {slotName}.</p>}
          {shown.map(({ meal, itemCount, kcal }, i) => (
            <QuickAddRow
              key={meal.id}
              name={meal.name}
              meta={`${itemCount} món · ${formatAmount(kcal, "kcal")} kcal`}
              addLabel={`Thêm ${meal.name}, ${itemCount} món${slotName ? ` vào ${slotName}` : ""}`}
              onAdd={() => addOnce(meal)}
              withBorderTop={i > 0}
              trailing={
                <button
                  type="button"
                  aria-label={`Tùy chọn ${meal.name}`}
                  aria-haspopup="dialog"
                  onClick={() => setManagedId(meal.id)}
                  className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-text hover:bg-divider active:scale-[0.97] transition-press motion-reduce:active:scale-100"
                >
                  <MoreIcon />
                </button>
              }
            />
          ))}
        </>
      )}

      <SavedMealManageSheet
        open={managed !== null}
        onClose={() => setManagedId(null)}
        name={managed?.meal.name ?? ""}
        itemCount={managed?.itemCount ?? 0}
        onRename={(name) => managed && renameSavedMeal(managed.meal.id, name)}
        onDelete={() => managed && deleteSavedMeal(managed.meal.id)}
      />
    </Card>
  );
}
