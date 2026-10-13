"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { readPendingEmail, writePendingEmail } from "@/lib/onboarding";
import { validateEmail } from "@/lib/auth-actions";
import { EmailField } from "@/components/auth/email-field";
import { PillButton } from "@/components/ui/pill-button";

/** Email field that sends a magic link (no password). Used by sign-up, sign-in and the expired link screen. */
export function MagicLinkForm({ submitLabel }: { submitLabel: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setEmail(readPendingEmail());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    const emailError = validateEmail(value);
    if (emailError) {
      setError(emailError);
      return;
    }

    setSending(true);
    setError(null);
    try {
      await apiClient.requestMagicLink(value);
      writePendingEmail(value);
      router.push("/signin/check-email");
    } catch {
      setError("Chưa gửi được link. Thử lại sau ít phút.");
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <EmailField value={email} onChange={setEmail} error={error ?? undefined} />
      <PillButton type="submit" disabled={sending}>
        {submitLabel}
      </PillButton>
    </form>
  );
}
