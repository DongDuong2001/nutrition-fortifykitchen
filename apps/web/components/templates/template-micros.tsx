import React from "react";
import { MicroRow } from "@/components/home/nutrient-column";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-title";
import { formatAmount } from "@/lib/format";
import type { HomeValues } from "@/lib/home";
import { isExtra, type ColumnGroup } from "@/lib/level-nutrients";
import { getNutrientDefinition } from "@/lib/nutrients";

/** The macros under the kcal of Tổng: the amount, and the day's target after it. Unknown is a dash, never 0. */
const MACROS: { key: "protein" | "carbs" | "fat" | "fiber"; label: string }[] = [
  { key: "carbs", label: "Tinh bột" },
  { key: "protein", label: "Đạm" },
  { key: "fat", label: "Chất béo" },
  { key: "fiber", label: "Chất xơ" },
];

export function TemplateMacros({ values, targets }: { values: HomeValues; targets: Record<"protein" | "carbs" | "fat" | "fiber", number | null> }) {
  return (
    <dl data-align-group="template-macros" className="m-0 grid grid-cols-2 gap-x-2 gap-y-2 min-[480px]:grid-cols-4">
      {MACROS.map(({ key, label }) => {
        const value = values[key];
        const target = targets[key];
        return (
          <div key={key} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-cap text-secondary">{label}</dt>
            <dd className="m-0 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 font-condensed text-callout font-extrabold leading-none tabular-nums">
              <span className="whitespace-nowrap">{value === null ? "—" : `${formatAmount(value, "g")} g`}</span>
              {target !== null && <span className="whitespace-nowrap font-sans text-xs font-normal text-secondary">/ {formatAmount(target, "g")} g</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Vi chất of the template being built: all 22 micros at every Level (Khoáng chất, Vitamin) and, from Level 3, the extras as amounts
 * only, each against the day's target, with "x/N đạt" and the lowest ones first. It is there so a few meal sets can be tried and
 * read against each other without copying any into the diary.
 */
export function TemplateMicros({
  values,
  extras,
  groups,
  targets,
  summary,
  empty,
}: {
  values: HomeValues;
  extras: Record<string, number | null>;
  groups: ColumnGroup[];
  targets: Record<string, number | null>;
  summary: { reached: number; total: number; lacking: string[] };
  empty: boolean;
}) {
  return (
    <section aria-labelledby="tpl-micros" className="flex flex-col gap-1">
      <SectionHeader id="tpl-micros" className="flex min-h-11 items-center">
        Vi chất
      </SectionHeader>
      <Card padding={false} className="overflow-hidden">
        {empty ? (
          <p className="m-0 p-4 text-cap leading-snug text-secondary">Thêm món vào các bữa để xem vi chất của cả ngày.</p>
        ) : (
          <>
            <p data-template-summary className="m-0 flex flex-col gap-2 px-3 pb-2 pt-3 text-text">
              <span className="block text-body-lg font-bold leading-none">
                <span className="font-condensed text-[2.5rem] font-extrabold leading-none tabular-nums text-cobalt">
                  {summary.reached}/{summary.total}
                </span>{" "}
                đạt
              </span>
              {summary.lacking.length > 0 && (
                <span className="text-sm leading-5">
                  <span className="text-text/75">Thiếu nhiều nhất:</span> <b className="text-callout font-bold text-text">{summary.lacking.join(", ")}</b>
                </span>
              )}
            </p>
            {groups.map((group) => (
              <section key={group.title} aria-label={group.title} className="flex flex-col">
                <h3 className="relative m-0 p-3 font-display text-body-lg font-extrabold uppercase leading-5 tracking-[0.01em] text-text before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-divider before:content-['']">
                  {group.title}
                </h3>
                {group.ids.map((id) => {
                  const def = getNutrientDefinition(id);
                  if (!def) return null;
                  if (isExtra(id)) {
                    const amount = extras[id] ?? null;
                    return (
                      <div key={id} data-align-group="home-nutrient" data-extra className="flex min-h-11 items-center justify-between gap-2 px-3 py-1">
                        <span className="min-w-0 break-words text-callout font-semibold leading-snug text-text">{def.name}</span>
                        <span className="shrink-0 text-xs leading-tight text-secondary tabular-nums">
                          {amount === null ? "chưa có dữ liệu" : `${formatAmount(amount, def.unit)} ${def.unit}`}
                        </span>
                      </div>
                    );
                  }
                  return <MicroRow key={id} id={id} name={def.name} unit={def.unit} value={values.nutrients[id] ?? null} target={targets[id] ?? null} />;
                })}
              </section>
            ))}
          </>
        )}
      </Card>
    </section>
  );
}
