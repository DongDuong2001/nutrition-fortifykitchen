import Link from "next/link";
import { formatAmount } from "@/lib/format";
import type { ShareKeyItem } from "@/lib/share-card";
import { HOME_NUTRIENT_GROUPS, pctLabel, pctOf, type HomeValues } from "@/lib/home";
import { getNutrientDefinition } from "@/lib/nutrients";
import { HomeBar } from "./home-bar";

/**
 * The right column of the home body: the 14 nutrients the coach watches most, against the day's targets.
 * The group labels are bands like the meal headers on the left, so the first band sits level with the first
 * meal band. A food or a meal picked on the left shows as a cobalt line on top. An unknown value is a dash and
 * an empty bar, never 0.
 */
export function NutrientColumn({
  values,
  targets,
  selected,
  finished,
  microsHref,
  shareKey,
}: {
  values: HomeValues;
  targets: Record<string, number | null>;
  selected: boolean;
  finished: boolean;
  microsHref: string;
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
      {/* Rows are 34 px where there is room and shrink (to 28 px) so the column fits a short screen without scrolling */}
      <div className={share ? "flex flex-col" : "flex min-h-0 flex-1 flex-col overflow-y-auto"}>
        {HOME_NUTRIENT_GROUPS.map((group) => (
          <section key={group.title} aria-label={group.title} className="flex min-h-0 flex-col" style={share ? undefined : { flex: group.ids.length }}>
            <h3 className={`m-0 flex h-[22px] flex-none items-center bg-paper-dark px-3 text-[11px] font-extrabold leading-none text-text ${share ? "" : "lg:h-11"}`}>
              {group.title}
            </h3>
            {group.ids.map((id) => {
              const def = getNutrientDefinition(id);
              if (!def) return null;
              const value = values.nutrients[id] ?? null;
              const pct = pctOf(value, targets[id] ?? null);
              return (
                <div key={id} data-align-group="home-nutrient" className={`flex flex-col justify-center gap-0.5 px-3 ${share ? "h-[34px]" : "max-h-[34px] min-h-7 flex-1"}`}>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="flex min-w-0 items-baseline gap-1 whitespace-nowrap">
                      <span className="text-[13px] font-semibold leading-tight text-text">{def.nameVi}</span>
                      <span className="text-[13px] leading-tight text-secondary tabular-nums">
                        {value === null ? "—" : `${formatAmount(value, def.unit)} ${def.unit}`}
                      </span>
                    </span>
                    <span className="font-display text-[15px] font-bold leading-none text-text tabular-nums">
                      {pctLabel(value, targets[id] ?? null)}
                    </span>
                  </div>
                  <HomeBar label={`${def.nameVi} so với mục tiêu ngày`} pct={pct} finished={finished} />
                </div>
              );
            })}
          </section>
        ))}
      </div>
      {share ? (
        <ul className="m-0 mt-auto flex list-none flex-col gap-1 px-3 pt-3 text-[11px] leading-snug text-secondary">
          {shareKey.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-4 flex-none -skew-x-[14deg] rounded-[1px]" style={{ backgroundColor: item.color }} />
              {item.label}
            </li>
          ))}
        </ul>
      ) : (
        <Link
          href={microsHref}
          className="relative flex h-8 flex-none items-center px-3 text-[13px] font-bold text-blue no-underline before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']"
        >
          Đủ 22 vi chất ›
        </Link>
      )}
    </aside>
  );
}
