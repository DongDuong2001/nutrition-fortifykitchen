"use client";

import React from "react";
import { formatNumber, formatAmount } from "@/lib/format";
import { calculateSegments } from "@/lib/levels";
import { targetRangeText } from "@/lib/profile";
import type { NutrientTrendResult } from "@/lib/trends";

interface NutrientTrendListProps {
  title: string;
  nutrients: NutrientTrendResult[];
  rangeDays: number;
}

export function NutrientTrendList({
  title,
  nutrients,
  rangeDays,
}: NutrientTrendListProps) {
  return (
    <section
      aria-labelledby="t-nutrients"
      className="bg-card border border-card-border rounded-[18px] p-3.5 md:p-4 pb-2 flex flex-col shadow-xs"
    >
      <div className="flex items-center justify-between mb-1">
        <h2 id="t-nutrients" className="m-0 text-base font-bold text-text">
          {title}
        </h2>
        <span className="text-xs text-secondary font-medium">
          Mục tiêu / ngày
        </span>
      </div>

      <div className="divide-y divide-divider">
        {nutrients.map((item) => {
          const filledCount = calculateSegments(item.averagePercentage);
          const levelColorText =
            item.level === "thieu"
              ? "text-destructive"
              : item.level === "trungbinh"
              ? "text-level-yellow"
              : item.level === "ganDu"
              ? "text-level-green"
              : "text-blue";

          const levelColorBg =
            item.level === "thieu"
              ? "bg-destructive"
              : item.level === "trungbinh"
              ? "bg-level-yellow"
              : item.level === "ganDu"
              ? "bg-level-green"
              : "bg-blue";

          const levelLabel =
            item.level === "thieu"
              ? "thiếu"
              : item.level === "trungbinh"
              ? "trung bình"
              : item.level === "ganDu"
              ? "gần đủ"
              : "đạt";

          return (
            <div
              key={item.key}
              data-align-group="trends-rows"
              className="py-2.5 flex flex-col gap-1.5 justify-center"
            >
              {/* Row 1: Name left, %, level, x/N đạt right */}
              <div className="flex items-center justify-between gap-2 text-sm min-h-[28px]">
                <div className="font-semibold text-text flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{item.name}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-right">
                  <span className="text-xs text-secondary font-medium tabular-nums">
                    {item.daysOnTarget}/{rangeDays} ngày đạt
                  </span>
                  <span
                    className={`text-[13px] font-bold tabular-nums ${levelColorText}`}
                  >
                    {item.averagePercentage}%
                    {item.level === "thieu" ? " · thiếu" : ""}
                  </span>
                </div>
              </div>

              {/* Row 2: 10-segmented progress bar */}
              <div
                role="progressbar"
                aria-valuenow={item.averagePercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.name} trung bình ${item.averagePercentage}%, ${levelLabel}`}
                className="grid grid-cols-10 gap-[3px] w-full"
              >
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    aria-hidden="true"
                    className={`h-1.5 rounded-xs transition-colors ${
                      i < filledCount ? levelColorBg : "bg-level-empty"
                    }`}
                  />
                ))}
              </div>

              {/* Row 3: Subtext with average value vs target */}
              <div className="flex items-center justify-between text-xs text-secondary tabular-nums">
                <span>
                  TB: {formatAmount(item.averageValue, item.unit)} {item.unit}
                </span>
                <span>
                  Mục tiêu: {targetRangeText({ min: item.targetMin, max: item.targetMax ?? item.targetMin }, item.unit)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
