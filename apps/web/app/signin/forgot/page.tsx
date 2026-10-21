import Link from "next/link";
import { AuthShell } from "@/components/onboarding/auth-shell";
import { ForgotPasswordForm } from "@/components/onboarding/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Quên mật khẩu." lead="Nhập email của bạn, chúng tôi gửi liên kết để đặt lại mật khẩu.">
      <ForgotPasswordForm />
      <p className="m-0 text-center text-callout text-secondary">
        <Link href="/signin" className="inline-flex min-h-11 items-center px-2 font-semibold text-cobalt">
          Quay lại đăng nhập
        </Link>
      </p>
    </AuthShell>
  );
}
