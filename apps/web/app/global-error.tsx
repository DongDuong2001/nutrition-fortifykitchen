"use client";

import * as React from "react";
import { Manrope, Saira_Condensed } from "next/font/google";
// The root layout is gone when this renders, so it brings the tokens (colours, press feedback) and fonts itself.
import "./globals.css";
import { chunkOutcome, reloadPage } from "@/lib/chunk-reload";
import { HOME_ROUTE } from "@/lib/home-route";

const manrope = Manrope({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-manrope-face",
  display: "swap",
});

const sairaCondensed = Saira_Condensed({
  subsets: ["vietnamese", "latin"],
  weight: ["800", "900"],
  variable: "--font-saira-condensed-face",
  display: "swap",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // A chunk error (the page is older than the deploy): reloads once by itself; if that did not help it says so and offers Tải lại
  const [chunk, setChunk] = React.useState("");
  React.useEffect(() => setChunk(chunkOutcome(error)), [error]);
  React.useEffect(() => {
    // Log unexpected root layout exceptions
    if (typeof window !== "undefined" && window.console) {
      console.error("Global application error:", error);
    }
  }, [error]);

  return (
    <html lang="vi" className={`${manrope.variable} ${sairaCondensed.variable}`}>
      <body className="flex min-h-dvh items-center justify-center bg-page p-4 font-sans text-text antialiased">
        <main
          role="alert"
          aria-live="assertive"
          className="flex w-full max-w-[560px] flex-col gap-4 rounded-card border border-transparent shadow-ring lg:shadow-card bg-card p-6 text-center"
        >
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-display text-2xl font-extrabold italic leading-tight text-text tracking-display">
              {chunk ? "Có bản cập nhật mới" : "Có lỗi khi tải ứng dụng"}
            </h1>
            <p className="m-0 text-callout leading-snug text-secondary">
              {chunk
                ? "Tải lại để dùng bản mới nhất. Dữ liệu bạn đã ghi vẫn an toàn trên máy."
                : "Hệ thống đã ghi nhận sự cố. Hãy thử tải lại trang hoặc kiểm tra kết nối mạng của bạn."}
            </p>
          </div>

          {error.digest && (
            <p className="m-0 rounded-xl bg-surface px-3 py-2 text-cap tabular-nums text-secondary">
              Mã lỗi: {error.digest}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={chunk ? reloadPage : () => reset()}
              className="h-[52px] w-full cursor-pointer rounded-full border-0 bg-cobalt px-6 text-base font-bold text-on-accent m-tint"
            >
              {chunk ? "Tải lại" : "Tải lại trang"}
            </button>
            <a
              href={HOME_ROUTE}
              className="flex h-[52px] w-full items-center justify-center rounded-full border border-card-border bg-card px-6 text-base font-bold text-text no-underline hover:text-text m-tint"
            >
              Về trang chủ
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
