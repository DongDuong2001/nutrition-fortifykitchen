"use client";

import React, { useState } from "react";
import { COACH_SPECIALTIES, submitCoachApplication } from "@/lib/coaches";

interface CoachApplicationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function CoachApplicationSheet({ isOpen, onClose, onSubmitted }: CoachApplicationSheetProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState(COACH_SPECIALTIES[1] || "Tăng cơ");
  const [experienceYears, setExperienceYears] = useState(1);
  const [socialLink, setSocialLink] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập họ và tên");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }
    if (!message.trim()) {
      setError("Vui lòng nhập thông tin giới thiệu và chứng chỉ");
      return;
    }

    submitCoachApplication({
      name: name.trim(),
      email: email.trim(),
      specialty,
      experienceYears: Number(experienceYears) || 0,
      socialLink: socialLink.trim(),
      message: message.trim(),
    });

    setIsSuccess(true);
    setError("");
    if (onSubmitted) {
      onSubmitted();
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setName("");
    setEmail("");
    setMessage("");
    setSocialLink("");
    setError("");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-apply-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-[520px] rounded-t-[24px] sm:rounded-[24px] bg-card p-6 shadow-xl border border-card-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-card-border">
          <div>
            <h2 id="coach-apply-title" className="m-0 text-lg font-black text-text">
              Ứng tuyển Huấn luyện viên
            </h2>
            <span className="text-xs text-secondary">Xét duyệt danh hiệu Cấp 5 & Bảo chứng chuyên môn</span>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Đóng"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-page text-secondary hover:text-text cursor-pointer border-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue/10 text-blue font-black text-2xl">
              ✓
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="m-0 text-base font-bold text-text">Đã gửi hồ sơ ứng tuyển</h3>
              <p className="m-0 text-xs text-secondary leading-relaxed max-w-[360px]">
                Hồ sơ của bạn đã được chuyển tới Ban Chuyên môn H1T và Admin để kiểm duyệt. Kết quả sẽ được cập nhật trong mục Hồ sơ.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="mt-2 min-h-[44px] rounded-full bg-blue px-6 text-sm font-bold text-on-accent border-0 cursor-pointer transition-transform duration-150 active:scale-[0.97]"
            >
              Hoàn tất
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
            {error && (
              <div className="rounded-[12px] bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="coach-name" className="text-xs font-bold text-text">
                Họ và tên <span className="text-destructive">*</span>
              </label>
              <input
                id="coach-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn Hưng"
                required
                className="min-h-[44px] rounded-[12px] border border-card-border bg-page px-3.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="coach-email" className="text-xs font-bold text-text">
                Email liên hệ <span className="text-destructive">*</span>
              </label>
              <input
                id="coach-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@example.com"
                required
                className="min-h-[44px] rounded-[12px] border border-card-border bg-page px-3.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="coach-specialty" className="text-xs font-bold text-text">
                  Chuyên môn chính
                </label>
                <select
                  id="coach-specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="min-h-[44px] rounded-[12px] border border-card-border bg-page px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue"
                >
                  {COACH_SPECIALTIES.filter((s) => s !== "Tất cả").map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="coach-experience" className="text-xs font-bold text-text">
                  Số năm kinh nghiệm
                </label>
                <input
                  id="coach-experience"
                  type="number"
                  min="0"
                  max="40"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  className="min-h-[44px] rounded-[12px] border border-card-border bg-page px-3.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="coach-social" className="text-xs font-bold text-text">
                Link nhóm Zalo hoặc Facebook cộng đồng
              </label>
              <input
                id="coach-social"
                type="url"
                value={socialLink}
                onChange={(e) => setSocialLink(e.target.value)}
                placeholder="https://zalo.me/g/... hoặc https://facebook.com/groups/..."
                className="min-h-[44px] rounded-[12px] border border-card-border bg-page px-3.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="coach-message" className="text-xs font-bold text-text">
                Chứng chỉ và định hướng hỗ trợ thành viên <span className="text-destructive">*</span>
              </label>
              <textarea
                id="coach-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mô tả chứng chỉ (CISSN, NASM, PN1...), kinh nghiệm thực chiến và mong muốn đồng hành cùng cộng đồng H1T."
                required
                className="rounded-[12px] border border-card-border bg-page p-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="min-h-[44px] rounded-full border border-card-border bg-card px-5 text-xs font-bold text-secondary cursor-pointer hover:text-text transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="min-h-[44px] rounded-full bg-blue px-6 text-xs font-bold text-on-accent border-0 cursor-pointer transition-transform duration-150 active:scale-[0.97]"
              >
                Nộp hồ sơ xét duyệt
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
