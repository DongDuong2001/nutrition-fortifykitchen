"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Carousel } from "@/components/ui/carousel";
import { FoodCardLink } from "@/components/foods/food-card-link";
import { SourceTag } from "@/components/foods/source-tag";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import type { FoodItem } from "@/lib/catalog";
import { foodRowKcal } from "@/lib/food-meta";
import { rowName } from "@/lib/food-rows";
import { MINH_HAO_LABEL, MINH_HAO_SLUG, fortifyKitchenFoods } from "@/lib/fortify-kitchen";

const SHOWN = 8;

/** The card's second line: the food's first portion and its kcal ("1 phần lẻ (150 g sống) · 205 kcal"). */
export const minhHaoMeta = (food: FoodItem): { meta: string; kcal?: string } => {
  const portion = food.servings[0]?.label ?? "100 g";
  const kcal = foodRowKcal(food);
  // The kcal is the bold link-coloured part (V3); a food without energy says so in plain text
  return kcal ? { meta: portion, kcal } : { meta: `${portion} · Chưa có kcal` };
};

/**
 * "Đồ ăn của Minh Hào" (Hao 21/10): the catalogue's Fortify Kitchen foods as a carousel near the top of Khám phá, one card
 * per food, "Xem tất cả" to /explore/minh-hao. Hidden when the catalogue has none; a skeleton while the live
 * catalogue is on its way.
 */
export function MinhHaoCarousel() {
  const { foods, pending } = useCatalogFoods();
  const rows = useMemo(() => fortifyKitchenFoods(foods), [foods]);

  if (rows.length === 0) {
    return pending ? (
      <section aria-label={MINH_HAO_LABEL} aria-busy="true" className="flex flex-col">
        <div aria-hidden="true" className="flex min-h-11 items-center">
          <div className="h-4 w-36 rounded bg-level-empty motion-safe:animate-pulse" />
        </div>
        <div aria-hidden="true" className="-mx-4 flex gap-3 overflow-hidden px-4 pb-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[88px] w-[11rem] shrink-0 rounded-card bg-level-empty motion-safe:animate-pulse" />
          ))}
        </div>
      </section>
    ) : null;
  }

  return (
    <Carousel
      title={MINH_HAO_LABEL}
      id="explore-minh-hao"
      action={
        <Link href={`/explore/${MINH_HAO_SLUG}`} className="flex min-h-11 shrink-0 items-center text-cap font-bold text-cobalt no-underline">
          Xem tất cả
        </Link>
      }
    >
      {rows.slice(0, SHOWN).map((food) => (
        <FoodCardLink key={food.id} href={`/foods/${food.id}`} name={rowName(food)} {...minhHaoMeta(food)} tag={<SourceTag food={food} />} />
      ))}
    </Carousel>
  );
}
