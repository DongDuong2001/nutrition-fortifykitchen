import { LevelBadge } from "@/components/profile/level-badge";
import { LevelBar } from "@/components/ui/level-bar";
import { formatAmount } from "@/lib/format";
import { kcalValue } from "@/lib/kcal";
import { pctLabel, pctOf, portionLabel, type HomeMeal } from "@/lib/home";
import { isExtra } from "@/lib/level-nutrients";
import { getNutrientDefinition } from "@/lib/nutrients";
import {
  SHARE_CSS_WIDTH,
  SHARE_MIN_CSS_HEIGHT,
  shareMealDot,
  type ShareModel,
} from "@/lib/share-card";
import { HomeHero } from "./home-hero";

/** One meal: dot, label and kcal on a 44 px header, then its foods, each on an inset divider (V3ShareB). */
function ShareMeal({ meal }: { meal: HomeMeal }) {
  return (
    <section aria-label={meal.fullName}>
      <div
        data-align-group="share-meals"
        className="flex min-h-11 items-center gap-1.5 whitespace-nowrap px-3"
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 flex-none rounded-full"
          style={{ backgroundColor: shareMealDot(meal.slot) }}
        />
        <span className="font-display text-callout font-extrabold uppercase italic leading-[1.1] tracking-[0.01em] text-text">
          {meal.label}
        </span>
        <span className="ml-0.5 font-condensed text-cap font-extrabold leading-none text-secondary tabular-nums">
          {kcalValue(meal.kcal)}
        </span>
      </div>
      <div aria-hidden="true" className="mx-3 h-px bg-divider" />
      {meal.entries.map((entry) => (
        <div
          key={entry.id}
          data-align-group="share-meals"
          className="mx-3 flex min-h-11 items-center justify-between gap-2 border-b border-b-divider py-1 text-text"
        >
          <span
            data-share-wrap
            className="min-w-0 break-words text-callout font-semibold leading-tight"
          >
            {entry.name}
          </span>
          <span className="max-w-[40%] flex-none text-right font-condensed text-callout font-extrabold leading-none tabular-nums">
            {portionLabel(entry)}
          </span>
        </div>
      ))}
    </section>
  );
}

/**
 * The vi chất card: "x/N đạt" and the lowest micros, the groups with a bar per nutrient, the colour key last.
 * `data-share-keep-lines` keeps the lines this card had on the page (share-sheet markLines).
 */
