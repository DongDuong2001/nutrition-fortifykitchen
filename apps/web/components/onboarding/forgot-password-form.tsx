"use client";

import { useEffect, useState, type FormEvent } from "react";
import { EmailField } from "@/components/auth/email-field";
import { PillButton } from "@/components/ui/pill-button";
import { sendPasswordReset, validateEmail } from "@/lib/auth-actions";
import { readPendingEmail } from "@/lib/onboarding";

/** Email for a reset link. It says the same thing whether or not the account exists. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmail(readPendingEmail());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailError = validateEmail(email);
    setError(emailError ?? undefined);
    if (emailError) return;

    setBusy(true);
    const result = await sendPasswordReset(email);
    setBusy(false);
    if (result.ok) {
      setSent(true);
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <EmailField value={email} onChange={setEmail} error={error} />
      <PillButton type="submit" disabled={busy}>
        Gửi liên kết đặt lại
      </PillButton>
      {sent && (
        <p role="status" className="m-0 text-center text-callout font-semibold text-text">
          Kiểm tra email để đặt lại mật khẩu
        </p>
      )}
    </form>
  );
}
