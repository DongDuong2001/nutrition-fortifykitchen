"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { SavedMealManageSheet } from "@/components/explore/saved-meal-manage-sheet";
import { useDiary } from "@/lib/diary-store";
import { CATALOG_FOODS } from "@/lib/catalog";
import { formatAmount } from "@/lib/format";
import { getMealSlotNameVi } from "@/lib/meal-slot";
import { useMealSlot } from "@/lib/use-meal-slot";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { savedMealTotals, type SavedMeal } from "@/lib/saved-meals";
import { IconButton } from "@/components/ui/icon-button";
import { HOME_ROUTE } from "@/lib/home-route";

function MoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="19" cy="12" r="1.9" />
    </svg>
  );
}

/** The saved meals that still have foods, newest first, with their item count and kcal (a meal whose foods are gone is left out). */
export function useSavedMealRows() {
  const { savedMeals } = useDiary();
  // The foods of a saved meal are looked up in the catalogue, which may still be on its way
  const { version: catalogVersion } = useCatalogFoods();
  return useMemo(
    () => savedMeals.map((meal) => ({ meal, ...savedMealTotals(meal, CATALOG_FOODS) })).filter((r) => r.itemCount > 0),
    [savedMeals, catalogVersion]
  );
}

/**
 * Bữa ăn của tôi (the pushed screen /explore/meals; Khám phá shows it as a row of Của bạn): each saved meal is one tap that adds every food to the meal of the time of day
 * (one undo toast removes them all). The ⋯ renames or deletes it. `limit` shows the newest few with a link to all.
 */
export function SavedMealsCard({ limit }: { limit?: number }) {
  const { addSavedMeal, renameSavedMeal, deleteSavedMeal, hydrated } = useDiary();
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

  const rows = useSavedMealRows();
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
        <div className="flex flex-col items-center gap-2 px-2 pb-4 pt-6 text-center">
          <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-secondary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1z" />
            </svg>
          </span>
          <p className="m-0 text-callout font-semibold">Chưa có Bữa ăn của tôi</p>
          <p className="m-0 text-cap leading-snug text-secondary">Mở ⋯ ở một bữa trên Hôm nay và chọn Lưu thành Bữa ăn của tôi.</p>
          <Link href={HOME_ROUTE} className="flex min-h-11 items-center gap-1 text-cap font-bold text-cobalt no-underline">
            Mở Hôm nay
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      ) : (
        <>
          {slotName && <p className="m-0 text-cap leading-snug text-secondary">Một chạm thêm cả bữa vào {slotName}.</p>}
          {shown.map(({ meal, itemCount, kcal }, i) => (
            <div key={meal.id} data-align-group="saved-meals" className={`flex items-center gap-1 ${i > 0 ? "border-t border-divider" : ""}`}>
              <button
                type="button"
                onClick={() => addOnce(meal)}
                aria-label={`Thêm ${meal.name}, ${itemCount} món${slotName ? ` vào ${slotName}` : ""}`}
                className="flex min-h-[52px] min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent py-2 text-left text-text m-tint transition-press"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="line-clamp-2 text-callout font-semibold leading-snug">
                    <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full bg-cobalt align-[1px]" />
                    {meal.name}
                  </span>
                  <span className="line-clamp-2 text-cap leading-tight text-secondary tabular-nums">
                    {itemCount} món · <span className="font-bold text-cobalt">{formatAmount(kcal, "kcal")} kcal</span>
                  </span>
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-cobalt" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <IconButton label={`Tùy chọn ${meal.name}`} aria-haspopup="dialog" onClick={() => setManagedId(meal.id)} className="text-text hover:bg-divider">
                <MoreIcon />
              </IconButton>
            </div>
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
