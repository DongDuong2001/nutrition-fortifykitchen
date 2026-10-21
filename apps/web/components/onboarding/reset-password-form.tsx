"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthNewPasswordFields, type AuthPasswordErrors } from "@/components/onboarding/auth-field";
import { PillButton } from "@/components/ui/pill-button";
import { setAuthNotice, updatePassword, validateNewPassword, validatePasswordConfirm } from "@/lib/auth-actions";

/** The new password after a reset link. Saves, then back to sign-in with a toast. */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<AuthPasswordErrors>({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = {
      password: validateNewPassword(password) ?? undefined,
      confirm: validatePasswordConfirm(password, confirm) ?? undefined,
    };
    setErrors(next);
    if (next.password || next.confirm) return;

    setBusy(true);
    const result = await updatePassword(password);
    if (result.ok) {
      setAuthNotice("Đã đặt lại mật khẩu");
      router.push("/signin");
      return;
    }
    setErrors({ password: result.error });
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <AuthNewPasswordFields
        password={password}
        confirm={confirm}
        errors={errors}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirm}
      />
      <PillButton type="submit" disabled={busy}>
        Đặt lại mật khẩu
      </PillButton>
    </form>
  );
}
