import { AuthShell } from "@/components/onboarding/auth-shell";
import { ResetPasswordForm } from "@/components/onboarding/reset-password-form";

// The page the reset link opens. No header and no bottom nav: it is an auth screen, like /signin.
export default function ResetPasswordPage() {
  return (
    <AuthShell title="Đặt lại mật khẩu." lead="Nhập mật khẩu mới cho tài khoản của bạn.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
