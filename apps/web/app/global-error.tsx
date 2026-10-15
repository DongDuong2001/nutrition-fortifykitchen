"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log unexpected root layout exceptions
    if (typeof window !== "undefined" && window.console) {
      console.error("Global application error:", error);
    }
  }, [error]);

  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#F5F5F7] text-[#111317] flex items-center justify-center p-4 font-sans antialiased">
        <main
          role="alert"
          aria-live="assertive"
          className="w-full max-w-md bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-sm flex flex-col gap-4 text-center"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-[#111317]">
              Có lỗi xảy ra trong quá trình tải ứng dụng
            </h1>
            <p className="text-sm text-[#8E8E93]">
              Hệ thống đã ghi nhận sự cố. Vui lòng thử tải lại trang hoặc kiểm tra kết nối mạng của bạn.
            </p>
          </div>

          {error.digest && (
            <p className="text-xs font-mono text-[#AEAEB2] bg-[#F2F2F7] px-2 py-1 rounded">
              Mã lỗi: {error.digest}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1E55F0] hover:bg-[#1845C2] active:scale-[0.97] transition-all text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#1E55F0] focus:ring-offset-2 cursor-pointer"
            >
              Tải lại trang
            </button>
            <a
              href="/"
              className="w-full min-h-[44px] flex items-center justify-center px-4 py-2.5 rounded-xl border border-[#E5E5EA] hover:bg-[#F2F2F7] active:scale-[0.97] transition-all text-[#111317] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#1E55F0] focus:ring-offset-2"
            >
              Về trang chủ
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
