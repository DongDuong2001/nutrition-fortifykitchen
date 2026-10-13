"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmailField } from "@/components/auth/email-field";
import { PasswordField } from "@/components/auth/password-field";
import { PillButton } from "@/components/ui/pill-button";
import { signInWithPassword, validateEmail, validateRequiredPassword } from "@/lib/auth-actions";
import { readPendingEmail } from "@/lib/onboarding";

/** Email and password sign-in (sits above the magic link). A failed sign-in shows one generic message. */
export function PasswordSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmail(readPendingEmail());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailError = validateEmail(email);
    const passwordError = validateRequiredPassword(password);
    if (emailError || passwordError) {
      setErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
      return;
    }

    setBusy(true);
    const result = await signInWithPassword(email, password);
    if (result.ok) {
      router.push("/");
      return;
    }
    setErrors({ password: result.error });
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <EmailField value={email} onChange={setEmail} error={errors.email} />
      <PasswordField
        label="Mật khẩu"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
      />
      <Link
        href="/signin/forgot"
        className="inline-flex min-h-[44px] items-center self-end px-2 text-[15px] font-semibold text-blue"
      >
        Quên mật khẩu?
      </Link>
      <PillButton type="submit" disabled={busy}>
        Đăng nhập
      </PillButton>
    </form>
  );
}
