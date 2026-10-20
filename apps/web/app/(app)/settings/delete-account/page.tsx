"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { useBack } from "@/hooks/use-back";
import { Toast } from "@/components/ui/toast";
import { Presence } from "@/components/ui/presence";
import { Card } from "@/components/ui/card";

const LOST_ITEMS = [
  "Nhật ký bữa ăn và ngày tập",
  "Món và công thức bạn tự tạo",
  "Hồ sơ, cân nặng và mục tiêu",
  "Cài đặt nhắc nhở",
];

export default function DeleteAccountPage() {
  const goBack = useBack();
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isConfirmed =
    confirmationText.trim().toUpperCase() === "XOÁ" ||
    confirmationText.trim().toUpperCase() === "XOA";

  const handleDelete = () => {
    if (!isConfirmed) return;
    setToastMessage("Bản thử chưa hỗ trợ xóa tài khoản. Dữ liệu hiện chỉ lưu trên thiết bị của bạn.");
    setTimeout(() => {
      router.push("/settings");
    }, 1200);
  };

  const handleExportCsv = () => {
    setToastMessage("Tính năng tải CSV sẽ mở khi kết nối máy chủ.");
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="w-full min-h-dvh bg-page text-text font-sans flex flex-col justify-between">
      <div className="flex flex-col">
        <AppHeader
          variant="sub"
          title="Xóa tài khoản"
          onBack={goBack}
          backLabel="Quay lại"
          alignGroup="settings-header"
        />

        <main className="w-full max-w-[560px] mx-auto px-4 pt-4 pb-4 flex flex-col gap-3">
          {/* Warning card */}
          <Card className="md:p-4 flex flex-col gap-2">
            <div className="flex gap-3 items-start">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0 mt-0.5 text-destructive"
              >
                <path d="M12 3.5 2.5 20h19z" />
                <path d="M12 10v4.5M12 17.2v.1" />
              </svg>
              <div className="text-callout font-bold leading-[1.4] text-text">
                Xóa vĩnh viễn nhật ký, món tự tạo và hồ sơ. Không thể khôi phục.
              </div>
            </div>
            <ul className="m-0 pl-5 flex flex-col gap-0.5 text-sm text-secondary list-disc">
              {LOST_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>

          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="w-full h-12 rounded-full border border-card-border bg-card text-ink text-callout font-semibold hover:bg-surface m-tint transition-transform cursor-pointer"
          >
            Tải dữ liệu về (CSV)
          </button>

          {/* Confirmation input */}
          <label className="flex flex-col gap-2 text-callout font-bold text-text">
            Gõ Xóa để xác nhận
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Xóa"
              autoComplete="off"
              className="h-[52px] rounded-xl border-2 border-grabber bg-surface px-4 text-lg font-semibold text-ink outline-none focus:border-cobalt transition-colors"
            />
          </label>
        </main>
      </div>

      {/* Action buttons & toast */}
      <footer className="w-full max-w-[560px] mx-auto px-4 pt-2 pb-4 flex flex-col gap-0.5">
        <Presence>
          {toastMessage && (
            <div className="mb-3">
              <Toast message={toastMessage} />
            </div>
          )}
        </Presence>

        <button
          type="button"
          disabled={!isConfirmed}
          aria-disabled={!isConfirmed}
          onClick={handleDelete}
          className={`h-[52px] w-full border-0 rounded-full font-bold text-base transition-press select-none ${
            isConfirmed
              ? "bg-destructive text-on-accent cursor-pointer active:scale-[0.97] transition-press"
              : "bg-destructive text-on-accent opacity-45 cursor-not-allowed"
          }`}
        >
          Xóa tài khoản
        </button>

        <Link
          href="/settings"
          className="no-underline h-11 flex items-center justify-center text-ink text-callout font-semibold hover:opacity-80 active:scale-[0.97] transition-press"
        >
          Hủy
        </Link>
      </footer>
    </div>
  );
}
