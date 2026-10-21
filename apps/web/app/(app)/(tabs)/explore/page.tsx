"use client";

import React, { createContext, useContext, useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { CreateFoodButton } from "@/components/foods/create-food-button";
import { ChipGroup } from "@/components/ui/chip-group";
import { IconTile } from "@/components/ui/icon-tile";
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
  return <FoodSearchField value={query} onChange={setQuery} className="border-transparent! bg-card! shadow-field lg:max-w-[656px]" />;
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
              <p className="m-0 text-cap leading-snug text-secondary">
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
 * Khám phá (IA v2, V3): find a food and understand it. The large title, the search field, then Đồ ăn của Minh Hào, Món
 * giàu vi chất, Nhóm món, Gần đây and Của bạn. A group or a rich-in list is a pushed screen; a food opens its detail.
 * From 1024 px the category chips take the place of Nhóm món (the desktop layout is unchanged).
 */
export default function ExplorePage() {
  const router = useRouter();

  // Sample coaches and ranking exist in mock and demo mode only (no mock data in live mode)
  const demoChips = coachingAvailable(isLiveMode())
    ? [
        { id: "coaches", label: "Huấn luyện viên", onClick: () => router.push("/explore/coaches") },
        { id: "leaderboard", label: "Bảng xếp hạng", onClick: () => router.push("/explore/leaderboard") },
      ]
    : [];
  const chips = [
    { id: "all", label: "Tất cả", active: true, icon: <IconTile k="all" size={20} /> },
    ...demoChips,
    ...FOOD_CATEGORIES.map((c) => ({
      id: c.key,
      label: c.label,
      icon: <IconTile k={c.key} size={20} />,
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

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 lg:mx-0 lg:max-w-[1240px] lg:px-8 lg:pt-4">
        {/* Phone: the groups are Nhóm món below, so only the demo shortcuts stay as chips; desktop: the whole row */}
        {demoChips.length > 0 && (
          <div className="lg:hidden">
            <ChipGroup scroll items={demoChips} ariaLabel="Huấn luyện viên và bảng xếp hạng" data-align-group="explore-demo" data-align-edge="left" />
          </div>
        )}
        <div className="max-lg:hidden">
          <ChipGroup scroll items={chips} ariaLabel="Lọc món theo nhóm" data-align-group="add-list" data-align-edge="left" />
        </div>
        <div data-align-group="add-list" data-align-edge="left" className="flex flex-col gap-4">
          <Results />
        </div>
      </main>
    </QueryProvider>
  );
}
