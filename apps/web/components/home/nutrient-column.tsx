import { memo } from "react";
import Link from "next/link";
import { formatAmount } from "@/lib/format";
import { pctLabel, pctOf, type HomeValues } from "@/lib/home";
import { isExtra, type ColumnGroup } from "@/lib/level-nutrients";
import { getNutrientDefinition } from "@/lib/nutrients";
import type { ShareKeyItem } from "@/lib/share-card";
import { ColumnScroll } from "./column-scroll";
import { inkPill } from "./ink-pill";
import { LevelBar } from "@/components/ui/level-bar";
import { getLevel, getLevelLabel } from "@/lib/levels";

/** The share image draws every row (no scrolling); the screen scrolls, with a fade while rows wait below. */
function Scroll({ share, fitKey, children }: { share: boolean; fitKey: string; children: React.ReactNode }) {
  return share ? <div className="flex flex-col">{children}</div> : <ColumnScroll fitKey={fitKey}>{children}</ColumnScroll>;
}

/**
 * The right column of the home body: the nutrients of the user's Level against the day's targets (lib/level-
 * nutrients). The group labels are bands like the meal headers on the left, so the first band sits level with the
 * first meal band. The extras (Level 3 and up) show an amount only: no bar, no percent. A food or a meal picked on
 * the left shows as a cobalt line on top. An unknown value is a dash and an empty bar, never 0.
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
  shareKey,
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
  /** The share image: rows have fixed heights (no media queries: the image is drawn at 390 px on any screen), no link, a colour key. */
  shareKey?: ShareKeyItem[];
}) {
  const share = shareKey !== undefined;
  const pill = inkPill(share);
  // From lg the rows match the food list: 48 px, 15 px text (the share image keeps the phone sizes)
  const lg = share ? "" : "lg:text-[15px]";
  return (
    <aside
      aria-label="Vi chất"
      className={`relative flex w-[198px] flex-none flex-col border-l border-l-card-border bg-card pb-2 ${share ? "" : "lg:w-80 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-card-border lg:shadow-card"} ${
        selected ? "before:absolute before:inset-x-0 before:top-0 before:z-20 before:h-[3px] before:bg-cobalt before:content-['']" : ""
      }`}
    >
      {/* Sections stack at their natural height (34 px rows, 48 px from lg); space left over sits below the last one, and a column that does not fit scrolls */}
      <Scroll share={share} fitKey={groups.map((g) => `${g.title}:${g.ids.join(",")}`).join("|") + (selected ? "!" : "")}>
        {groups.map((group, groupIndex) => (
          <section key={group.title} aria-label={group.title} data-tour={groupIndex === 0 ? "nutrient-column" : undefined} className="flex shrink-0 flex-col">
            <h3 data-snap-row className={`m-0 flex-none snap-start ${pill.wrap}`}>
              <span data-ink-pill className={`${pill.pill} bg-ink text-on-dark`}>
                <span className={pill.label}>{group.title}</span>
              </span>
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
                    className={`flex min-h-7 snap-start items-center justify-between gap-2 px-3 py-1 ${share ? "" : "lg:min-h-12"}`}
                  >
                    <span data-share-wrap className={`min-w-0 break-words text-[13px] font-semibold leading-snug text-text ${lg}`}>{def.name}</span>
                    <span className={`shrink-0 text-[13px] leading-tight text-secondary tabular-nums ${lg}`}>
                      {amount === null ? "—" : `${formatAmount(amount, def.unit)} ${def.unit}`}
                    </span>
                  </div>
                );
              }
              const value = values.nutrients[id] ?? null;
              const pct = pctOf(value, targets[id] ?? null);
              // cc-51 D4: today's rows are buttons that open the foods behind the number (a 46 px hit area)
              const Row = onNutrient && !share ? "button" : "div";
              return (
                <Row
                  key={id}
                  {...(Row === "button"
                    ? {
                        type: "button" as const,
                        onClick: () => onNutrient?.(id),
                        "aria-label": `${def.name}, ${value === null ? "chưa có dữ liệu" : `${formatAmount(value, def.unit)} ${def.unit}`}, ${pctLabel(value, targets[id] ?? null)} mục tiêu${pct === null ? "" : `, ${getLevelLabel(getLevel(pct))}`}. Xem món góp phần`,
                        "aria-haspopup": "dialog" as const,
                      }
                    : {})}
                  data-align-group="home-nutrient"
                  data-snap-row
                  className={`flex snap-start flex-col justify-center gap-0.5 px-3 ${share ? "h-9" : "h-[34px] lg:h-12 lg:gap-1"} ${
                    Row === "button" ? "relative w-full cursor-pointer border-0 bg-transparent text-left before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="flex min-w-0 items-baseline gap-1 whitespace-nowrap">
                      <span className={`text-[13px] font-semibold leading-tight text-text ${lg}`}>{def.name}</span>
                      <span className={`text-[13px] leading-tight text-secondary tabular-nums ${lg}`}>
                        {value === null ? "—" : `${formatAmount(value, def.unit)} ${def.unit}`}
                      </span>
                    </span>
                    <span className={`font-display text-[15px] font-bold leading-none text-text tabular-nums ${share ? "" : "lg:text-[18px]"}`}>
                      {pctLabel(value, targets[id] ?? null)}
                    </span>
                  </div>
                  <LevelBar label={`${def.name} so với mục tiêu ngày`} pct={pct} heightClass={share ? "h-[9px]" : "h-[9px] lg:h-[10px]"} />
                </Row>
              );
            })}
          </section>
        ))}
      </Scroll>
      {share ? (
        <>
          {summary && (
            <p data-level-summary className="m-0 flex flex-none flex-col gap-0.5 px-3 pt-2 text-[13px] leading-snug text-secondary">
              <span className="font-bold tabular-nums text-text">
                {summary.reached}/{summary.total} đạt
              </span>
              {summary.lacking.length > 0 && <span data-share-wrap>Thiếu nhiều nhất: {summary.lacking.join(", ")}</span>}
            </p>
          )}
          <ul className="m-0 mt-auto grid list-none grid-cols-2 gap-x-2.5 gap-y-1.5 px-3 pt-3 text-[11px] leading-snug text-secondary">
            {shareKey.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 whitespace-nowrap">
                <span aria-hidden="true" className="h-[9px] w-[9px] flex-none rounded-[3px]" style={{ backgroundColor: item.color }} />
                {item.label}
              </li>
            ))}
          </ul>
        </>
      ) : (
        // Below the scroll area, never over it; any space the whole-row cut leaves sits above this block
        <div className="mt-auto flex flex-none flex-col">
          {summary && (
            <p data-level-summary className="m-0 flex flex-none flex-col gap-0.5 px-3 pt-2 text-[13px] leading-snug text-secondary">
              <span className="font-bold tabular-nums text-text">
                {summary.reached}/{summary.total} đạt
              </span>
              {summary.lacking.length > 0 && <span>Thiếu nhiều nhất: {summary.lacking.join(", ")}</span>}
            </p>
          )}
          <Link
            href={microsHref}
            className="relative flex h-8 flex-none items-center px-3 text-[13px] font-bold text-blue no-underline before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']"
          >
            Đủ 22 vi chất ›
          </Link>
        </div>
      )}
    </aside>
  );
});
