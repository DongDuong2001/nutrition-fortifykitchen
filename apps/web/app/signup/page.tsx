import Link from "next/link";
import { AuthShell, LegalLine } from "@/components/onboarding/auth-shell";
import { GoogleSignInButton } from "@/components/onboarding/google-sign-in-button";
import { EmailPasswordForm } from "@/components/onboarding/email-password-form";

const DESKTOP_VALUES = [
  "Theo dõi đủ 22 vi chất, không chỉ kcal",
  "Mục tiêu do huấn luyện viên Lê Hồng Khánh đặt",
  "Thêm bữa ăn trong vài giây, thấy ngay còn thiếu gì",
];

export default function SignUpPage() {
  return (
    <AuthShell
      split
      title="Vi chất phải đủ."
      titleClassName="lg:text-[2.5rem]"
      lead="Thêm bữa ăn, theo dõi vi chất và bám sát mục tiêu của huấn luyện viên Lê Hồng Khánh."
      leadPhoneOnly
      splash={
        <div
          role="img"
          aria-label="H1T MICRO, 1 set là đủ"
          className="hidden -rotate-6 flex-col items-start self-center pt-4 font-display font-black italic leading-none lg:flex"
        >
          <span className="ml-8 text-xl tracking-[0.06em] lg:text-title">1 SET LÀ ĐỦ</span>
          <span className="text-[6.5rem] leading-[0.86] lg:text-[8.75rem]">H1T</span>
          <span className="ml-12 text-[2.625rem] leading-[0.95] text-sky lg:ml-16 lg:text-[3.5rem]">MICRO</span>
        </div>
      }
      aside={
        <>
          <ul className="m-0 hidden list-none flex-col gap-4 p-0 lg:flex">
            {DESKTOP_VALUES.map((value) => (
              <li key={value} className="flex items-center gap-3 text-base leading-normal text-muted-subtitle">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-none text-sky"
                  aria-hidden="true"
                >
                  <path d="M5 12l5 5 9-10" />
                </svg>
                {value}
              </li>
            ))}
          </ul>
          <div className="hidden pt-3 lg:block">
            <Link href="/landing" className="text-xs font-semibold text-sky no-underline hover:underline">
              Tìm hiểu thêm về H1T MICRO →
            </Link>
          </div>
        </>
      }
    >
      <p className="m-0 hidden text-cap font-extrabold text-secondary lg:block">Tạo tài khoản</p>
      <GoogleSignInButton />
      <div className="flex items-center gap-3 text-cap text-secondary" aria-hidden="true">
        <span className="h-px flex-1 bg-divider" />
        hoặc
        <span className="h-px flex-1 bg-divider" />
      </div>
      <EmailPasswordForm variant="signup" />
      <p className="m-0 flex min-h-11 flex-wrap items-center justify-center text-center text-callout text-secondary">
        Đã có tài khoản?
        <Link href="/signin" className="inline-flex min-h-11 items-center px-2 font-semibold text-cobalt">
          Đăng nhập
        </Link>
      </p>
      <LegalLine lead="Bằng việc tạo tài khoản" tail=". Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y tế." />
    </AuthShell>
  );
}
