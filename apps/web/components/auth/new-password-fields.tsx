"use client";

import { PasswordField } from "@/components/auth/password-field";

export interface NewPasswordErrors {
  password?: string;
  confirm?: string;
}

/**
 * A new password and its confirmation (sign-up, reset and change). The rules are in lib/auth-actions.ts;
 * the hint says them before the user types, so the error only appears when a rule is broken.
 */
export function NewPasswordFields({
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
  errors: NewPasswordErrors;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
}) {
  return (
    <>
      <PasswordField
        label={newLabel}
        hint="Ít nhất 8 ký tự, có chữ và số"
        value={password}
        onChange={onPasswordChange}
        error={errors.password}
        autoComplete="new-password"
      />
      <PasswordField
        label="Nhập lại mật khẩu"
        value={confirm}
        onChange={onConfirmChange}
        error={errors.confirm}
        autoComplete="new-password"
      />
    </>
  );
}
