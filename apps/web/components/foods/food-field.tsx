import React from "react";
import { AlertLine } from "@/components/ui/alert-line";

/**
 * The form field of Tạo món mới (V3 CreateFood, D-WRT-07): a visible 13 px label, the control, and its error right under
 * it. Fields are 48 px high with 16 px text (no iOS zoom). On the grey page a field is white with a hairline ring; inside a
 * white card it is the #EEEEF3 field with a 2 px edge. Focus makes the edge cobalt, an error makes it red.
 */
export const fieldErrorId = (htmlFor: string) => `${htmlFor}-error`;

export function fieldClass({ bad = false, inCard = false, number = false }: { bad?: boolean; inCard?: boolean; number?: boolean } = {}): string {
  const base = "h-12 w-full min-w-0 rounded-xl border-0 px-3 text-base text-text outline-none transition-colors placeholder:font-normal placeholder:text-secondary";
  const fill = inCard ? "bg-surface" : "bg-card";
  const edge = bad
    ? "shadow-[inset_0_0_0_2px_var(--color-destructive-text)]"
    : `${inCard ? "shadow-[inset_0_0_0_2px_var(--color-card-border)]" : "shadow-field"} focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]`;
  return `${base} ${fill} ${edge} ${number ? "text-right font-bold tabular-nums" : ""}`;
}

export function Field({
  label,
  htmlFor,
  required = false,
  dot,
  error,
  className = "",
  "data-align-group": alignGroup,
  action,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  required?: boolean;
  /** A macro identity colour class (bg-macro-…) or a nutrient colour as a CSS value: the 8 px dot before the label */
  dot?: { className?: string; color?: string };
  error?: React.ReactNode;
  className?: string;
  "data-align-group"?: string;
  /** A control at the end of the label row (the × of an added nutrient) */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const labelEl = (
    <label htmlFor={htmlFor} className="text-cap font-semibold text-text">
      {dot && <span aria-hidden="true" className={`mr-2 inline-block h-2 w-2 rounded-full align-[1px] ${dot.className ?? ""}`} style={dot.color ? { backgroundColor: dot.color } : undefined} />}
      {label}
      {required && (
        <>
          <span aria-hidden="true"> *</span>
          <span className="sr-only"> (bắt buộc)</span>
        </>
      )}
    </label>
  );
  return (
    <div data-align-group={alignGroup} className={`flex min-w-0 flex-col gap-2 ${className}`}>
      {action ? (
        <div className="flex min-h-6 items-center justify-between gap-2">
          {labelEl}
          {action}
        </div>
      ) : (
        labelEl
      )}
      {children}
      <AlertLine show={!!error} gap={2} id={fieldErrorId(htmlFor)} className="m-0 px-1 text-cap font-semibold leading-snug text-destructive-text">
        {error}
      </AlertLine>
    </div>
  );
}

/** A number field with its unit beside it (kcal, g, mg, µg): the unit is a 32 px column so the fields share one right edge. */
export function UnitField({ unit, children }: { unit: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {children}
      <span className="w-8 shrink-0 text-cap text-secondary">{unit}</span>
    </div>
  );
}
