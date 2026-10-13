"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { PillButton } from "@/components/ui/pill-button";
import { ChipRow } from "@/components/foods/chip-row";
import { FoodListCard } from "@/components/foods/food-list-card";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { ExploreSections } from "@/components/explore/explore-sections";
import { browsableFoods } from "@/lib/mock/foods";
import { useDiary } from "@/lib/diary-store";
import { searchFoods } from "@/lib/search";
import { FOOD_CATEGORIES, categoryLabel, categoryOf } from "@/lib/food-categories";

/**
 * Khám phá (IA v2): find a food and understand it. Search, the 10 category chips, then Gần đây, Yêu thích,
 * Món của tôi and the "Giàu …" lists. A category or a rich-in list is a pushed screen; a food opens its detail.
 */
export default function ExplorePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const { demo } = useDiary();
  const results = useMemo(() => searchFoods(browsableFoods(), query), [query, demo]);

  const chips = [
    { id: "all", label: "Tất cả", active: true },
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
        search={<FoodSearchField value={query} onChange={setQuery} className="bg-page lg:max-w-[656px]" />}
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8">
        <ChipRow items={chips} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />
        <div data-align-group="add-list" data-align-edge="left" className="flex flex-col gap-4">
          {searching ? (
            <>
              <FoodListCard
                title={`Kết quả cho “${query.trim()}”`}
                foods={results.map((food) => ({ food }))}
                withCategory={(food) => categoryLabel(categoryOf(food))}
                empty={
                  <div className="flex flex-col gap-3 py-2">
                    <p className="m-0 text-[13px] leading-snug text-secondary">
                      Không có món nào khớp. Thử từ ngắn hơn, bỏ dấu, hoặc tạo món mới.
                    </p>
                    <PillButton variant="secondary" href="/foods/new">
                      Tạo món mới
                    </PillButton>
                  </div>
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
