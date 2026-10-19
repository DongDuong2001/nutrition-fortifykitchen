"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/auth/password-field";
import { NewPasswordFields, type NewPasswordErrors } from "@/components/auth/new-password-fields";
import { SignedOutCard } from "@/components/settings/account-screen";
import { useAccount } from "@/components/settings/use-account";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import {
  WRONG_CURRENT_PASSWORD,
  setAuthNotice,
  updatePassword,
  validateNewPassword,
  validatePasswordConfirm,
  validateRequiredPassword,
} from "@/lib/auth-actions";

type PasswordErrors = NewPasswordErrors & { current?: string };

/** Đổi mật khẩu, or Đặt mật khẩu when the account has none yet. The current password is asked only when there is one. */
function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: PasswordErrors = {
      current: hasPassword ? (validateRequiredPassword(current) ?? undefined) : undefined,
      password: validateNewPassword(password) ?? undefined,
      confirm: validatePasswordConfirm(password, confirm) ?? undefined,
    };
    setErrors(next);
    if (next.current || next.password || next.confirm) return;

    setBusy(true);
    const result = await updatePassword(password, hasPassword ? current : undefined);
    if (result.ok) {
      setAuthNotice(hasPassword ? "Đã đổi mật khẩu" : "Đã đặt mật khẩu");
      router.push("/settings/account");
      return;
    }
    setErrors(result.error === WRONG_CURRENT_PASSWORD ? { current: result.error } : { password: result.error });
    setBusy(false);
  }

  return (
    <Card as="section" aria-label={hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        {hasPassword && (
          <PasswordField
            label="Mật khẩu hiện tại"
            autoComplete="current-password"
            value={current}
            onChange={setCurrent}
            error={errors.current}
          />
        )}
        <NewPasswordFields
          password={password}
          confirm={confirm}
          errors={errors}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
        />
        <PillButton type="submit" disabled={busy}>
          Lưu mật khẩu
        </PillButton>
      </form>
    </Card>
  );
}

/** The password screen, pushed from Tài khoản. */
export function PasswordScreen() {
  const { loaded, account } = useAccount();
  const title = !loaded ? "Mật khẩu" : account?.hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu";

  return (
    <AppShell alignContainer="password-page">
      <AppHeader variant="sub" title={title} backHref="/settings/account" layout="wide" alignGroup="password-header" />

      <main className="mx-auto grid w-full max-w-[560px] grid-cols-1 items-start gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:px-8 lg:pb-12 lg:pt-5">
        {!loaded ? (
          <div aria-busy="true" aria-live="polite" className="h-[280px] rounded-card bg-divider animate-pulse motion-reduce:animate-none" />
        ) : account ? (
          <PasswordForm hasPassword={account.hasPassword} />
        ) : (
          <SignedOutCard />
        )}
      </main>
    </AppShell>
  );
}
