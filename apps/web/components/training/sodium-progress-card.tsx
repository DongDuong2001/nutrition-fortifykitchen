import React from "react";
import { type SaltTarget } from "@/lib/training";
import { formatAmount } from "@/lib/format";
import { nutrientName } from "@/lib/nutrients";

export interface SodiumProgressCardProps {
  currentSodiumMg: number;
  saltTarget: SaltTarget;
  className?: string;
}

export function SodiumProgressCard({
  currentSodiumMg,
  saltTarget,
  className = "",
}: SodiumProgressCardProps) {
  const isAchieved = currentSodiumMg >= saltTarget.sodiumMin;
  const targetLabel = saltTarget.formattedSodiumRange;
  const currentFormatted = formatAmount(currentSodiumMg, "mg");

  return (
    <div
      data-align-group="training-summary"
      className={`bg-card border border-card-border rounded-[18px] lg:shadow-card p-5.5 flex flex-col justify-between gap-3 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-lg font-bold text-text">{nutrientName("sodium")} hôm nay</h2>
        {isAchieved && (
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-blue">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12l5 5 9-10" />
            </svg>
            Đạt
          </span>
        )}
      </div>

      <div>
        <div className="font-display italic font-extrabold text-3xl tabular-nums text-text">
          {currentFormatted}{" "}
          <span className="text-base font-semibold not-italic text-secondary">
            / {targetLabel}
          </span>
        </div>

        <div
          role="img"
          aria-label={`${nutrientName("sodium")} ${currentFormatted} trên mục tiêu ${targetLabel}${
            isAchieved ? ", đã đạt" : ""
          }`}
          className="grid grid-cols-10 gap-[3px] mt-3"
        >
          {Array.from({ length: 10 }).map((_, idx) => (
            <span
              key={idx}
              className={`h-2.5 rounded-[3px] ${
                isAchieved ? "bg-blue" : "bg-level-empty"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="text-[13px] text-secondary leading-relaxed">
        {isAchieved
          ? `Đã đạt mức tối thiểu. ${nutrientName("sodium")} từ các bữa ăn hôm nay được cộng tự động vào đây.`
          : `Còn thiếu ${formatAmount(saltTarget.sodiumMin - currentSodiumMg, "mg")} mg để đạt mức tối thiểu.`}
      </div>
    </div>
  );
}
