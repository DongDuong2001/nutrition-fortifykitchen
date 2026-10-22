"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { SectionTitle } from "@/components/ui/section-title";
import { EmptyState } from "@/components/ui/empty-state";
import { FoodSearchField } from "@/components/foods/food-search-field";
import { PINNED_EXTRA_KEYS, extraFieldsFor, type LabelField } from "@/lib/custom-food-fields";
import { nutrientDot } from "@/lib/nutrient-colors";

/**
 * "+ Thêm vi chất khác" of Tạo món mới › Tự nhập: every tracked vitamin and mineral the form does not show yet. Calcium, Iron,
 * Potassium and Vitamin D first, then Vitamin and Khoáng chất. A tap adds the field to the form (the sheet closes, the form
 * focuses it); an added one leaves this list until its × takes it off the form.
 */
export function NutrientPickerSheet({
  open,
  onClose,
  added,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  added: readonly string[];
  onPick: (key: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Thêm vi chất khác" titleId="nutrient-picker-title" desktopDialog>
      <PickerBody added={added} onPick={onPick} />
    </Sheet>
  );
}

// Mounted only while the sheet is open, so each opening starts with a blank search
function PickerBody({ added, onPick }: { added: readonly string[]; onPick: (key: string) => void }) {
  const [query, setQuery] = useState("");
  const left = extraFieldsFor({ added, query });
  const pinned = left.filter((f) => (PINNED_EXTRA_KEYS as readonly string[]).includes(f.key));
  const rest = left.filter((f) => !pinned.includes(f));
  // The pinned four come first, in a card of their own with no heading (its name is for screen readers)
  const groups = [
    { id: "pinned", title: null, fields: pinned },
    { id: "vitamins", title: "Vitamin", fields: rest.filter((f) => f.group === "vitamins") },
    { id: "minerals", title: "Khoáng chất", fields: rest.filter((f) => f.group === "minerals") },
  ].filter((g) => g.fields.length > 0);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <FoodSearchField value={query} onChange={setQuery} tone="sheet" label="Tìm vi chất" placeholder="Tìm: Magnesium, Zinc, B12…" className="shrink-0" />
      <div data-nutrient-picker-list className="flex max-h-[52dvh] flex-col gap-4 overflow-y-auto">
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={g.title ? `np-${g.id}` : undefined} aria-label={g.title ? undefined : "Hay có trên nhãn"} className="flex flex-col gap-2">
            {g.title && (
              <SectionTitle as="h3" size="sm" id={`np-${g.id}`} className="px-1 text-secondary">
                {g.title}
              </SectionTitle>
            )}
            <ul data-align-group="nutrient-picker" className="m-0 flex list-none flex-col rounded-card border border-transparent bg-card p-0 shadow-ring">
              {g.fields.map((f, i) => (
                <li key={f.key} className={i > 0 ? "border-t border-divider" : ""}>
                  <button
                    type="button"
                    onClick={() => onPick(f.key)}
                    className="m-tint flex min-h-12 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 text-left text-callout text-text transition-press"
                  >
                    <Dot field={f} />
                    <span className="min-w-0 flex-1 font-semibold">{f.label}</span>
                    <span className="shrink-0 text-cap text-secondary">{f.unit}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-cobalt" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {left.length === 0 && (
          <EmptyState title={query.trim() ? `Không có “${query.trim()}”` : "Đã thêm hết vi chất"}>
            {query.trim() ? "Thử từ ngắn hơn hoặc bỏ dấu." : null}
          </EmptyState>
        )}
      </div>
    </div>
  );
}

function Dot({ field }: { field: LabelField }) {
  return <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: nutrientDot(field.key) }} />;
}
