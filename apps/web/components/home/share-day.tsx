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
      {/* ShareC2: the name in big Saira with the date under it and the Level badge on the right, all centred in 86 px
          (a long name wraps and the header grows), a 1 px divider under it. */}
      <div data-share-header className="flex min-h-[86px] flex-none items-center justify-between gap-3 border-b border-b-divider px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="m-0 min-w-0 break-words font-display text-[38px] font-extrabold italic uppercase leading-[0.9] text-ink">
            {model.name ?? model.dateLabel}
          </p>
          {model.name && <p className="m-0 text-[13px] font-medium leading-snug text-secondary">{model.dateLabel}</p>}
        </div>
        <LevelBadge level={model.level} size="share" />
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
          share
        />
        <div className="mt-2 flex flex-1 border-t border-t-divider">
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
            microsHref="/micros"
            shareKey={model.key}
          />
        </div>
      </div>

      <div data-share-footer className="flex h-[58px] flex-none items-center justify-between bg-ink px-4">
        <span className="flex items-center font-display text-2xl font-extrabold italic leading-none">
          <span className="text-on-dark">H1T</span>
          <span className="ml-1 text-cobalt-on-dark">MICRO</span>
        </span>
        <span className="flex flex-col items-end gap-0.5">
          <span className="text-[13px] font-extrabold leading-none text-on-dark">lehongkhanh.vn</span>
          <span className="text-[11px] font-medium leading-none text-secondary-light">Theo dõi vi chất mỗi ngày</span>
        </span>
      </div>
    </div>
  );
}
