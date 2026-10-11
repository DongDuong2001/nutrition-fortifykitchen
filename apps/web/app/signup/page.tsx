import Link from "next/link";
import { AuthShell } from "@/components/onboarding/auth-shell";
import { GoogleSignInButton } from "@/components/onboarding/google-sign-in-button";
import { MagicLinkForm } from "@/components/onboarding/magic-link-form";

const DESKTOP_VALUES = [
  "Theo dõi đầy đủ vi chất, không chỉ calo",
  "Mục tiêu do Coach Lê Hồng Khánh đặt",
  "Ghi bữa ăn trong vài giây, thấy ngay còn thiếu gì",
];

export default function SignUpPage() {
  return (
    <AuthShell
      split
      hero={
        <>
          <div
            role="img"
            aria-label="H1T MICRO, 1 set là đủ"
            className="flex -rotate-6 flex-col items-start self-center pt-4 font-display font-black italic leading-none"
          >
            <span className="ml-8 text-xl tracking-[0.06em] lg:ml-8 lg:text-[26px]">1 SET LÀ ĐỦ</span>
            <span className="text-[104px] leading-[0.86] lg:text-[140px]">H1T</span>
            <span className="ml-12 text-[42px] leading-[0.95] text-sky lg:ml-16 lg:text-[56px]">MICRO</span>
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="m-0 font-display text-[26px] font-black italic uppercase leading-tight lg:text-[40px]">
              VI CHẤT PHẢI ĐỦ.
            </h1>
            <p className="m-0 text-[15px] leading-normal text-muted-subtitle lg:hidden">
              Ghi bữa ăn, theo dõi vi chất và làm theo mục tiêu của Coach Lê Hồng Khánh.
            </p>
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
          </div>
        </>
      }
    >
      <p className="m-0 hidden text-[13px] font-bold uppercase tracking-[0.06em] text-secondary lg:block">Tạo tài khoản</p>
      <GoogleSignInButton />
      <div className="flex items-center gap-3 text-[13px] text-secondary" aria-hidden="true">
        <span className="h-px flex-1 bg-divider" />
        hoặc
        <span className="h-px flex-1 bg-divider" />
      </div>
      <MagicLinkForm submitLabel="Gửi link đăng nhập" />
      <p className="m-0 text-center text-[13px] text-secondary">Chúng tôi gửi link vào email — không cần mật khẩu.</p>
      <p className="m-0 text-center text-[15px] text-secondary">
        Đã có tài khoản?{" "}
        <Link href="/signin" className="inline-flex min-h-[44px] items-center px-2 font-semibold text-blue">
          Đăng nhập
        </Link>
      </p>
      <p className="m-0 text-center text-xs leading-normal text-secondary">
        Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y tế.
      </p>
    </AuthShell>
  );
}
