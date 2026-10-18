"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { CreateFoodButton } from "@/components/foods/create-food-button";
import { ChipRow } from "@/components/foods/chip-row";
import { FoodListCard } from "@/components/foods/food-list-card";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { ExploreSections } from "@/components/explore/explore-sections";
import { CatalogNote, CatalogStatus } from "@/components/foods/catalog-status";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { searchFoods } from "@/lib/search";
import { FOOD_CATEGORIES, categoryLabel, categoryOf } from "@/lib/food-categories";
import { coachingAvailable } from "@/lib/coaching-link";
import { isLiveMode } from "@/lib/api-mode";

/**
 * Khám phá (IA v2): find a food and understand it. Search, the category chips, then Gần đây, Yêu thích,
 * Món của tôi and the "Giàu …" lists. A category or a rich-in list is a pushed screen; a food opens its detail.
 */
export default function ExplorePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const { foods, pending, failed, retry } = useCatalogFoods();
  const results = useMemo(() => searchFoods(foods, query), [query, foods]);
  const waiting = results.length === 0 && (pending || failed);

  const chips = [
    { id: "all", label: "Tất cả", active: true },
    // Sample coaches and ranking exist in mock and demo mode only (no mock data in live mode)
    ...(coachingAvailable(isLiveMode())
      ? [
          { id: "coaches", label: "Huấn luyện viên", onClick: () => router.push("/explore/coaches") },
          { id: "leaderboard", label: "Bảng xếp hạng", onClick: () => router.push("/explore/leaderboard") },
        ]
      : []),
    ...FOOD_CATEGORIES.map((c) => ({
      id: c.key,
      label: c.label,
      onClick: () => router.push(`/explore/${c.key}`),
    })),
  ];

  return (
    <AppShell alignContainer="add-list">
      <AppHeader
        variant="tab"
        title="Khám phá"
        subtitle="Tìm món, lọc theo nhóm, hoặc xem món giàu vi chất"
        layout="wide"
        alignGroup="explore-header"
        search={<FoodSearchField value={query} onChange={setQuery} className="bg-surface lg:max-w-[656px]" />}
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:px-8">
        <ChipRow items={chips} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />
        <div data-align-group="add-list" data-align-edge="left" className="flex flex-col gap-4">
          {searching ? (
            <>
              {pending && results.length > 0 && <CatalogNote />}
              <FoodListCard
                title={`Kết quả cho “${query.trim()}”`}
                foods={results.map((food) => ({ food }))}
                withCategory={(food) => categoryLabel(categoryOf(food))}
                empty={
                  waiting ? (
                    <CatalogStatus failed={failed} onRetry={retry} />
                  ) : (
                    <div className="flex flex-col gap-3 py-2">
                      <p className="m-0 text-[13px] leading-snug text-secondary">
                        Không có món nào khớp. Thử từ ngắn hơn, bỏ dấu, hoặc tạo món mới.
                      </p>
                      <CreateFoodButton href="/foods/new" helper={null} />
                    </div>
                  )
                }
              />
            </>
          ) : (
            <ExploreSections />
          )}
        </div>
      </main>
    </AppShell>
  );
}
