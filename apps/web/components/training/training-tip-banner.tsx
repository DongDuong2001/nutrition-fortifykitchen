import React from "react";

export interface TrainingTipBannerProps {
  isRestDay: boolean;
  className?: string;
}

/** The tip under the checklist: a cobalt-tint note with a hairline edge (V3 Training). */
export function TrainingTipBanner({
  isRestDay,
  className = "",
}: TrainingTipBannerProps) {
  const tipText = isRestDay
    ? "Ngày nghỉ vẫn ăn đủ đạm để cơ phục hồi."
    : "Nhấp tinh bột nhẹ theo từng hiệp ở ngưỡng nặng."; // lint-design-allow D-WRT-04: "nhấp" here is to sip, not to click

  return (
    <div
      role="note"
      className={`rounded-2xl bg-cobalt-tint px-4 py-3 text-cap leading-normal text-text shadow-[inset_0_0_0_1px_var(--color-card-border)] ${className}`}
    >
      <strong className="font-bold">Mẹo:</strong> {tipText}
    </div>
  );
}
