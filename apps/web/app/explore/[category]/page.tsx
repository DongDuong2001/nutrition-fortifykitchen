"use client";

import React from "react";
import { notFound, useParams } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { PillButton } from "@/components/ui/pill-button";
import { FoodListCard } from "@/components/foods/food-list-card";
import { MOCK_FOODS } from "@/lib/mock/foods";
import { FOOD_CATEGORIES, categoryOf } from "@/lib/food-categories";
import { useBack } from "@/hooks/use-back";

/** One food category, a pushed screen of Khám phá. */
export default function ExploreCategoryPage() {
  const params = useParams<{ category: string }>();
  const goBack = useBack();
  const category = FOOD_CATEGORIES.find((c) => c.key === params?.category);
  if (!category) notFound();

  const foods = MOCK_FOODS.filter((f) => categoryOf(f) === category.key).map((food) => ({ food }));

  return (
    <AppShell>
      <AppHeader variant="sub" title={category.label} subtitle={`${foods.length} món`} onBack={goBack} layout="wide" />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8">
        <FoodListCard
          foods={foods}
          empty={
            <div className="flex flex-col gap-3 py-2">
              <p className="m-0 text-[13px] leading-snug text-secondary">
                Chưa có món nào trong nhóm này. Tạo món mới để ghi món tự nấu hoặc món không có trong danh sách.
              </p>
              <PillButton variant="secondary" href="/foods/new">
                Tạo món mới
              </PillButton>
            </div>
          }
        />
      </main>
    </AppShell>
  );
}
