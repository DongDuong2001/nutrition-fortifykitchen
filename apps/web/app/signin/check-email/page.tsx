"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/onboarding/auth-shell";
import { BrandMark } from "@/components/onboarding/brand-mark";
import { apiClient } from "@/lib/api-client";
import { readPendingEmail, resendLabel } from "@/lib/onboarding";
import { PillButton } from "@/components/ui/pill-button";

const RESEND_WAIT_SECONDS = 45;

export default function CheckEmailPage() {
  const [email, setEmail] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_WAIT_SECONDS);

  useEffect(() => {
    setEmail(readPendingEmail());
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  async function handleResend() {
    if (!email) return;
    await apiClient.requestMagicLink(email);
    setSecondsLeft(RESEND_WAIT_SECONDS);
  }

  return (
    <AuthShell
      hero={
        <>
          <BrandMark className="self-center" />
          <div className="flex flex-col items-center gap-4 text-center">
            <svg
              width="96"
              height="96"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-sky"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="M3.5 7.5l8.5 6 8.5-6" />
            </svg>
            <h1 className="m-0 font-display text-[28px] font-black italic uppercase leading-tight">KIỂM TRA EMAIL</h1>
            <p className="m-0 text-[15px] leading-normal text-muted-subtitle">
              {email ? (
                <>
                  Đã gửi link đăng nhập tới <strong className="text-white">{email}</strong>.
                </>
              ) : (
                "Đã gửi link đăng nhập tới email của bạn."
              )}{" "}
              Link có hiệu lực 15 phút.
            </p>
          </div>
        </>
      }
    >
      <PillButton href="mailto:" className="lg:hidden">
        Mở ứng dụng Mail
      </PillButton>
      <PillButton variant="secondary" onClick={handleResend} disabled={secondsLeft > 0 || !email}>
        {resendLabel(secondsLeft)}
      </PillButton>
      <Link
        href="/signup"
        className="inline-flex min-h-[44px] items-center justify-center px-2 text-[15px] font-semibold text-blue"
      >
        Dùng email khác
      </Link>
      {process.env.NODE_ENV !== "production" && (
        <Link
          href="/setup/profile"
          className="inline-flex min-h-[44px] items-center justify-center px-2 text-[13px] font-semibold text-secondary"
        >
          Mô phỏng mở link (dev)
        </Link>
      )}
      <p className="m-0 text-center text-[13px] leading-normal text-secondary">
        Không thấy email? Kiểm tra mục Spam hoặc Quảng cáo.
      </p>
    </AuthShell>
  );
}
