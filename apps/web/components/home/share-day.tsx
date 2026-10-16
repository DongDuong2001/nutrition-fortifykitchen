import { LevelBadge } from "@/components/profile/level-badge";
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
export function ShareDay({ model }: { model: ShareModel }) {
  return (
    <div
      data-share-root
      style={{ width: SHARE_CSS_WIDTH, minHeight: SHARE_MIN_CSS_HEIGHT }}
      className="flex flex-col bg-paper font-sans text-text"
    >
      {/* Row 1: the name (or, with no name, the date) and the Level badge, centred on one line. Row 2: the date. */}
      <div data-share-header className="flex flex-none flex-col gap-0.5 px-3 pt-4 pb-1">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 min-w-0 break-words text-[19px] font-bold leading-tight text-text">{model.name ?? model.dateLabel}</p>
          <LevelBadge level={model.level} size="share" />
        </div>
        {model.name && <p className="m-0 text-[13px] leading-snug text-secondary">{model.dateLabel}</p>}
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
            extras={model.extras}
            groups={model.groups}
            summary={model.summary}
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
