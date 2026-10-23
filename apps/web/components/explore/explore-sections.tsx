"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useDiary } from "@/lib/diary-store";
import { CATALOG_FOODS } from "@/lib/catalog";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { resolveFavourites } from "@/lib/favourites";
import { resolveRecent } from "@/lib/recent-foods";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { PillButton } from "@/components/ui/pill-button";
import { SectionTitle } from "@/components/ui/section-title";
import { SettingsTile, type SettingsTileTone } from "@/components/ui/settings-tile";
import { Carousel } from "@/components/ui/carousel";
import { FoodCardLink } from "@/components/foods/food-card-link";
import { RichCarousel } from "@/components/explore/rich-carousel";
import { MinhHaoCarousel } from "@/components/explore/minh-hao-carousel";
import { foodRowKcal, foodRowMeta } from "@/lib/food-meta";
import { FOOD_CATEGORIES, categoryOf, isOwnFood } from "@/lib/food-categories";
import { collapseTwins, dedupeTwins, rowName } from "@/lib/food-rows";
import { useSavedMealRows } from "@/components/explore/saved-meals-card";
import { TemplateGlyphShapes } from "@/components/templates/template-glyph";
import { useDayTemplates } from "@/hooks/use-day-templates";
import { CoachesCarousel } from "@/components/coaching/coaches-carousel";
import { LeaderboardBanner } from "@/components/leaderboard/leaderboard-banner";
import { coachingAvailable } from "@/lib/coaching-link";
import { isLiveMode } from "@/lib/api-mode";

const SHOWN = 8;

/** The groups of Nhóm món: every category but Món ăn của tôi, which is a row of Của bạn. */
const GROUPS = FOOD_CATEGORIES.filter((c) => c.key !== "cua_toi");

/**
 * Nhóm món (V3): one white card, a 2-column grid of the food groups (icon tile, name, "<n> món"), the way the category
 * chips were on a phone. Only the groups that have foods; an odd last group spans both columns. From 1024 px the chips above the sections do this job.
 */
