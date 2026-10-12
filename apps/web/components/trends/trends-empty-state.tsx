"use client";

import React from "react";
import Link from "next/link";

export function TrendsEmptyState() {
  return (
    <div className="bg-card border border-card-border rounded-[18px] p-6 sm:p-8 flex flex-col items-center text-center gap-3.5 shadow-xs w-full max-w-[560px] mx-auto">
      <div
        aria-hidden="true"
        className="w-14 h-14 rounded-2xl bg-page border border-card-border flex items-center justify-center text-secondary"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      </div>

      <div className="flex flex-col gap-1 max-w-[320px]">
        <h2 className="m-0 text-base sm:text-lg font-bold text-text">
          Cần ít nhất 3 ngày để xem xu hướng
        </h2>
        <p className="m-0 text-sm text-secondary leading-relaxed">
          Tiếp tục ghi nhật ký các bữa ăn để mở khoá biểu đồ năng lượng và phân tích vi chất thường thiếu.
        </p>
      </div>

      <Link
        href="/today"
        className="no-underline mt-2 h-11 px-6 rounded-full bg-blue text-on-accent text-sm font-semibold flex items-center justify-center shadow-xs hover:opacity-95 active:scale-[0.97] transition-all cursor-pointer"
      >
        Về Hôm nay
      </Link>
    </div>
  );
}
