"use client";

import React, { useMemo } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { FoodListCard } from "@/components/foods/food-list-card";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { useDiary } from "@/lib/diary-store";
import { CATALOG_FOODS } from "@/lib/catalog";
import { resolveFavourites } from "@/lib/favourites";
import { dedupeTwins } from "@/lib/food-rows";
import { useBack } from "@/hooks/use-back";

/** Yêu thích: the foods saved with ♡, in the order they were saved. A pushed screen under Khám phá (the "Của bạn" row). */
export default function FavouritesPage() {
  const goBack = useBack();
  const { favouriteIds, hydrated } = useDiary();
  // The foods are looked up in the catalogue, which may still be on its way
  const { foods: catalogue } = useCatalogFoods();
  const favourites = useMemo(() => dedupeTwins(resolveFavourites(favouriteIds, CATALOG_FOODS), (f) => f), [favouriteIds, catalogue]);
  return (
    <AppShell>
      <AppHeader variant="sub" title="Yêu thích" subtitle={hydrated ? `${favourites.length} món` : undefined} onBack={goBack} layout="wide" />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:px-8">
        <FoodListCard
          foods={favourites.map((food) => ({ food }))}
          empty={<p className="m-0 py-2 text-cap leading-snug text-secondary">Chưa có món yêu thích. Bấm ♡ ở trang chi tiết món để lưu.</p>}
        />
      </main>
    </AppShell>
  );
}
