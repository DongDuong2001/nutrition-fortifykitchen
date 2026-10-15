import type { ReactNode } from "react";
import { HOME_NUTRIENT_GROUPS } from "@/lib/home";
import { SHARE_CSS_WIDTH, SHARE_MIN_CSS_HEIGHT, type ShareModel } from "@/lib/share-card";
import { FoodList } from "./food-list";
import { HomeHero } from "./home-hero";
import { NutrientColumn } from "./nutrient-column";

const noop = () => {};

/**
 * The share image: the Hôm nay screen without the app header and the tab bar, in a non-interactive share mode.
 * It is drawn 390 px wide whatever the screen is (no media queries inside), is never shorter than 1080×1920
 * when scaled, and its footer is pinned to the bottom edge. `data-share-root` is what the rasteriser reads.
 */
export function ShareDay({ model, badge }: { model: ShareModel; badge?: ReactNode }) {
  return (
    <div
      data-share-root
      style={{ width: SHARE_CSS_WIDTH, minHeight: SHARE_MIN_CSS_HEIGHT }}
      className="flex flex-col bg-paper font-sans text-text"
    >
      <div className="flex flex-none items-start justify-between gap-3 px-3 pt-4 pb-1">
        <div className="min-w-0">
          {model.name && <p className="m-0 break-words text-[19px] font-bold leading-tight text-text">{model.name}</p>}
          <p className={`m-0 leading-snug ${model.name ? "mt-0.5 text-[13px] text-secondary" : "text-[15px] font-semibold text-text"}`}>
            {model.dateLabel}
          </p>
        </div>
        {badge && <div className="flex-none">{badge}</div>}
      </div>

      <div className="flex flex-1 flex-col">
        <HomeHero
          label={model.heroLabel}
          pills={[]}
          values={model.values}
          kcalTarget={model.kcalTarget}
          macroTargets={model.macroTargets}
          finished={model.finished}
          selected={false}
        />
        <div className="mt-2 flex flex-1 border-t border-t-card-border">
          <FoodList
            share
            meals={model.meals}
            mode={{ kind: "day" }}
            readOnly
            isEmpty={false}
            canCopyYesterday={false}
            onFood={noop}
            onMeal={noop}
            onCopyYesterday={noop}
          />
          <NutrientColumn
            values={model.values}
            targets={model.nutrientTargets}
            selected={false}
            finished={model.finished}
            microsHref="/micros"
            shareKey={model.key}
          />
        </div>
      </div>

      <div data-share-footer className="flex flex-none items-center justify-center gap-2 border-t border-t-divider py-3">
        <span className="flex h-6 items-center font-display text-lg font-black italic leading-none">
          <span className="text-ink">H1T</span>
          <span className="ml-1 text-cobalt">MICRO</span>
        </span>
        <span className="flex h-6 items-center text-xs font-semibold leading-none text-secondary">Theo dõi vi chất mỗi ngày</span>
      </div>
    </div>
  );
}

/** The ids the share image's nutrient column lists (the same list as Hôm nay's column). */
export const SHARE_NUTRIENT_IDS = HOME_NUTRIENT_GROUPS.flatMap((g) => g.ids);
