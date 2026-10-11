"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { isValidEmail, readPendingEmail, writePendingEmail } from "@/lib/onboarding";
import { PillButton } from "@/components/ui/pill-button";

/** Email field that sends a magic link (no password). Used by sign-up, sign-in and the expired link screen. */
export function MagicLinkForm({ submitLabel }: { submitLabel: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const errorId = useId();
  const inputId = useId();

  useEffect(() => {
    setEmail(readPendingEmail());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!isValidEmail(value)) {
      setError("Nhập email hợp lệ, ví dụ ban@email.com");
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
      <label htmlFor={inputId} className="flex flex-col gap-2 text-[13px] font-semibold text-text">
        Email
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="ban@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-12 w-full rounded-[10px] border-2 border-grabber bg-card px-4 text-base text-text placeholder:text-secondary outline-none focus:border-blue"
        />
      </label>
      {error && (
        <p id={errorId} role="alert" className="m-0 text-[13px] text-destructive">
          {error}
        </p>
      )}
      <PillButton type="submit" disabled={sending}>
        {submitLabel}
      </PillButton>
    </form>
  );
}
