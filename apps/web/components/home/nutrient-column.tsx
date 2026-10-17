import Link from "next/link";
import { formatAmount } from "@/lib/format";
import { pctLabel, pctOf, type HomeValues } from "@/lib/home";
import { isExtra, type ColumnGroup } from "@/lib/level-nutrients";
import { getNutrientDefinition } from "@/lib/nutrients";
import type { ShareKeyItem } from "@/lib/share-card";
import { ColumnScroll } from "./column-scroll";
import { LevelBar } from "@/components/ui/level-bar";

/** The share image draws every row (no scrolling); the screen scrolls, with a fade while rows wait below. */
function Scroll({ share, children }: { share: boolean; children: React.ReactNode }) {
  return share ? <div className="flex flex-col">{children}</div> : <ColumnScroll>{children}</ColumnScroll>;
}

/**
 * The right column of the home body: the nutrients of the user's Level against the day's targets (lib/level-
 * nutrients). The group labels are bands like the meal headers on the left, so the first band sits level with the
 * first meal band. The extras (Level 3 and up) show an amount only: no bar, no percent. A food or a meal picked on
 * the left shows as a cobalt line on top. An unknown value is a dash and an empty bar, never 0.
 */
export function NutrientColumn({
  values,
  extras,
  groups,
  targets,
  selected,
  microsHref,
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
  /** "x/N đạt" and the lowest micros of the Level; left out when a food or a meal is picked. */
  summary?: { reached: number; total: number; lacking: string[] };
  /** The share image: rows have fixed heights (no media queries: the image is drawn at 390 px on any screen), no link, a colour key. */
  shareKey?: ShareKeyItem[];
}) {
  const share = shareKey !== undefined;
  return (
    <aside
      aria-label="Vi chất"
      className={`relative flex w-[198px] flex-none flex-col border-l border-l-card-border bg-card pb-2 ${share ? "" : "lg:w-80"} ${
        selected ? "before:absolute before:inset-x-0 before:top-0 before:z-20 before:h-[3px] before:bg-cobalt before:content-['']" : ""
      }`}
    >
      {/* Rows are 34 px where there is room and shrink (to 28 px) so the column fits a short screen; it scrolls when it cannot */}
      <Scroll share={share}>
        {groups.map((group, groupIndex) => (
          <section key={group.title} aria-label={group.title} data-tour={groupIndex === 0 ? "nutrient-column" : undefined} className="flex flex-col" style={share ? undefined : { flex: `${group.ids.length} 0 auto` }}>
            <h3 data-snap-row className={`m-0 flex h-[22px] flex-none snap-start items-center bg-paper-dark px-3 text-[11px] font-extrabold leading-none text-text ${share ? "" : "lg:h-11"}`}>
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
                    className="flex min-h-7 snap-start items-center justify-between gap-2 px-3 py-1"
                  >
                    <span className="min-w-0 break-words text-[13px] font-semibold leading-snug text-text">{def.name}</span>
                    <span className="shrink-0 text-[13px] leading-tight text-secondary tabular-nums">
                      {amount === null ? "—" : `${formatAmount(amount, def.unit)} ${def.unit}`}
                    </span>
                  </div>
                );
              }
              const value = values.nutrients[id] ?? null;
              const pct = pctOf(value, targets[id] ?? null);
              return (
                <div key={id} data-align-group="home-nutrient" data-snap-row className={`flex snap-start flex-col justify-center gap-0.5 px-3 ${share ? "h-[34px]" : "max-h-[34px] min-h-7 flex-1"}`}>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="flex min-w-0 items-baseline gap-1 whitespace-nowrap">
                      <span className="text-[13px] font-semibold leading-tight text-text">{def.name}</span>
                      <span className="text-[13px] leading-tight text-secondary tabular-nums">
                        {value === null ? "—" : `${formatAmount(value, def.unit)} ${def.unit}`}
                      </span>
                    </span>
                    <span className="font-display text-[15px] font-bold leading-none text-text tabular-nums">
                      {pctLabel(value, targets[id] ?? null)}
                    </span>
                  </div>
                  <LevelBar label={`${def.name} so với mục tiêu ngày`} pct={pct} heightClass={share ? "h-[9px]" : "h-[9px] lg:h-[10px]"} />
                </div>
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
              {summary.lacking.length > 0 && <span>Thiếu nhiều nhất: {summary.lacking.join(", ")}</span>}
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
}
