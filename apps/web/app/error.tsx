"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PillButton } from "@/components/ui/pill-button";

export interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  const [timeStr, setTimeStr] = useState<string>("14:05");

  useEffect(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setTimeStr(`${hh}:${mm}`);
  }, []);

  return (
    <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col justify-center items-center p-4 sm:p-6 box-border select-none">
      <div
        role="alert"
        className="w-full max-w-[440px] bg-card border border-card-border rounded-[18px] p-6 sm:p-8 flex flex-col items-center text-center gap-3 shadow-xs"
      >
        <div className="w-12 h-12 rounded-full bg-red/10 text-destructive flex items-center justify-center shrink-0">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3.5 2.5 20h19z" />
            <path d="M12 10v5M12 17.8v.2" />
          </svg>
        </div>

        <h1 className="m-0 text-lg font-bold text-text">Không tải được dữ liệu</h1>
        <p className="m-0 text-sm leading-relaxed text-secondary">
          Máy chủ đang bận. Dữ liệu bạn đã ghi vẫn an toàn trên máy.
        </p>

        <div className="w-full pt-2 flex flex-col gap-3">
          <PillButton variant="primary" onClick={() => reset()} fullWidth>
            Thử lại
          </PillButton>
          <Link
            href="/"
            className="h-[52px] rounded-full bg-card border border-card-border text-text font-semibold text-base flex items-center justify-center no-underline cursor-pointer active:scale-[0.97] transition-all hover:bg-hover"
          >
            Về Tổng quan
          </Link>
        </div>

        <div className="text-[13px] text-secondary tabular-nums mt-1">
          Mã lỗi: {error.digest || "503"} · {timeStr}
        </div>
      </div>
    </div>
  );
}
