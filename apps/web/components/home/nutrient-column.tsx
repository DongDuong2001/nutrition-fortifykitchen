import { memo } from "react";
import Link from "next/link";
import { formatAmount } from "@/lib/format";
import { nutrientRowLabel, pctLabel, pctOf, type HomeValues } from "@/lib/home";
import { isExtra, type ColumnGroup } from "@/lib/level-nutrients";
import { getNutrientDefinition } from "@/lib/nutrients";
import { ColumnScroll } from "./column-scroll";
import { LevelBar } from "@/components/ui/level-bar";
import { getLevel, getLevelLabel } from "@/lib/levels";

/**
 * The right column of the home body: the nutrients of the user's Level against the day's targets (lib/level-
 * nutrients). The group labels are bands like the meal headers on the left, so the first band sits level with the
 * first meal band. The extras (Level 3 and up) show an amount only: no bar, no percent. A food or a meal picked on
 * the left shows as a cobalt line on top. An unknown value is a dash and an empty bar, never 0. cc-61: the "x/N đạt"
 * verdict is the column's header row, above the first group band, so it reads first on a full day and on an empty one;
 * the "Đủ 22 vi chất" link stays at the foot.
 */
export const NutrientColumn = memo(function NutrientColumn({
  values,
  extras,
  groups,
  targets,
  selected,
  microsHref,
  onNutrient,
  summary,
}: {
  values: HomeValues;
  /** Amounts of the extras by id (null = unknown). */
  extras: Record<string, number | null>;
  groups: ColumnGroup[];
  targets: Record<string, number | null>;
  selected: boolean;
  microsHref: string;
  /** Today only (cc-51 D4): a tapped nutrient opens the foods that add to it */
  onNutrient?: (id: string) => void;
  /** "x/N đạt" and the lowest micros of the Level; left out when a food or a meal is picked. */
  summary?: { reached: number; total: number; lacking: string[] };
}) {
  return (
    <aside
      aria-label="Vi chất"
      className={`relative flex flex-none flex-col bg-card w-[180px] self-start overflow-hidden rounded-card lg:w-80 lg:self-stretch lg:border lg:border-card-border lg:shadow-card ${
        selected ? "before:absolute before:inset-x-0 before:top-0 before:z-20 before:h-[3px] before:bg-cobalt before:content-['']" : ""
      }`}
    >
      {/* cc-61: the verdict covers every group below (N is minerals plus vitamins), so it heads the column, above the first band.
          Whole-pixel heights (a 24 px numeral line, 18 px text lines) keep the whole-row cut of the area clean. */}
      {summary && (
        <p data-level-summary className="m-0 flex flex-none flex-col gap-1 px-3 pb-2 pt-3 text-cap leading-[1.125rem] text-secondary lg:text-callout lg:leading-5">
          <span className="block h-6 font-semibold text-text lg:h-7">
            <span className="font-condensed text-[1.5rem] font-extrabold leading-none tabular-nums lg:text-title">
              {summary.reached}/{summary.total}
            </span>{" "}
            đạt
          </span>
          {summary.lacking.length > 0 && <span>Thiếu nhiều nhất: {summary.lacking.join(", ")}</span>}
        </p>
      )}
      {/* Sections stack at their natural height (34 px rows, 48 px from lg); space left over sits below the last one, and a column that does not fit scrolls */}
      <ColumnScroll fitKey={groups.map((g) => `${g.title}:${g.ids.join(",")}`).join("|") + (selected ? "!" : "") + (summary ? `#${summary.lacking.length}` : "")}>
        {groups.map((group, groupIndex) => (
          <section key={group.title} aria-label={group.title} data-tour={groupIndex === 0 ? "nutrient-column" : undefined} className="flex shrink-0 flex-col">
            {/* V3: an inset hairline, then the section header in Saira (no ink band). The hairline is part of the header so the area's row snap starts on it. */}
            <h3 data-snap-row className="relative m-0 flex-none snap-start p-3 font-display text-body-lg font-extrabold uppercase leading-5 tracking-[0.01em] text-text before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-divider before:content-['']">
              {group.title}
            </h3>
            {group.ids.map((id) => {
              const def = getNutrientDefinition(id);
              if (!def) return null;
              if (isExtra(id)) {
                const amount = extras[id] ?? null;
                return (
                  <div
                    key={id}
                    data-align-group="home-nutrient"
                    data-extra
                    data-snap-row
                    className="flex min-h-11 snap-start items-center justify-between gap-2 px-3 py-1 lg:min-h-12"
                  >
                    <span className="min-w-0 break-words text-callout font-semibold leading-snug text-text">{def.name}</span>
                    <span className="shrink-0 text-xs leading-tight text-secondary tabular-nums">
                      {amount === null ? "chưa có dữ liệu" : `${formatAmount(amount, def.unit)} ${def.unit}`}
                    </span>
                  </div>
                );
              }
              const value = values.nutrients[id] ?? null;
              const pct = pctOf(value, targets[id] ?? null);
              // cc-51 D4: today's rows are buttons that open the foods behind the number (a 44 px row)
              const Row = onNutrient ? "button" : "div";
              return (
                <Row
                  key={id}
                  {...(Row === "button"
                    ? {
                        type: "button" as const,
                        onClick: () => onNutrient?.(id),
                        "aria-label": nutrientRowLabel({ name: def.name, unit: def.unit, value, target: targets[id] ?? null, level: pct === null ? null : getLevelLabel(getLevel(pct)) }),
                        "aria-haspopup": "dialog" as const,
                      }
                    : {})}
                  data-align-group="home-nutrient"
                  data-snap-row
                  className={`flex min-h-11 snap-start flex-col justify-center gap-1 px-3 py-1.5 lg:min-h-12 ${
                    Row === "button" ? "w-full cursor-pointer border-0 bg-transparent text-left" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    {/* The full name always shows; when name and amount do not fit on one line (large text) the amount moves under the name */}
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
                      <span className="min-w-0 break-words text-callout font-semibold leading-tight text-text">{def.name}</span>
                      <span className="whitespace-nowrap text-xs leading-tight text-secondary tabular-nums">
                        {value === null ? "chưa có dữ liệu" : `${formatAmount(value, def.unit)} ${def.unit}`}
                      </span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap font-condensed text-callout font-extrabold leading-none text-text tabular-nums lg:text-[1.125rem]">
                      {value === null ? "" : pctLabel(value, targets[id] ?? null)}
                    </span>
                  </div>
                  <LevelBar label={`${def.name} so với mục tiêu ngày`} pct={pct} heightClass="h-[9px] lg:h-[10px]" />
                </Row>
              );
            })}
          </section>
        ))}
      </ColumnScroll>
      {/* Below the scroll area, never over it; any space the whole-row cut leaves sits above this block */}
      <div className="mt-auto flex flex-none flex-col">
        <Link
          href={microsHref}
          className="flex min-h-11 flex-none items-center px-3 text-cap font-bold text-cobalt no-underline"
        >
          Đủ 22 vi chất ›
        </Link>
      </div>
    </aside>
  );
});
