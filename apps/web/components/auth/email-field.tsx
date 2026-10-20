"use client";

import { useId } from "react";
import { FormRow } from "@/components/ui/form-row";

/** The one email field of the sign-in and account screens. The error sits under it through FormRow. */
export function EmailField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const id = useId();
  return (
    <FormRow label="Email" htmlFor={id} error={error}>
      <input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="ban@email.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={`h-[52px] w-full rounded-xl border-2 bg-surface px-4 text-base text-text placeholder:text-secondary outline-none focus:border-cobalt focus-visible:ring-2 focus-visible:ring-cobalt ${
          error ? "border-destructive" : "border-grabber"
        }`}
      />
    </FormRow>
  );
}
