import Link from "next/link";
import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthShell } from "@/components/onboarding/auth-shell";
import { BrandMark } from "@/components/onboarding/brand-mark";
import { GoogleSignInButton } from "@/components/onboarding/google-sign-in-button";
import { EmailPasswordForm } from "@/components/onboarding/email-password-form";

export default function SignInPage() {
  return (
    <AuthShell
      hero={
        <>
          <BrandMark className="self-center" />
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-display text-[26px] font-black italic uppercase leading-tight">
              CHÀO MỪNG TRỞ LẠI.
            </h1>
            <p className="m-0 text-balance text-[15px] leading-normal text-muted-subtitle">
              Đăng nhập để xem tiếp nhật ký và vi chất của bạn.
            </p>
          </div>
        </>
      }
    >
      <GoogleSignInButton />
      <div className="flex items-center gap-3 text-[13px] text-secondary" aria-hidden="true">
        <span className="h-px flex-1 bg-divider" />
        hoặc
        <span className="h-px flex-1 bg-divider" />
      </div>
      <EmailPasswordForm variant="signin" />
      <p className="m-0 text-center text-[15px] text-secondary">
        Chưa có tài khoản?{" "}
        <Link href="/signup" className="inline-flex min-h-[44px] items-center px-2 font-semibold text-blue">
          Đăng ký
        </Link>
      </p>
      <AuthNotice />
    </AuthShell>
  );
}
