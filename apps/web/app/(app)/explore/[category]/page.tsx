"use client";

import React from "react";
import { notFound, useParams } from "next/navigation";
import { IconTile } from "@/components/ui/icon-tile";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { CreateFoodButton } from "@/components/foods/create-food-button";
import { FoodListCard } from "@/components/foods/food-list-card";
import { CatalogNote, CatalogStatus } from "@/components/foods/catalog-status";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { FOOD_CATEGORIES, categoryOf, isOwnFood } from "@/lib/food-categories";
import { foodGroupAccent, foodGroupText } from "@/lib/food-group-colors";
import { MINH_HAO_LABEL, MINH_HAO_SLUG, fortifyKitchenFoods } from "@/lib/fortify-kitchen";
import { collapseTwins } from "@/lib/food-rows";
import { useBack } from "@/hooks/use-back";

/** The 4 × 28 px accent bar before a title. */
function AccentBar({ color }: { color: string }) {
  return <span aria-hidden="true" className="h-7 w-1 shrink-0 rounded-sm" style={{ background: color }} />;
}

/** One food category, or Đồ ăn của Minh Hào (/explore/minh-hao): a pushed screen of Khám phá. */
export default function ExploreCategoryPage() {
  const params = useParams<{ category: string }>();
  const goBack = useBack();
  const minhHao = params?.category === MINH_HAO_SLUG;
  const category = minhHao ? undefined : FOOD_CATEGORIES.find((c) => c.key === params?.category);
  const { foods: catalogue, pending, failed, retry } = useCatalogFoods();
  if (!category && !minhHao) notFound();

  // Fortify Kitchen's rows are plain foods, each its own row: no raw / cooked twins to fold
  const foods = (
    minhHao
      ? fortifyKitchenFoods(catalogue)
      : collapseTwins(catalogue.filter((f) => (category?.key === "cua_toi" ? isOwnFood(f) : categoryOf(f) === category?.key)))
  ).map((food) => ({ food }));
  // The live catalogue is not here yet, or did not come: say so, never "Chưa có món nào"
  const waiting = foods.length === 0 && (pending || failed);
  // V3: the group's colour marks its page: the bar and the tile before the title, the kcal of every row
  const groupKey = minhHao ? "minh_hao" : (category?.key ?? "all");

  return (
    <AppShell>
      <AppHeader
        variant="sub"
        layout="wide"
        title={category?.label ?? MINH_HAO_LABEL}
        subtitle={waiting ? (failed ? "Chưa tải được món" : "Đang tải món…") : `${foods.length} món`}
        onBack={goBack}
        lead={
          <>
            <AccentBar color={foodGroupAccent(groupKey)} />
            <IconTile k={groupKey} size={36} />
          </>
        }
      />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:px-8">
        {pending && foods.length > 0 && <CatalogNote />}
        <FoodListCard
          foods={foods}
          valueColor={foodGroupText(groupKey)}
          empty={
            waiting ? (
              <CatalogStatus failed={failed} onRetry={retry} />
            ) : minhHao ? (
              <p className="m-0 py-2 text-cap leading-snug text-secondary">Chưa có món nào của Fortify Kitchen.</p>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                <p className="m-0 text-cap leading-snug text-secondary">
                  Chưa có món nào trong nhóm này. Tạo món mới để ghi món tự nấu hoặc món không có trong danh sách.
                </p>
                <CreateFoodButton href="/foods/new" helper={null} />
              </div>
            )
          }
        />
      </main>
    </AppShell>
  );
}
