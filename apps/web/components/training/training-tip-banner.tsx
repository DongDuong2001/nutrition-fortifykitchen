import React from "react";
import { Notice } from "@/components/ui/notice";

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
    <Notice tone="promo" className={`p-3 sm:p-4 text-cap sm:text-sm leading-relaxed ${className}`}>
      <strong className="font-bold">Mẹo:</strong> {tipText}
    </Notice>
  );
}
