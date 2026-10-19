"use client";

import React, { createContext, useContext, useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { CreateFoodButton } from "@/components/foods/create-food-button";
import { ChipRow } from "@/components/foods/chip-row";
import { FoodListCard } from "@/components/foods/food-list-card";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { ExploreSections } from "@/components/explore/explore-sections";
import { CatalogNote, CatalogStatus } from "@/components/foods/catalog-status";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { searchRows } from "@/lib/food-rows";
import { FOOD_CATEGORIES, categoryLabel, categoryOf } from "@/lib/food-categories";
import { coachingAvailable } from "@/lib/coaching-link";
import { isLiveMode } from "@/lib/api-mode";

// cc-58: the query lives in this small provider, not in the page: typing re-renders the field and the results, not the
// header, the chips or the page itself (the provider's children are the same elements on every keystroke)
const QueryContext = createContext<{ query: string; setQuery: (query: string) => void }>({ query: "", setQuery: () => {} });

function QueryProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <QueryContext.Provider value={value}>{children}</QueryContext.Provider>;
}

function SearchField() {
  const { query, setQuery } = useContext(QueryContext);
  return <FoodSearchField value={query} onChange={setQuery} className="bg-surface lg:max-w-[656px]" />;
}

/** Search results, or the sections when nothing is typed. The field keeps up with the keys; this follows when it can. */
function Results() {
  const { query } = useContext(QueryContext);
  const searched = useDeferredValue(query);
  const searching = searched.trim().length > 0;
  const { foods, pending, failed, retry } = useCatalogFoods();
  const results = useMemo(() => searchRows(foods, searched), [searched, foods]);
  const waiting = results.length === 0 && (pending || failed);
  if (!searching) return <ExploreSections />;
  return (
    <>
      {pending && results.length > 0 && <CatalogNote />}
      <FoodListCard
        title={`Kết quả cho “${searched.trim()}”`}
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
  );
}

/**
 * Khám phá (IA v2): find a food and understand it. Search, the category chips, then Gần đây, Yêu thích,
 * Món của tôi and the "Giàu …" lists. A category or a rich-in list is a pushed screen; a food opens its detail.
 */
export default function ExplorePage() {
  const router = useRouter();

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
    <QueryProvider>
      <AppHeader
        variant="tab"
        title="Khám phá"
        subtitle="Tìm món, lọc theo nhóm, hoặc xem món giàu vi chất"
        layout="wide"
        alignGroup="explore-header"
        search={<SearchField />}
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:px-8">
        <ChipRow items={chips} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />
        <div data-align-group="add-list" data-align-edge="left" className="flex flex-col gap-4">
          <Results />
        </div>
      </main>
    </QueryProvider>
  );
}
