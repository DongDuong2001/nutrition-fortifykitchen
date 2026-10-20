import Link from "next/link";
import { AuthNotice } from "@/components/auth/auth-notice";
import { SessionRedirect } from "@/components/auth/session-redirect";
import { AuthShell } from "@/components/onboarding/auth-shell";
import { BrandMark } from "@/components/onboarding/brand-mark";
import { GoogleSignInButton } from "@/components/onboarding/google-sign-in-button";
import { EmailPasswordForm } from "@/components/onboarding/email-password-form";

const DESKTOP_SIGNIN_POINTS = [
  "Theo dõi 22 vi chất thiết yếu (10 khoáng chất, 12 vitamin) chuẩn khoa học",
  "Bảng thành phần thực phẩm minh bạch từ Viện Dinh Dưỡng Quốc Gia và USDA",
  "Tự động tính toán mức đáp ứng dinh dưỡng và cảnh báo mất cân bằng",
  "Tối ưu mục tiêu năng lượng và điện giải theo lịch tập luyện thực tế",
];

export default function SignInPage() {
  return (
    <AuthShell
      split
      hero={
        <>
          <BrandMark className="self-center" />
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-display text-title font-black italic uppercase leading-tight lg:text-display">
              CHÀO MỪNG TRỞ LẠI.
            </h1>
            <p className="m-0 text-balance text-callout leading-normal text-muted-subtitle">
              Đăng nhập để xem tiếp nhật ký và theo dõi 22 vi chất của bạn.
            </p>
            <ul className="m-0 hidden list-none flex-col gap-3.5 p-0 lg:flex pt-2">
              {DESKTOP_SIGNIN_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-3 text-sm leading-normal text-muted-subtitle">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-none text-sky"
                    aria-hidden="true"
                  >
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
            <div className="hidden lg:block pt-3">
              <Link href="/landing" className="text-xs font-semibold text-sky hover:underline no-underline">
                Tìm hiểu thêm về H1T MICRO →
              </Link>
            </div>
          </div>
        </>
      }
    >
      <SessionRedirect />
      <GoogleSignInButton />
      <div className="flex items-center gap-3 text-cap text-secondary" aria-hidden="true">
        <span className="h-px flex-1 bg-divider" />
        hoặc
        <span className="h-px flex-1 bg-divider" />
      </div>
      <EmailPasswordForm variant="signin" />
      <p className="m-0 text-center text-callout text-secondary">
        Chưa có tài khoản?{" "}
        <Link href="/signup" className="inline-flex min-h-11 items-center px-2 font-semibold text-cobalt">
          Đăng ký
        </Link>
      </p>
      <p className="m-0 text-center text-[0.75rem] leading-relaxed text-secondary">
        Bằng việc tiếp tục, bạn đồng ý với{" "}
        <Link href="/terms" className="underline hover:text-text">Điều khoản dịch vụ</Link>
        {" "}và{" "}
        <Link href="/privacy" className="underline hover:text-text">Chính sách bảo mật</Link>
        {" "}của H1T MICRO.
      </p>
      <AuthNotice />
    </AuthShell>
  );
}
