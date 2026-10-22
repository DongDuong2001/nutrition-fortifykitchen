import React from "react";
import { LevelBar } from "@/components/ui/level-bar";
import { formatAmount } from "@/lib/format";
import { pctLabel, pctOf } from "@/lib/home";
import { tagLabel, type DayTemplateTag } from "@/lib/day-templates";

/** The tag's dot (NMSave): Ngày tập pink, Ngày nghỉ teal, Khác grey, in the deep shades the meal dots use. */
const TAG_DOT: Record<DayTemplateTag, string> = {
  tap: "bg-deep-pink",
  nghi: "bg-deep-teal",
  khac: "bg-deep-grey",
};

export function TagDot({ tag }: { tag: DayTemplateTag }) {
  return <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${TAG_DOT[tag]}`} />;
}

/** The small chip after a template's name: a dot and the tag. */
export function TagChip({ tag }: { tag: DayTemplateTag }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-surface px-2 text-xs font-bold text-text">
      <TagDot tag={tag} />
      {tagLabel(tag)}
    </span>
  );
}

/**
 * The card body of a day (NMList, NMPicker): the name in Saira with its tag, "N món · X kcal", and a level bar of those kcal against
 * the day's kcal target with its percent. `meals` is the line under the bar the picker adds ("Sáng 459 · Trưa 488").
 */
export function DaySummary({
  name,
  tag,
  itemCount,
  kcal,
  kcalTarget,
  meals,
}: {
  name: string;
  tag?: DayTemplateTag;
  itemCount: number;
  kcal: number;
  kcalTarget: number | null;
  meals?: string;
}) {
  const pct = pctOf(kcal, kcalTarget);
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex min-h-[30px] flex-wrap items-center gap-x-2 gap-y-1">
        <span className="break-words font-display text-body-lg font-extrabold uppercase italic leading-5 tracking-[0.01em]">{name}</span>
        {tag && <TagChip tag={tag} />}
      </span>
      <span className="text-cap leading-snug text-secondary tabular-nums">
        {itemCount} món · {formatAmount(kcal, "kcal")} kcal
      </span>
      <span className="mt-1 flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <LevelBar label={`Kcal so với mục tiêu ngày: ${formatAmount(kcal, "kcal")}${kcalTarget ? ` trên ${formatAmount(kcalTarget, "kcal")}` : ""}`} pct={pct} heightClass="h-2" />
        </span>
        <span className="flex-none font-condensed text-callout font-extrabold leading-none tabular-nums">{pctLabel(kcal, kcalTarget)}</span>
      </span>
      {meals && <span className="text-xs leading-snug text-secondary tabular-nums">{meals}</span>}
    </span>
  );
}
