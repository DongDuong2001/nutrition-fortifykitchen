"use client";

import React, { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { MAX_QUICK_NAME, quickFieldError, type QuickEntryInput, type QuickEntryResult } from "@/lib/quick-entry";

export interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  mealName: string;
  /** Tries to add. An error names the field to fix; ok closes the sheet (the caller leaves the screen). */
  onSubmit: (input: QuickEntryInput) => QuickEntryResult;
}

const EMPTY: QuickEntryInput = { name: "", kcal: "", protein: "", carbs: "", fat: "" };

const fieldClass = (invalid: boolean) =>
  `h-12 w-full rounded-xl border-2 bg-surface px-3 text-base text-text outline-none transition-colors focus:border-cobalt ${
    invalid ? "border-destructive" : "border-card-border"
  }`;
const numberClass = `${fieldClass(false)} text-right font-bold tabular-nums`;

/**
 * Chỉ thêm kcal: a kcal-only entry. kcal is required (above 0, "2,5" is fine), the name is optional (Thêm nhanh),
 * Đạm, Tinh bột and Béo are optional. The foods' micronutrients stay unknown. Sheet on a phone, dialog on desktop.
 */
export function QuickAddSheet({ open, onClose, mealName, onSubmit }: QuickAddSheetProps) {
  const [input, setInput] = useState<QuickEntryInput>(EMPTY);
  const [error, setError] = useState<{ field: keyof QuickEntryInput; message: string } | null>(null);

  // Every opening starts blank
  useEffect(() => {
    if (open) {
      setInput(EMPTY);
      setError(null);
    }
  }, [open]);

  const set = (field: keyof QuickEntryInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput((prev) => ({ ...prev, [field]: e.target.value }));
    if (error?.field === field) setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onSubmit(input);
    if (result.ok) onClose();
    else setError({ field: result.field, message: result.message });
  };

  const errorFor = (field: keyof QuickEntryInput) => (error?.field === field ? error.message : undefined);
  // cc-62 (S17): a field is checked when it loses focus, not only on submit (like the display name in account-screen)
  const check = (field: "kcal" | "protein" | "carbs" | "fat") => () => {
    const message = quickFieldError(field, input[field]);
    if (message) setError({ field, message });
    else if (error?.field === field) setError(null);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Chỉ thêm kcal" titleId="quick-add-title" desktopDialog>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <p className="m-0 px-1 text-cap leading-snug text-secondary">
          Thêm vào {mealName}. Vi chất của lần ghi này chưa có dữ liệu.
        </p>

        <FormRow label="Tên (không bắt buộc)" htmlFor="quick-name">
          <input
            id="quick-name"
            type="text"
            value={input.name}
            onChange={set("name")}
            placeholder="Thêm nhanh"
            maxLength={MAX_QUICK_NAME}
            autoComplete="off"
            className={fieldClass(false)}
          />
        </FormRow>

        <FormRow label="Năng lượng (kcal)" htmlFor="quick-kcal" required error={errorFor("kcal")}>
          <input
            id="quick-kcal"
            type="text"
            inputMode="decimal"
            value={input.kcal}
            onChange={set("kcal")}
            onBlur={check("kcal")}
            aria-invalid={errorFor("kcal") ? true : undefined}
            placeholder="0"
            autoComplete="off"
            className={`${fieldClass(!!errorFor("kcal"))} text-right font-bold tabular-nums`}
          />
        </FormRow>

        <div className="grid grid-cols-3 gap-2">
          <FormRow label="Đạm (g)" htmlFor="quick-protein" error={errorFor("protein")}>
            <input id="quick-protein" aria-invalid={errorFor("protein") ? true : undefined} type="text" inputMode="decimal" value={input.protein} onChange={set("protein")} onBlur={check("protein")} placeholder="—" autoComplete="off" className={numberClass} />
          </FormRow>
          <FormRow label="Tinh bột (g)" htmlFor="quick-carbs" error={errorFor("carbs")}>
            <input id="quick-carbs" aria-invalid={errorFor("carbs") ? true : undefined} type="text" inputMode="decimal" value={input.carbs} onChange={set("carbs")} onBlur={check("carbs")} placeholder="—" autoComplete="off" className={numberClass} />
          </FormRow>
          <FormRow label="Chất béo (g)" htmlFor="quick-fat" error={errorFor("fat")}>
            <input id="quick-fat" aria-invalid={errorFor("fat") ? true : undefined} type="text" inputMode="decimal" value={input.fat} onChange={set("fat")} onBlur={check("fat")} placeholder="—" autoComplete="off" className={numberClass} />
          </FormRow>
        </div>

        <PillButton type="submit" variant="primary">
          Thêm vào {mealName}
        </PillButton>
        <PillButton type="button" variant="secondary" onClick={onClose}>
          Hủy
        </PillButton>
      </form>
    </Sheet>
  );
}
