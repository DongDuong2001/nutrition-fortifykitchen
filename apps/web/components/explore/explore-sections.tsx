"use client";

import React from "react";
import { useDiary } from "@/lib/diary-store";
import { MOCK_FOODS } from "@/lib/mock/foods";
import { resolveFavourites } from "@/lib/favourites";
import { resolveRecent } from "@/lib/recent-foods";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { PillButton } from "@/components/ui/pill-button";
import { FoodListCard } from "@/components/foods/food-list-card";
import { isOwnFood } from "@/lib/food-categories";
import { RICH_NUTRIENT_IDS, richName } from "@/lib/rich-in";
import { getNutrientDefinition } from "@/lib/nutrients";
import { FoodRowLink } from "@/components/foods/food-row-link";
import { SavedMealsCard } from "@/components/explore/saved-meals-card";

const SHOWN = 3;
const SHOWN_MEALS = 3;

/** Gần đây, Yêu thích, Món của tôi and the "Giàu …" index: the Khám phá home when nothing is searched. */
export function ExploreSections() {
  const { recentFoods, favouriteIds, demo } = useDiary();

  const recents = recentFoods
    .flatMap((r) => {
      const resolved = resolveRecent(r, MOCK_FOODS);
      return resolved ? [resolved] : [];
    })
    .slice(0, SHOWN)
    .map(({ food, grams, label }) => ({ food, grams, label }));

  const favourites = resolveFavourites(favouriteIds, MOCK_FOODS);
  // The catalogue holds one sample user food (Bột củ dền): a new account owns nothing until it creates a food
  const mine = demo ? MOCK_FOODS.filter(isOwnFood) : [];

  return (
    <>
      <FoodListCard
        title="Gần đây"
        foods={recents}
        empty={<p className="m-0 py-3 text-[13px] leading-snug text-secondary">Món bạn vừa ghi sẽ hiện ở đây.</p>}
      />

      <FoodListCard
        title="Yêu thích"
        foods={favourites.map((food) => ({ food }))}
        empty={<p className="m-0 py-3 text-[13px] leading-snug text-secondary">Chưa có món yêu thích. Bấm ♡ ở trang chi tiết món để lưu.</p>}
      />

      <SavedMealsCard limit={SHOWN_MEALS} />

      <Card as="section" aria-labelledby="explore-mine" className="flex flex-col gap-3">
        <SectionTitle id="explore-mine">Món của tôi</SectionTitle>
        {mine.length > 0 ? (
          <div className="flex flex-col">
            {mine.map((food, i) => (
              <FoodRowLink key={food.id} href={`/foods/${food.id}`} name={food.nameVi} meta="Của tôi" withBorderTop={i > 0} />
            ))}
          </div>
        ) : (
          <p className="m-0 text-[13px] leading-snug text-secondary">
            Chưa có món nào. Tạo món mới để ghi món tự nấu hoặc món không có trong danh sách.
          </p>
        )}
        <PillButton variant="secondary" href="/foods/new">
          Tạo món mới
        </PillButton>
      </Card>

      <Card as="section" aria-labelledby="explore-rich" className="flex flex-col gap-1">
        <SectionTitle id="explore-rich" className="flex min-h-[44px] items-center">
          Món giàu vi chất
        </SectionTitle>
        {RICH_NUTRIENT_IDS.map((id) => (
          <FoodRowLink
            key={id}
            href={`/explore/rich/${id}`}
            name={`Giàu ${richName(getNutrientDefinition(id)?.nameVi ?? id)}`}
            meta="Xếp theo mỗi 100 g hoặc mỗi khẩu phần"
          />
        ))}
      </Card>
    </>
  );
}

