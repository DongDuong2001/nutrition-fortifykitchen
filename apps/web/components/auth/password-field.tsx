"use client";

import { useId, useState } from "react";
import { FormRow } from "@/components/ui/form-row";

export interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  id?: string;
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {hidden && <path d="M4 4l16 16" />}
    </svg>
  );
}

/**
 * A password field with a show/hide button (44 px, aria-label "Hiện mật khẩu" or "Ẩn mật khẩu").
 * The error sits under the field through FormRow.
 */
export function PasswordField({ label, value, onChange, error, autoComplete, hint, id }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <FormRow label={label} htmlFor={inputId} error={error} hint={hint}>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={`h-[52px] w-full rounded-xl border-2 bg-card py-0 pl-4 pr-14 text-base text-text placeholder:text-secondary outline-none focus:border-blue focus-visible:ring-2 focus-visible:ring-blue ${
            error ? "border-destructive" : "border-grabber"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-controls={inputId}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-secondary transition-transform duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-blue motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <EyeIcon hidden={visible} />
        </button>
      </div>
    </FormRow>
  );
}
