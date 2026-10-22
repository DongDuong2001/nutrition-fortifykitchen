"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { DaySummary } from "@/components/templates/template-parts";
import { formatAmount } from "@/lib/format";
import type { DayTemplateTag } from "@/lib/day-templates";

/** One card of the picker: Hôm qua (Chép hôm qua), or a saved day. */
export interface PickerOption {
  id: string;
  name: string;
  tag?: DayTemplateTag;
  itemCount: number;
  kcal: number;
  /** "Sáng 459 · Trưa 488": each meal's kcal. */
  meals: string;
}

export interface TemplatePickerSheetProps {
  open: boolean;
  onClose: () => void;
  options: PickerOption[];
  /** Whether there is at least one saved day (the empty state shows when there is none). */
  hasTemplates: boolean;
  kcalTarget: number | null;
  /** "Chép vào Thứ Hai 12/10" */
  applyLabel: string;
  onApply: (id: string) => void;
}

/** "Chọn ngày mẫu" (NMPicker): one radio card per day (Hôm qua first when it has food), then one button that copies it. */
export function TemplatePickerSheet({ open, onClose, ...body }: TemplatePickerSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Chọn ngày mẫu" titleId="template-picker-title" desktopDialog className="bg-page!">
      <PickerBody {...body} onClose={onClose} />
    </Sheet>
  );
}

// Mounted only while the sheet is open: every opening starts on the first card
function PickerBody({ options, hasTemplates, kcalTarget, applyLabel, onApply, onClose }: Omit<TemplatePickerSheetProps, "open">) {
  const [picked, setPicked] = useState<string | null>(options[0]?.id ?? null);
  const current = options.find((o) => o.id === picked) ?? options[0] ?? null;
  return (
    <div className="flex flex-col gap-4 pt-2">
      {options.length > 0 && (
        <div role="radiogroup" aria-label="Ngày mẫu" className="flex flex-col gap-2">
          {options.map((o) => {
            const on = current?.id === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                data-align-group="template-picker"
                onClick={() => setPicked(o.id)}
                className={`m-tint flex w-full cursor-pointer items-start gap-3 rounded-2xl border-0 p-4 text-left text-text ${
                  on ? "bg-cobalt-tint shadow-[inset_0_0_0_2px_var(--color-cobalt)]" : "border border-transparent bg-card shadow-ring"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`-mt-px flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full ${on ? "bg-cobalt" : "shadow-[inset_0_0_0_2px_var(--color-secondary)]"}`}
                >
                  {on && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-on-accent">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </span>
                <DaySummary name={o.name} tag={o.tag} itemCount={o.itemCount} kcal={o.kcal} kcalTarget={kcalTarget} meals={o.meals} />
              </button>
            );
          })}
        </div>
      )}

      {!hasTemplates && (
        <p data-align-group="template-picker" className="m-0 rounded-2xl border border-transparent bg-card px-4 py-3 text-cap leading-snug text-secondary shadow-ring">
          Chưa có ngày mẫu. Ở Hôm nay, mở ⋯ › Lưu ngày này thành mẫu.
        </p>
      )}

      {current && (
        <div role="region" aria-label={`Áp dụng ${current.name}, ${current.itemCount} món, ${formatAmount(current.kcal, "kcal")} kcal`} className="sticky bottom-0 flex flex-col gap-1 rounded-card bg-ink p-2 text-on-dark">
          <div className="flex min-h-9 items-center px-3">
            <span aria-hidden="true" className="text-callout font-semibold tabular-nums">
              {current.itemCount} món · <span className="font-display text-body-lg font-extrabold italic">{formatAmount(current.kcal, "kcal")}</span> kcal
            </span>
          </div>
          <PillButton
            type="button"
            variant="primary"
            onClick={() => {
              onApply(current.id);
              onClose();
            }}
            className="h-12! text-callout"
          >
            {applyLabel}
          </PillButton>
        </div>
      )}
    </div>
  );
}
