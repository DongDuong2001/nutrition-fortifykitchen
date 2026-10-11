"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { Toast } from "@/components/ui/toast";

const LOST_ITEMS = [
  "Nhật ký bữa ăn và ngày tập",
  "Món và công thức bạn tự tạo",
  "Hồ sơ, cân nặng và mục tiêu",
  "Cài đặt nhắc nhở",
];

export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isConfirmed =
    confirmationText.trim().toUpperCase() === "XOÁ" ||
    confirmationText.trim().toUpperCase() === "XOA";

  const handleDelete = () => {
    if (!isConfirmed) return;
    setToastMessage("Chưa hỗ trợ xoá tài khoản trong bản thử");
    setTimeout(() => {
      router.push("/profile");
    }, 1200);
  };

  const handleExportCsv = () => {
    setToastMessage("Chưa hỗ trợ tải dữ liệu trong bản thử");
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col justify-between">
      <div className="flex flex-col">
        <AppHeader
          variant="sub"
          title="XOÁ TÀI KHOẢN"
          backHref="/profile"
          backLabel="Quay lại"
          alignGroup="settings-header"
        />

        <main className="w-full max-w-[560px] mx-auto px-4 pt-3 pb-4 flex flex-col gap-2.5">
          {/* Warning card */}
          <div className="bg-card border border-card-border rounded-[18px] p-3.5 md:p-4 flex flex-col gap-2">
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
              <div className="text-[15px] font-bold leading-[1.4] text-text">
                Xoá vĩnh viễn nhật ký, món tự tạo và hồ sơ. Không thể khôi phục.
              </div>
            </div>
            <ul className="m-0 pl-5 flex flex-col gap-0.5 text-sm text-secondary list-disc">
              {LOST_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="w-full h-12 rounded-full border border-black/12 bg-white text-ink text-[15px] font-semibold hover:bg-surface-tint active:scale-[0.97] transition-transform cursor-pointer"
          >
            Tải dữ liệu về (CSV)
          </button>

          {/* Confirmation input */}
          <label className="flex flex-col gap-2 text-[15px] font-bold text-text">
            Gõ XOÁ để xác nhận
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="XOÁ"
              autoComplete="off"
              className="h-[52px] rounded-[10px] border-2 border-grabber bg-white px-3.5 text-lg font-semibold text-ink outline-none focus:border-blue transition-colors"
            />
          </label>
        </main>
      </div>

      {/* Action buttons & toast */}
      <footer className="w-full max-w-[560px] mx-auto px-4 pt-2 pb-4 flex flex-col gap-0.5">
        {toastMessage && (
          <div className="mb-3 animate-fade-in">
            <Toast message={toastMessage} />
          </div>
        )}

        <button
          type="button"
          disabled={!isConfirmed}
          aria-disabled={!isConfirmed}
          onClick={handleDelete}
          className={`h-[52px] w-full border-0 rounded-full font-bold text-base transition-all select-none ${
            isConfirmed
              ? "bg-destructive text-white cursor-pointer active:scale-[0.97]"
              : "bg-destructive text-white opacity-45 cursor-not-allowed"
          }`}
        >
          Xoá tài khoản
        </button>

        <Link
          href="/profile"
          className="no-underline h-11 flex items-center justify-center text-ink text-[15px] font-semibold hover:opacity-80 active:scale-[0.97] transition-all"
        >
          Huỷ
        </Link>
      </footer>
    </div>
  );
}
