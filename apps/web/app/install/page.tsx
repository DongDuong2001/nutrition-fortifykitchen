"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/ui/app-header";
import { useBack } from "@/hooks/use-back";

export default function InstallAppPage() {
  const goBack = useBack();
  const [deviceTab, setDeviceTab] = useState<"ios" | "android">("ios");

  return (
    <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col justify-between">
      <div className="flex flex-col">
        <AppHeader
          variant="sub"
          title="THÊM VÀO MÀN HÌNH CHÍNH"
          onBack={goBack}
          backLabel="Quay lại"
          alignGroup="install-header"
        />

        <main className="w-full max-w-[560px] mx-auto px-4 pt-4 pb-4 flex flex-col gap-3.5">
          {/* App info card */}
          <div className="bg-card border border-card-border rounded-[18px] p-4 flex items-center gap-3.5">
            <div
              aria-hidden="true"
              className="w-16 h-16 shrink-0 rounded-2xl bg-ink flex flex-col items-center justify-center gap-1 shadow-sm"
            >
              <div className="font-display italic font-black text-[22px] text-on-dark leading-none">
                H1T
              </div>
              <div className="w-[26px] h-1 rounded-sm bg-blue" />
            </div>
            <div className="min-w-0 flex flex-col gap-0.5">
              <div className="text-base font-bold leading-tight text-text">H1T MICRO</div>
              <div className="text-sm text-secondary leading-snug">
                Mở nhanh như ứng dụng, chạy cả khi mất mạng
              </div>
            </div>
          </div>

          {/* Device Tabs */}
          <div
            role="tablist"
            aria-label="Thiết bị"
            className="grid grid-cols-2 gap-1 bg-grabber rounded-full p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={deviceTab === "ios"}
              onClick={() => setDeviceTab("ios")}
              className={`h-11 border-0 rounded-full text-sm transition-colors cursor-pointer ${
                deviceTab === "ios"
                  ? "bg-ink text-on-dark font-bold"
                  : "bg-transparent text-text font-semibold hover:text-ink"
              }`}
            >
              iPhone (Safari)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={deviceTab === "android"}
              onClick={() => setDeviceTab("android")}
              className={`h-11 border-0 rounded-full text-sm transition-colors cursor-pointer ${
                deviceTab === "android"
                  ? "bg-ink text-on-dark font-bold"
                  : "bg-transparent text-text font-semibold hover:text-ink"
              }`}
            >
              Android (Chrome)
            </button>
          </div>

          {/* Steps panel */}
          {deviceTab === "ios" ? (
            <ol
              role="tabpanel"
              aria-label="Các bước cài đặt trên iPhone"
              className="list-none m-0 p-0 flex flex-col gap-2.5"
            >
              <li className="bg-card border border-card-border rounded-[18px] p-3.5 md:p-4 flex items-center gap-3.5 min-h-[56px]">
                <span
                  aria-hidden="true"
                  className="w-7 h-7 shrink-0 rounded-full bg-blue text-on-accent flex items-center justify-center text-sm font-bold tabular-nums"
                >
                  1
                </span>
                <span className="text-[15px] leading-snug text-text">
                  Chạm nút Chia sẻ{" "}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-label="Chia sẻ"
                    role="img"
                    className="inline -translate-y-0.5 align-middle mx-1 text-blue"
                  >
                    <path d="M12 15V4M8 8l4-4 4 4" />
                    <path d="M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1" />
                  </svg>{" "}
                  ở thanh dưới Safari
                </span>
              </li>

              <li className="bg-card border border-card-border rounded-[18px] p-3.5 md:p-4 flex items-center gap-3.5 min-h-[56px]">
                <span
                  aria-hidden="true"
                  className="w-7 h-7 shrink-0 rounded-full bg-blue text-on-accent flex items-center justify-center text-sm font-bold tabular-nums"
                >
                  2
                </span>
                <span className="text-[15px] leading-snug text-text">
                  Chọn “Thêm vào MH chính”
                </span>
              </li>

              <li className="bg-card border border-card-border rounded-[18px] p-3.5 md:p-4 flex items-center gap-3.5 min-h-[56px]">
                <span
                  aria-hidden="true"
                  className="w-7 h-7 shrink-0 rounded-full bg-blue text-on-accent flex items-center justify-center text-sm font-bold tabular-nums"
                >
                  3
                </span>
                <span className="text-[15px] leading-snug text-text">
                  Chạm “Thêm” ở góc phải
                </span>
              </li>
            </ol>
          ) : (
            <ol
              role="tabpanel"
              aria-label="Các bước cài đặt trên Android"
              className="list-none m-0 p-0 flex flex-col gap-2.5"
            >
              <li className="bg-card border border-card-border rounded-[18px] p-3.5 md:p-4 flex items-center gap-3.5 min-h-[56px]">
                <span
                  aria-hidden="true"
                  className="w-7 h-7 shrink-0 rounded-full bg-blue text-on-accent flex items-center justify-center text-sm font-bold tabular-nums"
                >
                  1
                </span>
                <span className="text-[15px] leading-snug text-text">
                  Chạm menu ba chấm (⋮) ở góc trên Chrome
                </span>
              </li>

              <li className="bg-card border border-card-border rounded-[18px] p-3.5 md:p-4 flex items-center gap-3.5 min-h-[56px]">
                <span
                  aria-hidden="true"
                  className="w-7 h-7 shrink-0 rounded-full bg-blue text-on-accent flex items-center justify-center text-sm font-bold tabular-nums"
                >
                  2
                </span>
                <span className="text-[15px] leading-snug text-text">
                  Chọn “Thêm vào Màn hình chính” hoặc “Cài đặt ứng dụng”
                </span>
              </li>

              <li className="bg-card border border-card-border rounded-[18px] p-3.5 md:p-4 flex items-center gap-3.5 min-h-[56px]">
                <span
                  aria-hidden="true"
                  className="w-7 h-7 shrink-0 rounded-full bg-blue text-on-accent flex items-center justify-center text-sm font-bold tabular-nums"
                >
                  3
                </span>
                <span className="text-[15px] leading-snug text-text">
                  Chạm “Cài đặt” hoặc “Thêm” để xác nhận
                </span>
              </li>
            </ol>
          )}
        </main>
      </div>

      {/* Bottom CTA */}
      <footer className="w-full max-w-[560px] mx-auto px-4 pt-3 pb-6">
        <Link
          href="/"
          className="no-underline h-[52px] w-full rounded-full bg-blue text-on-accent flex items-center justify-center text-base font-bold shadow-sm hover:opacity-95 active:scale-[0.97] transition-all"
        >
          Đã hiểu
        </Link>
      </footer>
    </div>
  );
}
