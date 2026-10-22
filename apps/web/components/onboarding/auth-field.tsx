"use client";

import { cloneElement, isValidElement, useId, useState } from "react";
import { AlertLine } from "@/components/ui/alert-line";
import { IconButton } from "@/components/ui/icon-button";
import { IconEye, IconEyeOff } from "@/components/ui/icons";
import { fieldClass } from "@/components/foods/food-field";

/**
 * The fields of the auth and setup screens (V3 SignIn, SetupProfile): a visible 13 px label (with a short note at its right
 * end when the field has a rule to say), the 48 px white field with its hairline ring, a 12 px helper under it, and the
 * error in the line right under that. The control is described by the helper and the error (aria-describedby) and marked
 * invalid. Errors keep the id `<htmlFor>-error`, as FormRow's did.
 */
export const authHintId = (htmlFor: string) => `${htmlFor}-hint`;
export const authErrorId = (htmlFor: string) => `${htmlFor}-error`;

export function AuthField({
  label,
  htmlFor,
  aside,
  hint,
  error,
  className = "",
  group = false,
  "data-align-group": alignGroup,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  /** The control is a group (radios), not an input: the label is a text with the id `<htmlFor>-label` for aria-labelledby. */
  group?: boolean;
  /** Right of the label: "Bắt buộc", "Từ 1920 đến 2015". */
  aside?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  "data-align-group"?: string;
  children: React.ReactNode;
}) {
  const hintId = hint ? authHintId(htmlFor) : undefined;
  const errorId = error ? authErrorId(htmlFor) : undefined;
  const control =
    isValidElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>(children) && children.type === "input"
      ? cloneElement(children, {
          "aria-describedby": [children.props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined,
          "aria-invalid": error ? true : undefined,
        })
      : children;
  return (
    <div data-align-group={alignGroup} className={`flex w-full min-w-0 flex-col ${className}`}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
        {group ? (
          <span id={`${htmlFor}-label`} className="text-cap font-semibold text-text">
            {label}
          </span>
        ) : (
          <label htmlFor={htmlFor} className="text-cap font-semibold text-text">
            {label}
          </label>
        )}
        {aside && <span className="text-xs text-secondary">{aside}</span>}
      </div>
      {control}
      {hint && (
        <span id={hintId} className="mt-1 text-xs leading-snug text-secondary">
          {hint}
        </span>
      )}
      <AlertLine show={!!error} gap={0} as="span" id={errorId} className="block pt-1 text-cap font-semibold leading-snug text-destructive-text">
        {error}
      </AlertLine>
    </div>
  );
}

/** The one email field of the sign-in screens. */
export function AuthEmailField({
  value,
  onChange,
  error,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: React.ReactNode;
}) {
  const id = useId();
  return (
    <AuthField label="Email" htmlFor={id} hint={hint} error={error}>
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
        className={`${fieldClass({ bad: !!error })} text-base`}
      />
    </AuthField>
  );
}

/** A password field with its show/hide button (44 px, "Hiện mật khẩu" / "Ẩn mật khẩu"). */
export function AuthPasswordField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: React.ReactNode;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <AuthField label={label} htmlFor={id} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClass({ bad: !!error })} pr-14 text-base`}
        />
        <IconButton
          onClick={() => setVisible((v) => !v)}
          label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-controls={id}
          className="absolute right-0 top-1/2 -translate-y-1/2 text-secondary"
        >
          {visible ? <IconEyeOff size={22} /> : <IconEye size={22} />}
        </IconButton>
      </div>
    </AuthField>
  );
}

export interface AuthPasswordErrors {
  password?: string;
  confirm?: string;
}

/** A new password and its confirmation (sign-up, reset). The rule is said before the user types, so an error only shows when it is broken. */
export function AuthNewPasswordFields({
  newLabel = "Mật khẩu mới",
  password,
  confirm,
  errors,
  onPasswordChange,
  onConfirmChange,
}: {
  newLabel?: string;
  password: string;
  confirm: string;
  errors: AuthPasswordErrors;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
}) {
  return (
    <>
      <AuthPasswordField
        label={newLabel}
        hint="Ít nhất 8 ký tự, có chữ và số"
        placeholder="Ví dụ: vichat2026"
        value={password}
        onChange={onPasswordChange}
        error={errors.password}
        autoComplete="new-password"
      />
      <AuthPasswordField
        label="Nhập lại mật khẩu"
        placeholder="Gõ lại mật khẩu ở trên"
        value={confirm}
        onChange={onConfirmChange}
        error={errors.confirm}
        autoComplete="new-password"
      />
    </>
  );
}
