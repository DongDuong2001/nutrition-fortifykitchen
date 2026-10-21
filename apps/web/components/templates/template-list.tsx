"use client";

import React from "react";
import Link from "next/link";
import { PillButton } from "@/components/ui/pill-button";
import { SettingsTile } from "@/components/ui/settings-tile";
import { DaySummary } from "@/components/templates/template-parts";
import { TemplateGlyphShapes } from "@/components/templates/template-glyph";
import { useDiary } from "@/lib/diary-store";
import { useDayTemplateRows } from "@/hooks/use-day-templates";
import { formatAmount } from "@/lib/format";
import { tagLabel } from "@/lib/day-templates";
import { HOME_ROUTE } from "@/lib/home-route";

const EMPTY_TEXT = "Chưa có ngày mẫu. Ở Hôm nay, mở ⋯ › Lưu ngày này thành mẫu.";

/** NMList: one card per saved day (name, tag, "N món · X kcal", a level bar against today's kcal target), then + Tạo ngày mẫu. */
export function DayTemplateList() {
  const { data, hydrated } = useDiary();
  const { rows } = useDayTemplateRows();
  const kcalTarget = data.calories.targetMin;

  return (
    <>
      {!hydrated ? (
        <div aria-hidden="true" className="h-[136px] rounded-card bg-level-empty motion-safe:animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="m-0 rounded-card border border-transparent bg-card p-4 text-callout leading-snug text-secondary shadow-ring">{EMPTY_TEXT}</p>
      ) : (
        rows.map(({ template, itemCount, kcal }) => (
          <Link
            key={template.id}
            href={`/explore/ngay-mau/${template.id}`}
            data-align-group="day-templates"
            aria-label={`${template.name}, ${tagLabel(template.tag)}, ${itemCount} món, ${formatAmount(kcal, "kcal")} kcal`}
            className="m-tint flex items-start gap-3 rounded-card border border-transparent bg-card p-4 text-text no-underline shadow-ring transition-press"
          >
            <SettingsTile tone="language">
              <TemplateGlyphShapes />
            </SettingsTile>
            <DaySummary name={template.name} tag={template.tag} itemCount={itemCount} kcal={kcal} kcalTarget={kcalTarget} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="-mr-1 shrink-0 self-center text-secondary" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </Link>
        ))
      )}

      {/* "Create" is saving a day: a template needs foods, and the foods are the ones logged on Hôm nay */}
      <PillButton variant="secondary" href={HOME_ROUTE} className="mt-1 gap-2 border-0! shadow-[inset_0_0_0_1.5px_var(--color-text)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Tạo ngày mẫu
      </PillButton>
      <p className="m-0 text-center text-cap leading-snug text-secondary">Mẹo: ở Hôm nay, mở ⋯ › Lưu ngày này thành mẫu.</p>
    </>
  );
}
