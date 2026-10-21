"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { useBack } from "@/hooks/use-back";
import { Toast } from "@/components/ui/toast";
import { Presence } from "@/components/ui/presence";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { SectionTitle } from "@/components/ui/section-title";

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
    <div className="flex min-h-dvh w-full flex-col justify-between bg-page font-sans text-text">
      <div className="flex flex-col">
        <AppHeader
          variant="sub"
          title="Xóa tài khoản"
          onBack={goBack}
          backLabel="Quay lại"
          alignGroup="settings-header"
        />

        <main className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pb-3 pt-4">
          {/* Warning card: the 2 px red edge is the card's ring */}
          <Card as="section" aria-labelledby="warn-title" className="flex flex-col gap-2 shadow-[inset_0_0_0_2px_var(--color-destructive)]! lg:shadow-[inset_0_0_0_2px_var(--color-destructive)]!">
            <div className="flex items-start gap-3">
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
                className="mt-0.5 shrink-0 text-destructive"
              >
                <path d="M12 3.5 2.5 20h19z" />
                <path d="M12 10v4.5M12 17.2v.1" />
              </svg>
              <h2 id="warn-title" className="m-0 text-callout font-bold leading-[1.4] text-text">
                Xóa vĩnh viễn nhật ký, món tự tạo và hồ sơ. Không thể khôi phục.
              </h2>
            </div>
            <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5 text-sm text-secondary">
              {LOST_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>

          <Card as="section" aria-labelledby="when-title" className="flex flex-col gap-1 py-3">
            <SectionTitle id="when-title">Khi nào xong</SectionTitle>
            <p className="m-0 text-sm leading-snug text-secondary">
              Tài khoản được xóa ngay khi bạn xác nhận. Xong thì bạn được đăng xuất và quay về trang đăng nhập.
            </p>
          </Card>

          {/* Export CSV button */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={handleExportCsv}
              className="m-tint h-12 w-full cursor-pointer rounded-full border-0 bg-card text-callout font-semibold text-ink shadow-field transition-transform"
            >
              Tải dữ liệu về (CSV)
            </button>
            <span className="text-center text-xs text-secondary">Nên tải trước, vì xóa xong không lấy lại được.</span>
          </div>

          {/* Confirmation input */}
          <label className="flex flex-col gap-1 text-cap font-semibold text-text">
            Gõ Xóa để xác nhận
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Xóa"
              autoComplete="off"
              aria-describedby="confirm-reason"
              className="h-[52px] rounded-xl border-0 bg-card px-4 text-body-lg font-semibold text-ink shadow-field outline-none placeholder:text-secondary focus-visible:outline-2 focus-visible:outline-cobalt"
            />
          </label>
        </main>
      </div>

      {/* The safe choice comes first and stands out; the destructive one is the quiet red-text pill below it (D-CTL-05) */}
      <footer className="mx-auto flex w-full max-w-[560px] flex-col gap-2 px-4 pb-5 pt-2">
        <Presence>
          {toastMessage && (
            <div className="mb-1">
              <Toast message={toastMessage} />
            </div>
          )}
        </Presence>

        <p id="confirm-reason" role="status" aria-live="polite" className="m-0 text-center text-cap text-secondary">
          {isConfirmed ? "" : "Gõ Xóa vào ô trên để mở nút xóa."}
        </p>

        <PillButton href="/settings" variant="primary">
          Hủy
        </PillButton>

        <PillButton
          type="button"
          variant="danger"
          disabled={!isConfirmed}
          aria-disabled={!isConfirmed}
          aria-describedby="confirm-reason"
          onClick={handleDelete}
        >
          Xóa tài khoản
        </PillButton>
      </footer>
    </div>
  );
}