function ShareMicros({ model }: { model: ShareModel }) {
  const {
    values,
    extras,
    groups,
    summary,
    nutrientTargets: targets,
    key,
  } = model;
  return (
    <aside
      aria-label="Vi chất"
      data-share-keep-lines
      className="flex w-[180px] flex-none flex-col overflow-hidden rounded-card bg-card"
    >
      <p
        data-level-summary
        className="m-0 flex flex-col gap-1 px-3 pb-2 pt-3 text-cap leading-[1.125rem] text-secondary"
      >
        <span className="block h-6 font-semibold text-text">
          <span className="font-condensed text-[1.5rem] font-extrabold leading-none tabular-nums">
            {summary.reached}/{summary.total}
          </span>{" "}
          đạt
        </span>
        {summary.lacking.length > 0 && (
          <span data-share-wrap>
            Thiếu nhiều nhất: {summary.lacking.join(", ")}
          </span>
        )}
      </p>
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <div aria-hidden="true" className="mx-3 h-px bg-divider" />
          <h3 className="m-0 p-3 font-display text-body-lg font-extrabold uppercase italic leading-5 tracking-[0.01em] text-text">
            {group.title}
          </h3>
          {group.ids.map((id) => {
            const def = getNutrientDefinition(id);
            if (!def) return null;
            if (isExtra(id)) {
              // Level 3 and up: an amount only, no bar and no percent
              const amount = extras[id] ?? null;
              return (
                <div
                  key={id}
                  data-align-group="home-nutrient"
                  className="flex min-h-11 items-center justify-between gap-1 px-3 py-1.5"
                >
                  <span
                    data-share-wrap
                    className="min-w-0 break-words text-callout font-semibold leading-tight text-text"
                  >
                    {def.name}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-xs leading-tight text-secondary tabular-nums">
                    {amount === null
                      ? "chưa có dữ liệu"
                      : `${formatAmount(amount, def.unit)} ${def.unit}`}
                  </span>
                </div>
              );
            }
            const value = values.nutrients[id] ?? null;
            const pct = pctOf(value, targets[id] ?? null);
            return (
              <div
                key={id}
                data-align-group="home-nutrient"
                className="flex min-h-11 flex-col justify-center gap-1 px-3 py-1.5 text-text"
              >
                <div className="flex items-baseline justify-between gap-1">
                  {/* When name and amount do not fit on one line the amount moves under the name */}
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5">
                    <span className="min-w-0 break-words text-callout font-semibold leading-tight">
                      {def.name}
                    </span>
                    <span className="whitespace-nowrap text-xs leading-tight text-secondary tabular-nums">
                      {value === null
                        ? "chưa có dữ liệu"
                        : `${formatAmount(value, def.unit)} ${def.unit}`}
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-condensed text-callout font-extrabold leading-none tabular-nums">
                    {value === null ? "" : pctLabel(value, targets[id] ?? null)}
                  </span>
                </div>
                <LevelBar
                  label={`${def.name} so với mục tiêu ngày`}
                  pct={pct}
                  heightClass="h-[9px]"
                />
              </div>
            );
          })}
        </section>
      ))}
      <div aria-hidden="true" className="mx-3 mt-1 h-px bg-divider" />
      <ul
        aria-label="Mức đạt"
        className="m-0 mt-auto grid list-none grid-cols-2 gap-x-1 gap-y-2 p-3 text-micro font-semibold leading-[0.875rem] text-secondary"
      >
        {key.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 flex-none rounded-[3px]"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * The share image (V3ShareB): the page header (name, date, Level), the ink hero, the meals card beside the vi chất
 * card, the ink footer. It is drawn 390 px wide whatever the screen is (no media queries inside), is never shorter
 * than 1080×1920 when scaled (the two cards stretch to fill it), and its footer is pinned to the bottom edge.
 * `data-share-root` is what the rasteriser reads.
 */
export function ShareDay({ model }: { model: ShareModel }) {
  return (
    <div
      data-share-root
      // A fixed 390 px design: the phone's text size setting does not enlarge it
      style={{
        width: SHARE_CSS_WIDTH,
        minHeight: SHARE_MIN_CSS_HEIGHT,
        WebkitTextSizeAdjust: "100%",
        textSizeAdjust: "100%",
      }}
      className="flex flex-col bg-ink font-sans text-text"
    >
      {/* The page itself is the paper; the root is ink, so a last image row the page covers only in part stays ink to the corners */}
      <div className="flex flex-1 flex-col bg-page">
        {/* The name is 34 px on a 1.1 line (stacked Vietnamese marks never touch, cc-66 S12). The hero keeps its own 8 px top margin; 4 px more here makes the design's 12 px */}
        <header
          data-share-header
          className="flex flex-none items-center justify-between gap-3 px-4 pb-1 pt-6"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1
              data-share-wrap
              className="m-0 min-w-0 break-words font-display text-display font-extrabold uppercase italic leading-[1.1] text-ink"
            >
              {model.name ?? model.dateLabel}
            </h1>
            {model.name && (
              <p className="m-0 whitespace-nowrap text-cap font-semibold leading-[1.125rem] text-secondary">
                {model.dateLabel}
              </p>
            )}
          </div>
          <LevelBadge level={model.level} size="share" />
        </header>

        <main className="flex min-h-0 flex-1 flex-col">
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
          <div className="mx-3 mb-3 mt-2 flex flex-1 items-stretch gap-2">
            <div className="min-w-0 flex-1 overflow-hidden rounded-card bg-card">
              {model.meals.length === 0 ? (
                <p className="m-0 min-h-11 px-3 pt-3 text-callout font-semibold text-text">
                  Chưa có món nào ngày này
                </p>
              ) : (
                model.meals.map((meal) => (
                  <ShareMeal key={meal.slot} meal={meal} />
                ))
              )}
            </div>
            <ShareMicros model={model} />
          </div>
        </main>
      </div>

      <footer
        data-share-footer
        className="flex h-[58px] flex-none items-center justify-between gap-3 bg-ink px-4"
      >
        <span className="flex items-center whitespace-nowrap font-display text-[1.5rem] font-extrabold uppercase italic leading-none">
          <span className="text-on-dark">H1T</span>
          <span className="ml-1 text-cobalt-on-dark">MICRO</span>
        </span>
        <span className="flex flex-col items-end gap-0.5 whitespace-nowrap text-right">
          <span className="text-cap font-bold leading-tight text-on-dark">
            lehongkhanh.vn
          </span>
          <span className="text-micro font-semibold leading-tight text-muted-subtitle">
            Theo dõi vi chất mỗi ngày
          </span>
        </span>
      </footer>
    </div>
  );
}
