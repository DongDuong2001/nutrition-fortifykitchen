"use client";

import React, { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Segmented } from "@/components/ui/segmented";
import { PillButton } from "@/components/ui/pill-button";
import { SettingsTile } from "@/components/ui/settings-tile";
import { TagDot } from "@/components/templates/template-parts";
import { TemplateGlyphShapes } from "@/components/templates/template-glyph";
import { DAY_TEMPLATE_TAGS, templateSaveSummary, type DayTemplateMeal, type DayTemplateTag } from "@/lib/day-templates";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { CATALOG_FOODS } from "@/lib/catalog";
import { kcalLabel } from "@/lib/kcal";

export interface SaveDaySheetProps {
  open: boolean;
  onClose: () => void;
  /** What the day holds, as it is saved: the summary reads "6 món · 936 kcal" from it. */
  meals: DayTemplateMeal[];
  /** "Sáng · Trưa · Trước tập": the meals that have food. */
  mealsText: string;
  /** The name field's start: "Ngày tập" on a training day, otherwise empty. */
  defaultName: string;
  defaultTag: DayTemplateTag;
  onSave: (name: string, tag: DayTemplateTag) => void;
}

/** "Lưu ngày này thành mẫu" (NMSave): the day's summary, a name, a tag, and Lưu mẫu. A sheet on a phone, a dialog on desktop. */
export function SaveDaySheet({ open, onClose, ...body }: SaveDaySheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Lưu ngày này thành mẫu" titleId="save-day-title" desktopDialog className="bg-page!">
      <SaveBody {...body} onClose={onClose} />
    </Sheet>
  );
}

// Mounted only while the sheet is open, so every opening starts from the day's own name and tag
function SaveBody({ meals, mealsText, defaultName, defaultTag, onSave, onClose }: Omit<SaveDaySheetProps, "open">) {
  const [name, setName] = useState(defaultName);
  // The kcal come from the catalogue: while the sheet is open it is asked for (a device that did not log the day may not
  // have it yet) and the summary reads again when it comes. The count never waits for it.
  const { version } = useCatalogFoods();
  const totals = useMemo(() => templateSaveSummary(meals, CATALOG_FOODS), [meals, version]);
  const summary = `${totals.itemCount} món${totals.kcal === null ? "" : ` · ${kcalLabel(totals.kcal)}`}`;
  const [tag, setTag] = useState<DayTemplateTag>(defaultTag);
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSave(name, tag);
        onClose();
      }}
      className="flex flex-col gap-4 pt-2"
    >
      <div data-align-group="save-day" className="flex min-h-16 items-center gap-3 rounded-2xl border border-transparent bg-card px-4 py-3 shadow-ring">
        <SettingsTile tone="language">
          <TemplateGlyphShapes />
        </SettingsTile>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-callout font-semibold leading-snug tabular-nums">{summary}</span>
          <span className="text-cap leading-snug text-secondary">{mealsText}</span>
        </span>
      </div>

      <div data-align-group="save-day" className="flex flex-col gap-2">
        <label htmlFor="save-day-name" className="text-cap font-semibold text-text">
          Tên mẫu
        </label>
        <input
          id="save-day-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          className="h-12 w-full rounded-xl border-0 bg-card px-4 text-base text-text shadow-field outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]"
        />
      </div>

      <div data-align-group="save-day" className="flex flex-col gap-2">
        <span className="text-cap font-semibold text-text">Nhãn</span>
        <Segmented
          label="Nhãn"
          value={tag}
          onChange={setTag}
          items={DAY_TEMPLATE_TAGS.map((t) => ({
            key: t.key,
            label: (
              <span className="inline-flex items-center gap-1.5">
                <TagDot tag={t.key} />
                {t.label}
              </span>
            ),
          }))}
        />
      </div>

      <div data-align-group="save-day" className="mt-1 flex flex-col gap-2">
        <PillButton type="submit" variant="primary">
          Lưu mẫu
        </PillButton>
        <p className="m-0 text-center text-xs leading-snug text-secondary">Mẫu nằm trong Khám phá › Của bạn › Ngày ăn mẫu</p>
      </div>
    </form>
  );
}
