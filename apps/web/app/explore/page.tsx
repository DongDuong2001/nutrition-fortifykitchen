"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { ChipRow } from "@/components/foods/chip-row";
import { FoodEmptyState } from "@/components/foods/food-empty-state";
import { FoodList } from "@/components/foods/food-list";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { useFoodBrowse } from "@/hooks/use-food-browse";
import { foodMeta } from "@/lib/food-meta";

/** Khám phá (v1, step 1 of IA v2): the food search and category list from the add sheet. A food opens its detail. */
export default function ExplorePage() {
  const router = useRouter();
  const { query, setQuery, filter, setFilter, list, filterItems, categoryName, isFavouriteFood, similarFoods, noFavourites } =
    useFoodBrowse();
  const openFood = (id: string) => router.push(`/foods/${id}`);

  return (
    <AppShell alignContainer="add-list">
        <AppHeader variant="tab" title="KHÁM PHÁ" layout="wide" alignGroup="explore-header" />

        <main className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pb-6 pt-3.5 lg:mx-0 lg:max-w-[720px] lg:px-8">
          <div className="flex flex-col gap-3.5 rounded-[18px] border border-card-border bg-card p-4">
            <FoodSearchField value={query} onChange={setQuery} />
            <ChipRow items={filterItems} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />
            <FoodList
              list={list}
              onPick={(food) => openFood(food.id)}
              getMeta={foodMeta}
              categoryName={categoryName}
              isFavourite={isFavouriteFood}
              empty={
                <FoodEmptyState
                  query={query}
                  filter={filter}
                  noFavourites={noFavourites}
                  similarFoods={similarFoods}
                  getMeta={foodMeta}
                  onPickSimilar={(food) => openFood(food.id)}
                  onClearFilter={() => setFilter("all")}
                  newFoodHref="/foods/new"
                />
              }
            />
          </div>
        </main>
    </AppShell>
  );
}
