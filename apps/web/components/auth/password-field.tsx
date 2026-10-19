"use client";

import { useId, useState } from "react";
import { FormRow } from "@/components/ui/form-row";
import { IconEye, IconEyeOff } from "@/components/ui/icons";

export interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  id?: string;
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
          className={`h-[52px] w-full rounded-xl border-2 bg-surface py-0 pl-4 pr-14 text-base text-text placeholder:text-secondary outline-none focus:border-cobalt focus-visible:ring-2 focus-visible:ring-cobalt ${
            error ? "border-destructive" : "border-grabber"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-controls={inputId}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-secondary active:scale-[0.97] transition-press focus-visible:ring-2 focus-visible:ring-cobalt motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {visible ? <IconEyeOff size={22} /> : <IconEye size={22} />}
        </button>
      </div>
    </FormRow>
  );
}
