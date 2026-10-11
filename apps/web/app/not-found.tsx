"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PillButton } from "@/components/ui/pill-button";

export default function NotFound() {
  const [reported, setReported] = useState(false);

  return (
    <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col justify-between p-6 sm:p-8 max-w-[560px] mx-auto box-border select-none">
      <main className="mt-16 sm:mt-24 flex flex-col items-start gap-3">
        <div className="inline-flex flex-col gap-2">
          <div
            aria-hidden="true"
            className="font-display italic font-black text-[80px] sm:text-[96px] leading-[0.9] text-ink tabular-nums"
          >
            404
          </div>
          <div
            aria-hidden="true"
            className="h-2 w-full rounded-full bg-blue"
          />
        </div>

        <h1 className="mt-3 m-0 font-display italic font-extrabold text-[28px] sm:text-[32px] leading-tight text-ink uppercase">
          KHÔNG TÌM THẤY TRANG
        </h1>
        <p className="m-0 text-[15px] sm:text-base leading-relaxed text-secondary">
          Link có thể đã cũ hoặc bị gõ sai.
        </p>
      </main>

      <footer className="mt-auto pt-8 flex flex-col gap-2.5 w-full">
        <PillButton variant="primary" href="/today" fullWidth>
          Về Hôm nay
        </PillButton>
        <button
          type="button"
          onClick={() => setReported(true)}
          className="h-[52px] rounded-full bg-card border border-card-border text-text font-semibold text-base flex items-center justify-center cursor-pointer active:scale-[0.97] transition-all hover:bg-black/[0.02]"
        >
          {reported ? "Đã ghi nhận báo lỗi" : "Báo lỗi"}
        </button>
      </footer>
    </div>
  );
}