function GroupGrid() {
  const { foods, pending } = useCatalogFoods();
  // The count of a group is what its page lists (one row per food, raw and cooked twins folded)
  const counts = useMemo(
    () => Object.fromEntries(GROUPS.map((g) => [g.key, collapseTwins(foods.filter((f) => categoryOf(f) === g.key)).length])),
    [foods]
  );
  const waiting = foods.length === 0 && pending;
  // A group with no food is left out (overnight 22→23/10: "Đồ uống · 0 món" on the demo); while the catalogue loads, every group waits
  const shown = waiting ? GROUPS : GROUPS.filter((g) => counts[g.key] > 0);
  return (
    <section aria-labelledby="explore-groups" className="flex flex-col gap-1 lg:hidden">
      <SectionTitle id="explore-groups" className="flex min-h-11 items-center">
        Nhóm món
      </SectionTitle>
      <nav aria-label="Nhóm món" className="grid grid-cols-2 overflow-hidden rounded-card border border-transparent bg-card shadow-ring">
        {shown.map((g, i) => {
          const spans = i === shown.length - 1 && i % 2 === 0;
          return (
            <Link
              key={g.key}
              href={`/explore/${g.key}`}
              data-align-group="explore-groups"
              className={`m-tint flex min-h-16 items-center gap-3 p-3 text-text no-underline transition-press ${spans ? "col-span-2" : ""} ${i >= 2 ? "border-t border-divider" : ""} ${i % 2 === 0 && !spans ? "border-r border-divider" : ""}`}
            >
              <IconTile k={g.key} size={32} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-balance text-callout font-semibold leading-tight">{g.label}</span>
                {waiting ? (
                  <span aria-hidden="true" className="h-4 w-12 rounded bg-level-empty motion-safe:animate-pulse" />
                ) : (
                  <span className="text-cap tabular-nums text-secondary">{counts[g.key]} món</span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

// V3-SPEC §3.4 tile colours by meaning: Yêu thích pink (the heart), Bữa ăn đã lưu orange, Món ăn của tôi blue
// Yêu thích has no page of its own in the app yet (the design's row would need a new route), so its row only counts and the
// favourites stay a carousel of cards below Gần đây
const OWN_ROWS: { id: string; label: string; href: string | null; tone: SettingsTileTone; glyph: React.ReactNode }[] = [
  {
    id: "favourites",
    label: "Yêu thích",
    href: null,
    tone: "training",
    glyph: <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.9 3.6 4.8 6.9 4.8c2.1 0 3.9 1.2 5.1 3 1.2-1.8 3-3 5.1-3 3.3 0 5.3 3.1 4.1 6.4-1.7 4.7-9.2 9.3-9.2 9.3z" />,
  },
  {
    id: "meals",
    label: "Bữa ăn đã lưu",
    href: "/explore/meals",
    tone: "targets",
    glyph: <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1z" />,
  },
  {
    id: "mine",
    label: "Món ăn của tôi",
    href: "/explore/cua_toi",
    tone: "profile",
    glyph: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8" />,
  },
  // Ngày ăn mẫu: the language tile is indigo (V3-SPEC §3.4), the calendar with a filled day
  {
    id: "ngay-mau",
    label: "Ngày ăn mẫu",
    href: "/explore/ngay-mau",
    tone: "language",
    glyph: <TemplateGlyphShapes />,
  },
];

/** Gần đây, Yêu thích, Của bạn (Yêu thích, Bữa ăn đã lưu, Món ăn của tôi) and the "Giàu …" index: the Khám phá home when nothing is searched. */
export function ExploreSections() {
  const { recentFoods, favouriteIds, hydrated } = useDiary();
  // Re-renders when the catalogue arrives: Gần đây and Yêu thích are looked up in it
  const { foods: catalogue } = useCatalogFoods();
  const savedMeals = useSavedMealRows();
  const { templates: dayTemplates } = useDayTemplates();

  // perf/live-bundle: worked out when the recents, the favourites or the catalogue change, not on every render.
  // `catalogue` is a new array whenever the catalogue changes (useCatalogFoods), so it stands for CATALOG_FOODS too.
  // cc-67: one card per food, whatever state it was logged in
  const recents = useMemo(
    () =>
      dedupeTwins(
        recentFoods.flatMap((r) => {
          const resolved = resolveRecent(r, CATALOG_FOODS);
          return resolved ? [resolved] : [];
        }),
        (r) => r.food
      )
        .slice(0, SHOWN)
        .map(({ food, grams, label }) => ({ food, grams, label })),
    [recentFoods, catalogue]
  );

  const favourites = useMemo(() => dedupeTwins(resolveFavourites(favouriteIds, CATALOG_FOODS), (f) => f), [favouriteIds, catalogue]);
  // The sample user food (Bột củ dền) is demo-only: a new account owns nothing until it creates a food
  const mine = useMemo(() => catalogue.filter(isOwnFood), [catalogue]);

  // What each Của bạn row counts; nothing until the diary has loaded, so a number is never shown and then corrected
  const counts: Record<string, string | null> = {
    favourites: hydrated ? `${favourites.length} món` : null,
    meals: hydrated ? `${savedMeals.length} bữa` : null,
    mine: `${mine.length} món`,
    "ngay-mau": hydrated ? `${dayTemplates.length} mẫu` : null,
  };

  return (
    <>
      <MinhHaoCarousel />

      <RichCarousel />

      <GroupGrid />

      {recents.length > 0 ? (
        <Carousel title="Gần đây">
          {recents.map(({ food, grams, label }) => (
            <FoodCardLink key={`${food.id}|${label}`} href={`/foods/${food.id}`} name={rowName(food)} meta={label} kcal={foodRowKcal(food, grams)} food={food} />
          ))}
        </Carousel>
      ) : (
        <Card as="section" aria-label="Gần đây" className="flex flex-col gap-1">
          <SectionTitle>Gần đây</SectionTitle>
          <p className="m-0 py-1 text-cap leading-snug text-secondary">Món bạn vừa ghi sẽ hiện ở đây.</p>
        </Card>
      )}

      {favourites.length > 0 && (
        <Carousel title="Yêu thích">
          {favourites.slice(0, SHOWN).map((food) => (
            <FoodCardLink key={food.id} href={`/foods/${food.id}`} name={rowName(food)} meta={foodRowMeta(food)} food={food} />
          ))}
        </Carousel>
      )}

      <Card as="section" aria-labelledby="explore-yours" className="flex flex-col gap-1">
        <SectionTitle id="explore-yours">Của bạn</SectionTitle>
        <div className="flex flex-col">
          {OWN_ROWS.map((row, i) => {
            const body = (
              <>
                <SettingsTile tone={row.tone}>{row.glyph}</SettingsTile>
                <span className="min-w-0 flex-1 text-callout font-semibold leading-snug">
                  {row.label}
                  {counts[row.id] && <span className="font-normal tabular-nums text-secondary"> · {counts[row.id]}</span>}
                </span>
                {row.href && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-secondary" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                )}
              </>
            );
            const cls = `flex min-h-[52px] items-center gap-3 text-text no-underline ${i > 0 ? "border-t border-divider" : ""}`;
            return row.href ? (
              <Link key={row.id} href={row.href} data-align-group="explore-yours" className={`m-tint transition-press ${cls}`}>
                {body}
              </Link>
            ) : (
              <div key={row.id} data-align-group="explore-yours" className={cls}>
                {body}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-col items-center gap-2 text-center">
          {/* V3: the outline pill is ink, 1,5 px, on the white card */}
          <PillButton variant="secondary" href="/foods/new" className="gap-2 border-0! shadow-[inset_0_0_0_1.5px_var(--color-text)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tạo món mới
          </PillButton>
          <p className="m-0 text-cap leading-snug text-secondary">Không thấy món? Tự nhập dinh dưỡng</p>
        </div>
      </Card>

      {/* Sample ranking and coaches: mock and demo mode only, never in live mode (not in the V3 design: kept below its sections) */}
      {coachingAvailable(isLiveMode()) && (
        <>
          <LeaderboardBanner />

          <CoachesCarousel />
        </>
      )}
    </>
  );
}
