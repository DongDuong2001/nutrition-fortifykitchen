"use client";

import React from "react";
import { useDiary } from "@/lib/diary-store";
import { MOCK_FOODS, browsableFoods } from "@/lib/mock/foods";
import { resolveFavourites } from "@/lib/favourites";
import { resolveRecent } from "@/lib/recent-foods";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { CreateFoodButton } from "@/components/foods/create-food-button";
import { Carousel } from "@/components/ui/carousel";
import { FoodCardLink } from "@/components/foods/food-card-link";
import { RichCarousel } from "@/components/explore/rich-carousel";
import { foodRowKcal, foodRowMeta } from "@/lib/food-meta";
import { isOwnFood } from "@/lib/food-categories";
import { FoodRowLink } from "@/components/foods/food-row-link";
import { SavedMealsCard } from "@/components/explore/saved-meals-card";

const SHOWN = 8;
const SHOWN_MEALS = 3;

/** Gần đây, Yêu thích, Món của tôi and the "Giàu …" index: the Khám phá home when nothing is searched. */
export function ExploreSections() {
  const { recentFoods, favouriteIds } = useDiary();

  const recents = recentFoods
    .flatMap((r) => {
      const resolved = resolveRecent(r, MOCK_FOODS);
      return resolved ? [resolved] : [];
    })
    .slice(0, SHOWN)
    .map(({ food, grams, label }) => ({ food, grams, label }));

  const favourites = resolveFavourites(favouriteIds, MOCK_FOODS);
  // The sample user food (Bột củ dền) is demo-only: a new account owns nothing until it creates a food
  const mine = browsableFoods().filter(isOwnFood);

  return (
    <>
      <RichCarousel />

      {recents.length > 0 ? (
        <Carousel title="Gần đây">
          {recents.map(({ food, grams, label }) => (
            <FoodCardLink
              key={`${food.id}|${label}`}
              href={`/foods/${food.id}`}
              name={food.nameVi}
              meta={`${label}${foodRowKcal(food, grams) ? ` · ${foodRowKcal(food, grams)}` : ""}`}
            />
          ))}
        </Carousel>
      ) : (
        <Card as="section" aria-label="Gần đây" className="flex flex-col gap-1">
          <SectionTitle>Gần đây</SectionTitle>
          <p className="m-0 py-1 text-[13px] leading-snug text-secondary">Món bạn vừa ghi sẽ hiện ở đây.</p>
        </Card>
      )}

      {favourites.length > 0 ? (
        <Carousel title="Yêu thích">
          {favourites.slice(0, SHOWN).map((food) => (
            <FoodCardLink key={food.id} href={`/foods/${food.id}`} name={food.nameVi} meta={foodRowMeta(food)} />
          ))}
        </Carousel>
      ) : (
        <Card as="section" aria-label="Yêu thích" className="flex flex-col gap-1">
          <SectionTitle>Yêu thích</SectionTitle>
          <p className="m-0 py-1 text-[13px] leading-snug text-secondary">Chưa có món yêu thích. Bấm ♡ ở trang chi tiết món để lưu.</p>
        </Card>
      )}

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
        <CreateFoodButton href="/foods/new" />
      </Card>

    </>
  );
}

