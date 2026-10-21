"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { readPendingEmail, writePendingEmail } from "@/lib/onboarding";
import { requestMagicLink, validateEmail } from "@/lib/auth-actions";
import Link from "next/link";
import { AuthEmailField } from "@/components/onboarding/auth-field";
import { StatusScreen, type StatusScreenProps } from "@/components/onboarding/status-screen";
import { PillButton } from "@/components/ui/pill-button";

/**
 * The expired-link screen's body: the status header (`status`), the email field that sends a magic link (no password), and
 * the buttons at the bottom. The form is the page, so Enter sends it.
 */
export function MagicLinkForm({
  submitLabel,
  hint,
  status,
}: {
  submitLabel: string;
  hint: string;
  status: Pick<StatusScreenProps, "icon" | "tone" | "title" | "body">;
}) {
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
      const result = await requestMagicLink(value);
      if (!result.ok) {
        setError(result.error);
        setSending(false);
        return;
      }
      writePendingEmail(value);
      router.push("/signin/check-email");
    } catch {
      setError("Chưa gửi được liên kết. Thử lại sau ít phút.");
      setSending(false);
    }
  }

  return (
    <StatusScreen
      as="form"
      formProps={{ onSubmit: handleSubmit }}
      {...status}
      actions={
        <>
          <PillButton type="submit" disabled={sending}>
            {submitLabel}
          </PillButton>
          <div className="flex flex-col items-center">
            <Link href="/signin" className="inline-flex min-h-11 items-center px-2 text-callout font-semibold text-cobalt">
              Quay lại
            </Link>
          </div>
        </>
      }
    >
      <div className="mt-8">
        <AuthEmailField value={email} onChange={setEmail} error={error ?? undefined} hint={hint} />
      </div>
    </StatusScreen>
  );
}
