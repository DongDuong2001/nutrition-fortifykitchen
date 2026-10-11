import Link from "next/link";
import { AuthShell } from "@/components/onboarding/auth-shell";
import { BrandMark } from "@/components/onboarding/brand-mark";
import { MagicLinkForm } from "@/components/onboarding/magic-link-form";

export default function LinkExpiredPage() {
  return (
    <AuthShell
      hero={
        <>
          <BrandMark className="self-center" />
          <div className="flex flex-col items-center gap-4 text-center">
            <svg
              width="88"
              height="88"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-level-yellow-dark"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </svg>
            <h1 className="m-0 font-display text-[28px] font-black italic uppercase leading-tight text-level-yellow-dark">
              LINK ĐÃ HẾT HẠN
            </h1>
            <p className="m-0 text-[15px] leading-normal text-muted-subtitle">
              Link đăng nhập chỉ dùng được một lần và trong 15 phút.
            </p>
          </div>
        </>
      }
    >
      <MagicLinkForm submitLabel="Gửi link mới" />
      <div className="text-center">
        <Link
          href="/signup"
          className="inline-flex min-h-[44px] items-center px-2 text-[15px] font-semibold text-blue"
        >
          Quay lại
        </Link>
      </div>
    </AuthShell>
  );
}
