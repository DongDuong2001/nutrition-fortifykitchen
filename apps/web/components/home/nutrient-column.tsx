import { memo } from "react";
import Link from "next/link";
import { formatAmount } from "@/lib/format";
import { nutrientRowLabel, pctLabel, pctOf, type HomeValues } from "@/lib/home";
import { isExtra, type ColumnGroup } from "@/lib/level-nutrients";
import { getNutrientDefinition } from "@/lib/nutrients";
import { ColumnScroll } from "./column-scroll";
import { ExtraRow, GroupTitle, LevelSummary } from "@/components/nutrients/column-parts";
import { LevelBar } from "@/components/ui/level-bar";
import { getLevel, getLevelLabel } from "@/lib/levels";
import { useHold } from "@/lib/use-hold";
import { haptic } from "@/lib/haptics";

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
  fiberTarget,
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
  summary?: { reached: number; total: number; lacking: string[]; done?: boolean };
  /** C3: Chất xơ in its own section above the first group (not counted in x/N đạt), against the day's fibre target. A number,
   *  not an object, so the memoised column still skips a render when nothing changed. Left out: no Chất xơ row. */
  fiberTarget?: number | null;
}) {
  return (
    // feat/sound-goals: the card is overflow-hidden, so the ten sparks of Đủ chất fly in a layer beside it (lib/goal-fx), in this wrapper
    <div className="relative flex w-[180px] flex-none self-start lg:w-80 lg:self-stretch">
    <aside
      aria-label="Vi chất"
      data-fx="column"
      className={`relative flex w-full flex-none flex-col bg-card overflow-hidden rounded-card lg:border lg:border-card-border lg:shadow-card ${
        selected ? "before:absolute before:inset-x-0 before:top-0 before:z-20 before:h-[3px] before:bg-cobalt before:content-['']" : ""
      }`}
    >
      {/* cc-61: the verdict covers every group below (N is minerals plus vitamins), so it heads the column, above the first band.
          Whole-pixel heights (a 40 px numeral line, 20 px text lines) keep the whole-row cut of the area clean. */}
      {summary && <LevelSummary summary={summary} />}
      {/* Sections stack at their natural height (34 px rows, 48 px from lg); space left over sits below the last one, and a column that does not fit scrolls */}
      <ColumnScroll fitKey={groups.map((g) => `${g.title}:${g.ids.join(",")}`).join("|") + (selected ? "!" : "") + (summary ? `#${summary.lacking.length}${summary.done ? "d" : ""}` : "") + (fiberTarget !== undefined ? "+fiber" : "")}>
        {fiberTarget !== undefined && (
          <section aria-label="Chất xơ" className="flex shrink-0 flex-col">
            <MicroRow
              id="fiber"
              name="Chất xơ"
              title
              unit="g"
              value={values.fiber}
              target={fiberTarget}
              onNutrient={onNutrient}
              holdOpens
              className="relative before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-divider before:content-['']"
            />
          </section>
        )}
        {groups.map((group, groupIndex) => (
          <section key={group.title} aria-label={group.title} data-tour={groupIndex === 0 ? "nutrient-column" : undefined} className="flex shrink-0 flex-col">
            <GroupTitle title={group.title} snap />
            {group.ids.map((id) => {
              const def = getNutrientDefinition(id);
              if (!def) return null;
              if (isExtra(id)) return <ExtraRow key={id} name={def.name} unit={def.unit} amount={extras[id] ?? null} snap />;
              return <MicroRow key={id} id={id} name={def.name} unit={def.unit} value={values.nutrients[id] ?? null} target={targets[id] ?? null} onNutrient={onNutrient} />;
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
    <div data-fx="sparks" aria-hidden="true" className="pointer-events-none absolute inset-0 z-20" />
    </div>
  );
});

/**
 * One nutrient row (C3): the name on its own line (15 px; Chất xơ as a section title), the amount always on the line under it
 * (13 px, ink at 70 %), the percent (16 px) centred against both lines, then the level bar. Today's rows are buttons that open
 * the foods behind the number (cc-51 D4).
 */
export function MicroRow({
  id,
  name,
  unit,
  value,
  target,
  onNutrient,
  title = false,
  share = false,
  holdOpens = false,
  className = "",
}: {
  id: string;
  name: string;
  unit: string;
  value: number | null;
  target: number | null;
  onNutrient?: (id: string) => void;
  /** Chất xơ: the name in the section-title style (Saira italic 800, 17 px, uppercase) and the target after the amount */
  title?: boolean;
  /** The share image (share-day): the name keeps the lines it had on the page (data-share-wrap) */
  share?: boolean;
  /** Job A: a hold opens the foods behind it as a tap does (the hero's macros open on hold, so Chất xơ does too) */
  holdOpens?: boolean;
  className?: string;
}) {
  const hold = useHold<string>((key) => {
    haptic("longPress");
    onNutrient?.(key);
  });
  const pct = pctOf(value, target);
  const Row = onNutrient ? "button" : "div";
  const amount = value === null ? "chưa có dữ liệu" : `${formatAmount(value, unit)} ${unit}${title && target !== null ? ` / ${formatAmount(target, unit)} ${unit}` : ""}`;
  return (
    <Row
      {...(Row === "button"
        ? {
            type: "button" as const,
            onClick: () => {
              if (!hold.heldClick()) onNutrient?.(id);
            },
            ...(holdOpens ? hold.bind(id) : {}),
            "aria-label": nutrientRowLabel({ name, unit, value, target, level: pct === null ? null : getLevelLabel(getLevel(pct)) }),
            "aria-haspopup": "dialog" as const,
          }
        : {})}
      data-align-group="home-nutrient"
      data-snap-row
      data-nutrient-row={id}
      className={`flex min-h-11 snap-start flex-col justify-center gap-1 px-3 lg:min-h-12 ${title ? "py-3" : "py-1.5"} ${
        Row === "button" ? "w-full cursor-pointer border-0 bg-transparent text-left" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span
            data-share-wrap={share || undefined}
            className={
              title
                ? "font-display text-body-lg font-extrabold uppercase leading-5 tracking-[0.01em] text-text"
                : "min-w-0 break-words text-callout font-semibold leading-tight text-text"
            }
          >
            {name}
          </span>
          <span className="text-cap leading-tight text-text/70 tabular-nums">{amount}</span>
        </span>
        <span data-fx="pct" className="shrink-0 whitespace-nowrap font-condensed text-base font-extrabold leading-none text-text tabular-nums lg:text-[1.125rem]">
          {value === null ? "" : pctLabel(value, target)}
        </span>
      </div>
      <LevelBar label={`${name} so với mục tiêu ngày`} pct={pct} heightClass="h-[9px] lg:h-[10px]" />
    </Row>
  );
}
