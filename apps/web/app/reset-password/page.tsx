import { AuthShell } from "@/components/onboarding/auth-shell";
import { BrandMark } from "@/components/onboarding/brand-mark";
import { ResetPasswordForm } from "@/components/onboarding/reset-password-form";

// The page the reset link opens. No header and no bottom nav: it is an auth screen, like /signin.
export default function ResetPasswordPage() {
  return (
    <AuthShell
      hero={
        <>
          <BrandMark className="self-center" />
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-display text-title font-black italic uppercase leading-tight">ĐẶT LẠI MẬT KHẨU.</h1>
            <p className="m-0 text-callout leading-normal text-muted-subtitle">Nhập mật khẩu mới cho tài khoản của bạn.</p>
          </div>
        </>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
