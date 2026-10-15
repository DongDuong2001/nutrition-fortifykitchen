"use client";

import React, { useState } from "react";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { COACH_SPECIALTIES, submitCoachApplication } from "@/lib/coaches";

interface CoachApplicationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const FIELD =
  "h-12 w-full rounded-xl border-2 border-card-border bg-card px-4 text-base text-text outline-none transition-colors focus:border-blue";

/** The Cấp 5 application: a Sheet (Esc closes, focus returns to the button that opened it). */
export function CoachApplicationSheet({ isOpen, onClose, onSubmitted }: CoachApplicationSheetProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState(COACH_SPECIALTIES[1] || "Tăng cơ");
  const [experienceYears, setExperienceYears] = useState(1);
  const [socialLink, setSocialLink] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

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
    <Sheet
      open={isOpen}
      onClose={handleResetAndClose}
      title="Ứng tuyển huấn luyện viên"
      titleId="coach-apply-title"
      description="Xét duyệt danh hiệu Cấp 5 và bảo chứng chuyên môn"
      desktopDialog
      className="max-h-[90dvh] overflow-y-auto"
    >
      {isSuccess ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center" role="status">
          <h3 className="m-0 text-base font-bold text-text">Đã gửi hồ sơ ứng tuyển</h3>
          <p className="m-0 max-w-[360px] text-[13px] leading-snug text-secondary">
            Hồ sơ của bạn đã được chuyển tới Ban Chuyên môn H1T và quản trị viên để kiểm duyệt. Kết quả sẽ được cập nhật
            trong mục Hồ sơ.
          </p>
          <PillButton type="button" onClick={handleResetAndClose}>
            Hoàn tất
          </PillButton>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          {error && (
            <div role="alert" className="rounded-xl bg-warning-bg p-3 text-[13px] font-semibold text-warning-text">
              {error}
            </div>
          )}

          <FormRow label="Họ và tên" htmlFor="coach-name" required>
            <input
              id="coach-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn Hưng"
              autoComplete="name"
              className={FIELD}
            />
          </FormRow>

          <FormRow label="Email liên hệ" htmlFor="coach-email" required>
            <input
              id="coach-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@email.com"
              autoComplete="email"
              className={FIELD}
            />
          </FormRow>

          <FormRow label="Chuyên môn chính" htmlFor="coach-specialty">
            <select id="coach-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={FIELD}>
              {COACH_SPECIALTIES.filter((s) => s !== "Tất cả").map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="Số năm kinh nghiệm" htmlFor="coach-experience">
            <input
              id="coach-experience"
              type="number"
              inputMode="numeric"
              min="0"
              max="40"
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
              className={FIELD}
            />
          </FormRow>

          <FormRow label="Liên kết nhóm Zalo hoặc Facebook cộng đồng" htmlFor="coach-social">
            <input
              id="coach-social"
              type="url"
              value={socialLink}
              onChange={(e) => setSocialLink(e.target.value)}
              placeholder="https://zalo.me/g/..."
              className={FIELD}
            />
          </FormRow>

          <FormRow label="Chứng chỉ và định hướng hỗ trợ thành viên" htmlFor="coach-message" required>
            <textarea
              id="coach-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mô tả chứng chỉ, kinh nghiệm thực tế và mong muốn đồng hành cùng cộng đồng H1T."
              className="w-full rounded-xl border-2 border-card-border bg-card p-4 text-base text-text outline-none transition-colors focus:border-blue"
            />
          </FormRow>

          <div className="flex flex-col gap-2 pt-2">
            <PillButton type="submit">Nộp hồ sơ xét duyệt</PillButton>
            <PillButton type="button" variant="secondary" onClick={handleResetAndClose}>
              Hủy
            </PillButton>
          </div>
        </form>
      )}
    </Sheet>
  );
}
