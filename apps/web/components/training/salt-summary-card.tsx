import React from "react";
import { formatSaltRange, type SaltTarget } from "@/lib/training";

export interface SaltSummaryCardProps {
  saltTarget: SaltTarget;
  isRestDay: boolean;
  trainingMinutes?: number;
  variant?: "mobile-banner" | "desktop-card";
  className?: string;
}

export function SaltSummaryCard({
  saltTarget,
  isRestDay,
  trainingMinutes = 60,
  variant = "desktop-card",
  className = "",
}: SaltSummaryCardProps) {
  if (variant === "mobile-banner") {
    return (
      <div
        className={`flex items-end justify-between pt-1 gap-3 w-full ${className}`}
      >
        <div className="text-cap text-muted-on-dark leading-snug">
          {isRestDay ? (
            <>
              Muối hôm nay
              <br />
              Ngày nghỉ: chỉ cần muối nền, không cộng thêm
            </>
          ) : (
            <>
              Muối cần hôm nay
              <br />
              {formatSaltRange(saltTarget.baseMin, saltTarget.baseMax)} g cả ngày + {saltTarget.formattedTopUp} g khi tập
            </>
          )}
        </div>
        <div className="font-display italic font-bold text-display leading-none tabular-nums text-on-dark shrink-0">
          {saltTarget.formattedTotal}
          <span className="text-lg not-italic font-normal text-sky"> g</span>
        </div>
      </div>
    );
  }

  // Desktop Card per DesktopTraining.dc.html
  return (
    <div
      data-align-group="training-summary"
      data-align-edge="left"
      className={`bg-ink text-on-dark rounded-card p-6 flex flex-col justify-between gap-3 ${className}`}
    >
      <div className="text-sm text-muted-on-dark">
        {isRestDay ? "Muối hôm nay" : "Muối cần hôm nay"}
      </div>

      <div className="font-display italic font-extrabold text-[3.5rem] leading-none tabular-nums text-on-dark">
        {saltTarget.formattedTotal}
        <span className="text-title not-italic font-normal text-sky"> g</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px] bg-surface-dark rounded-xl p-3">
          <div className="text-xl font-bold tabular-nums">{formatSaltRange(saltTarget.baseMin, saltTarget.baseMax)} g</div>
          <div className="text-cap text-muted-on-dark mt-0.5">nền cả ngày</div>
        </div>
        <div className="flex-1 min-w-[140px] bg-surface-dark rounded-xl p-3">
          <div className="text-xl font-bold tabular-nums">
            {isRestDay ? "0 g" : `${saltTarget.formattedTopUp} g`}
          </div>
          <div className="text-cap text-muted-on-dark mt-0.5">
            {isRestDay ? "ngày nghỉ" : `khi tập ${trainingMinutes} phút`}
          </div>
        </div>
      </div>

      <div className="text-cap text-sky mt-1">
        {isRestDay
          ? "Ngày nghỉ: chỉ cần muối nền, không cộng thêm"
          : "Cách tính: 4–6 g/ngày + 1–1,5 g mỗi 20 phút tập"}
      </div>
    </div>
  );
}
