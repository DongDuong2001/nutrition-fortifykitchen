"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EmailField } from "@/components/auth/email-field";
import { NewPasswordFields, type NewPasswordErrors } from "@/components/auth/new-password-fields";
import { PillButton } from "@/components/ui/pill-button";
import { signUpWithPassword, validateEmail, validateNewPassword, validatePasswordConfirm } from "@/lib/auth-actions";
import { readPendingEmail } from "@/lib/onboarding";

/** Sign-up with a password. The rules are checked here first; the only server error is an email already in use. */
export function SignUpPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ email?: string } & NewPasswordErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmail(readPendingEmail());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = {
      email: validateEmail(email) ?? undefined,
      password: validateNewPassword(password) ?? undefined,
      confirm: validatePasswordConfirm(password, confirm) ?? undefined,
    };
    setErrors(next);
    if (next.email || next.password || next.confirm) return;

    setBusy(true);
    const result = await signUpWithPassword(email, password);
    if (result.ok) {
      router.push("/setup/profile");
      return;
    }
    setErrors({ email: result.error });
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <EmailField value={email} onChange={setEmail} error={errors.email} />
      <NewPasswordFields
        newLabel="Mật khẩu"
        password={password}
        confirm={confirm}
        errors={errors}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirm}
      />
      <PillButton type="submit" disabled={busy}>
        Tạo tài khoản
      </PillButton>
    </form>
  );
}
