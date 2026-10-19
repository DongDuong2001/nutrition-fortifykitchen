"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/onboarding/auth-shell";
import { BrandMark } from "@/components/onboarding/brand-mark";
import { requestMagicLink } from "@/lib/auth-actions";
import { firstRunState, readFirstRunFacts } from "@/lib/first-run";
import { readPendingEmail, resendLabel } from "@/lib/onboarding";
import { PillButton } from "@/components/ui/pill-button";
import { HOME_ROUTE } from "@/lib/nav";

const RESEND_WAIT_SECONDS = 45;

export default function CheckEmailPage() {
  const [email, setEmail] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_WAIT_SECONDS);
  // Where the opened link lands: setup when the account has no profile yet, otherwise the Tổng quan tab
  const [openTarget, setOpenTarget] = useState("/setup/profile");

  useEffect(() => {
    setEmail(readPendingEmail());
    setOpenTarget(firstRunState(readFirstRunFacts()) === "needs-setup" ? "/setup/profile" : HOME_ROUTE);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  async function handleResend() {
    if (!email) return;
    const result = await requestMagicLink(email);
    if (result.ok) setSecondsLeft(RESEND_WAIT_SECONDS);
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
            <h1 className="m-0 font-display text-headline font-black italic uppercase leading-tight">KIỂM TRA EMAIL</h1>
            <p className="m-0 text-callout leading-normal text-muted-subtitle">
              {email ? (
                <>
                  Đã gửi liên kết đăng nhập tới <strong className="text-on-dark">{email}</strong>.
                </>
              ) : (
                "Đã gửi liên kết đăng nhập tới email của bạn."
              )}{" "}
              Liên kết có hiệu lực 15 phút.
            </p>
          </div>
        </>
      }
    >
      <PillButton href="mailto:" className="lg:hidden">
        Mở ứng dụng Email
      </PillButton>
      <PillButton variant="secondary" onClick={handleResend} disabled={secondsLeft > 0 || !email}>
        {resendLabel(secondsLeft)}
      </PillButton>
      <Link
        href="/signup"
        className="inline-flex min-h-11 items-center justify-center px-2 text-callout font-semibold text-cobalt"
      >
        Dùng email khác
      </Link>
      {process.env.NODE_ENV !== "production" && (
        <Link
          href={openTarget}
          className="inline-flex min-h-11 items-center justify-center px-2 text-cap font-semibold text-secondary"
        >
          Mở thẳng liên kết đăng nhập (bản thử)
        </Link>
      )}
      <p className="m-0 text-center text-cap leading-normal text-secondary">
        Chưa thấy email? Bạn kiểm tra thêm hộp thư Rác (Spam) hoặc Quảng cáo nhé.
      </p>
    </AuthShell>
  );
}
