import Link from "next/link";
import { AuthShell } from "@/components/onboarding/auth-shell";
import { BrandMark } from "@/components/onboarding/brand-mark";
import { ForgotPasswordForm } from "@/components/onboarding/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      hero={
        <>
          <BrandMark className="self-center" />
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-display text-[26px] font-black italic uppercase leading-tight">QUÊN MẬT KHẨU.</h1>
            <p className="m-0 text-[15px] leading-normal text-muted-subtitle">
              Nhập email của bạn, chúng tôi gửi link để đặt lại mật khẩu.
            </p>
          </div>
        </>
      }
    >
      <ForgotPasswordForm />
      <p className="m-0 text-center text-[15px] text-secondary">
        <Link href="/signin" className="inline-flex min-h-[44px] items-center px-2 font-semibold text-blue">
          Quay lại đăng nhập
        </Link>
      </p>
    </AuthShell>
  );
}
