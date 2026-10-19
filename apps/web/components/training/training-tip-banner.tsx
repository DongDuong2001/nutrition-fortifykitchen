import React from "react";

export interface TrainingTipBannerProps {
  isRestDay: boolean;
  className?: string;
}

export function TrainingTipBanner({
  isRestDay,
  className = "",
}: TrainingTipBannerProps) {
  const tipText = isRestDay
    ? "Ngày nghỉ vẫn ăn đủ đạm để cơ phục hồi."
    : "Nhấp tinh bột nhẹ theo từng hiệp ở ngưỡng nặng.";

  return (
    <div
      className={`bg-card border border-card-border rounded-card lg:shadow-card p-3 sm:p-4 text-cap sm:text-sm leading-relaxed flex items-start gap-3 text-text ${className}`}
    >
      <span
        className="w-1 self-stretch rounded-full bg-cobalt shrink-0"
        aria-hidden="true"
      />
      <div>
        <strong className="font-bold">Mẹo:</strong> {tipText}
      </div>
    </div>
  );
}
