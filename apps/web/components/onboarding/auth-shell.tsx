import React from "react";
import Link from "next/link";
import { BrandMark } from "@/components/onboarding/brand-mark";

export interface AuthShellProps {
  /** The one h1 of the screen (Saira italic, 34 px). */
  title: string;
  /** The line under it. */
  lead?: React.ReactNode;
  /** The lead shows on a phone only (the desktop panel lists the benefits instead). */
  leadPhoneOnly?: boolean;
  /** Under the lead, inside the desktop panel: the benefit list and the "Tìm hiểu thêm" link. */
  aside?: React.ReactNode;
  /** Desktop only: art above the title, in place of the wordmark. */
  splash?: React.ReactNode;
  /** Title size from 1024 px up (the sign-up panel is a step bigger). */
  titleClassName?: string;
  children: React.ReactNode;
  /** Desktop only (≥1024 px): the heading on an ink panel on the left, the form on the right. */
  split?: boolean;
}

/**
 * Auth frame (V3 SignIn): on the grey page, no ink slab. A 20 px wordmark, one 34 px large title and a line, then the form with
 * 24 px of room all round; the legal line sits at the bottom (`mt-auto` on its own `<p>`). No bottom nav. From 1024 px the split
 * screens keep their ink panel beside the form; the others centre in a 420 px column.
 */
export function AuthShell({ title, lead, leadPhoneOnly = false, aside, splash, titleClassName = "", children, split = false }: AuthShellProps) {
  return (
    <main className={`flex min-h-dvh flex-col bg-page text-text ${split ? "lg:flex-row" : ""}`}>
      <section
        className={`flex-none px-6 pb-2 pt-[max(24px,env(safe-area-inset-top))] ${
          split ? "lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:bg-ink lg:px-8 lg:py-8 lg:text-on-dark" : "lg:pt-12"
        }`}
      >
        <div className={`mx-auto flex w-full max-w-[420px] flex-col gap-6 ${split ? "lg:mx-0 lg:max-w-none lg:gap-8" : ""}`}>
          {splash ? <BrandMark onInkFromLg={split} className="lg:hidden" /> : <BrandMark onInkFromLg={split} />}
          {splash}
          <div className="flex flex-col gap-2 lg:gap-4">
            <h1 className={`m-0 font-display text-display font-black italic uppercase leading-[1.1] tracking-display ${titleClassName}`}>{title}</h1>
            {lead && (
              <p
                className={`m-0 text-callout leading-normal text-secondary ${split ? "lg:text-muted-subtitle" : ""} ${
                  leadPhoneOnly ? "lg:hidden" : ""
                }`}
              >
                {lead}
              </p>
            )}
            {aside}
          </div>
        </div>
      </section>

      <div className={`flex flex-1 flex-col px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-6 ${split ? "lg:justify-center lg:px-8 lg:py-8" : ""}`}>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-3 lg:flex-none">{children}</div>
      </div>
    </main>
  );
}

// 12 px links in running text: 18 px of line plus 13 px above and below is a 44 px tap target that does not move the lines
const LEGAL_LINK = "-my-[13px] inline-block py-[13px] leading-[18px] text-inherit underline hover:text-text";

/** The legal line at the bottom of the sign-in and sign-up forms. `lead` is what the sentence starts with: "Bằng việc tiếp tục". */
export function LegalLine({ lead, tail }: { lead: string; tail?: string }) {
  return (
    <p className="m-0 mt-auto pt-4 text-center text-xs leading-normal text-secondary">
      {lead}, bạn đồng ý với{" "}
      <Link href="/terms" className={LEGAL_LINK}>
        Điều khoản dịch vụ
      </Link>{" "}
      và{" "}
      <Link href="/privacy" className={LEGAL_LINK}>
        Chính sách bảo mật
      </Link>
      {tail ?? " của H1T MICRO."}
    </p>
  );
}
