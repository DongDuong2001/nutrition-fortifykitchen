"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusGlyph, StatusScreen } from "@/components/onboarding/status-screen";
import { requestMagicLink } from "@/lib/auth-actions";
import { firstRunState, readFirstRunFacts } from "@/lib/first-run";
import { readPendingEmail } from "@/lib/onboarding";
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
    <StatusScreen
      icon={
        <StatusGlyph>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M3.5 7.5l8.5 6 8.5-6" />
        </StatusGlyph>
      }
      title="Kiểm tra email"
      body={
        <>
          {email ? (
            <>
              Đã gửi liên kết đăng nhập tới <strong className="font-bold text-text">{email}</strong>.
            </>
          ) : (
            "Đã gửi liên kết đăng nhập tới email của bạn."
          )}{" "}
          Liên kết có hiệu lực 15 phút.
        </>
      }
      actions={
        <>
          <PillButton href="mailto:" className="lg:hidden">
            Mở ứng dụng Email
          </PillButton>
          <div className="flex flex-col gap-1">
            <PillButton variant="secondary" onClick={handleResend} disabled={secondsLeft > 0 || !email} aria-describedby="resend-reason">
              Gửi lại liên kết
            </PillButton>
            <p id="resend-reason" role="status" aria-live="polite" className="m-0 min-h-5 text-center text-cap text-secondary">
              {secondsLeft > 0 && (
                <>
                  Bạn gửi lại được sau <span className="font-semibold tabular-nums">{secondsLeft}</span> giây.
                </>
              )}
            </p>
          </div>
          <p className="m-0 flex min-h-11 flex-wrap items-center justify-center text-center text-callout text-secondary">
            Sai email?
            <Link href="/signup" className="inline-flex min-h-11 items-center px-2 font-semibold text-cobalt">
              Dùng email khác
            </Link>
          </p>
          {process.env.NODE_ENV !== "production" && (
            <Link href={openTarget} className="inline-flex min-h-11 items-center justify-center px-2 text-cap font-semibold text-secondary">
              Mở thẳng liên kết đăng nhập (bản thử)
            </Link>
          )}
          <p className="m-0 text-center text-cap leading-normal text-secondary">
            Chưa thấy email? Bạn kiểm tra thêm hộp thư Rác (Spam) hoặc Quảng cáo nhé.
          </p>
        </>
      }
    />
  );
}
