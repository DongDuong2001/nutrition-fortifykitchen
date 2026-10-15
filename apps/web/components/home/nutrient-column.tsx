import Link from "next/link";
import { formatAmount } from "@/lib/format";
import { HOME_NUTRIENT_GROUPS, pctOf, type HomeValues } from "@/lib/home";
import { getNutrientDefinition } from "@/lib/nutrients";
import { HomeBar } from "./home-bar";

/**
 * The right column of the home body: the 14 nutrients the coach watches most, against the day's targets.
 * The caption says whose numbers these are (day, one food, one meal). An unknown value is a dash and an
 * empty bar, never 0.
 */
export function NutrientColumn({
  values,
  targets,
  caption,
  selected,
  finished,
  microsHref,
}: {
  values: HomeValues;
  targets: Record<string, number | null>;
  caption: string;
  selected: boolean;
  finished: boolean;
  microsHref: string;
}) {
  return (
    <aside
      aria-label="Vi chất"
      className={`flex w-[198px] flex-none flex-col border-l border-t-[3px] border-l-card-border bg-card px-3 pt-1.5 pb-2 lg:w-80 ${
        selected ? "border-t-cobalt" : "border-t-card"
      }`}
    >
      <p className={`m-0 text-[11px] font-extrabold leading-snug ${selected ? "text-cobalt" : "text-secondary"}`}>{caption}</p>
      {/* Rows are 34 px where there is room and shrink (to 28 px) so the column fits a short screen without scrolling */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {HOME_NUTRIENT_GROUPS.map((group) => (
          <section key={group.title} aria-label={group.title} className="flex min-h-0 flex-col" style={{ flex: group.ids.length }}>
            <h3 className="m-0 flex-none pt-1 text-[11px] font-extrabold leading-snug tracking-[0.04em] text-secondary">{group.title}</h3>
            {group.ids.map((id) => {
              const def = getNutrientDefinition(id);
              if (!def) return null;
              const value = values.nutrients[id] ?? null;
              const pct = pctOf(value, targets[id] ?? null);
              return (
                <div key={id} data-align-group="home-nutrient" className="flex max-h-[34px] min-h-7 flex-1 flex-col justify-center gap-0.5">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="flex min-w-0 items-baseline gap-1 whitespace-nowrap">
                      <span className="text-[13px] font-bold leading-tight text-text">{def.nameVi}</span>
                      <span className="text-xs leading-tight text-secondary tabular-nums">
                        {value === null ? "—" : `${formatAmount(value, def.unit)} ${def.unit}`}
                      </span>
                    </span>
                    <span className="font-display text-base font-bold leading-none text-text tabular-nums">
                      {pct === null ? "—" : `${pct}%`}
                    </span>
                  </div>
                  <HomeBar label={`${def.nameVi} so với mục tiêu ngày`} pct={pct} finished={finished} />
                </div>
              );
            })}
          </section>
        ))}
      </div>
      <Link
        href={microsHref}
        className="relative flex h-8 flex-none items-center text-[13px] font-bold text-blue no-underline before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']"
      >
        Đủ 22 vi chất ›
      </Link>
    </aside>
  );
}
