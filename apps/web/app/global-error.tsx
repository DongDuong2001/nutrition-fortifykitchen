"use client";

import * as React from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-paper text-ink flex items-center justify-center p-4 font-sans antialiased">
        <main
          role="alert"
          aria-live="assertive"
          className="w-full max-w-md bg-card border border-card-border rounded-[18px] p-6 shadow-xs flex flex-col gap-4 text-center"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-ink">
              Có lỗi xảy ra trong quá trình tải ứng dụng
            </h1>
            <p className="text-sm text-secondary">
              Hệ thống đã ghi nhận sự cố. Vui lòng thử tải lại trang hoặc kiểm tra kết nối mạng của bạn.
            </p>
          </div>

          {error.digest && (
            <p className="text-xs font-mono text-secondary bg-page border border-card-border px-2.5 py-1 rounded-[12px]">
              Mã lỗi: {error.digest}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-full bg-blue hover:bg-blue/90 active:scale-[0.97] transition-all text-on-accent font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-2 cursor-pointer border-0"
            >
              Tải lại trang
            </button>
            <a
              href="/"
              className="w-full min-h-[44px] flex items-center justify-center px-4 py-2.5 rounded-full border border-card-border bg-card hover:bg-page active:scale-[0.97] transition-all text-text font-medium text-sm no-underline focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-2"
            >
              Về trang chủ
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

