"use client";

import React from "react";
import { formatNumber } from "@/lib/format";
import { calculateSegments } from "@/lib/levels";
import type { NutrientTrendResult } from "@/lib/trends";

interface ProteinTrendCardProps {
  proteinTrend: NutrientTrendResult;
}

export function ProteinTrendCard({ proteinTrend }: ProteinTrendCardProps) {
  const isTargetMet = proteinTrend.averageValue >= proteinTrend.targetMin;
  const filledCount = calculateSegments(proteinTrend.averagePercentage);

  return (
    <section
      aria-labelledby="t-pro"
      className="bg-card border border-card-border rounded-[18px] p-3.5 md:p-4 flex flex-col gap-2 shadow-xs"
    >
      <div className="flex items-center justify-between gap-2.5">
        <h2 id="t-pro" className="m-0 text-base font-bold text-text">
          Đạm trung bình
        </h2>
        <div className="text-[15px] font-bold tabular-nums text-text">
          <span className="text-blue">
            {formatNumber(proteinTrend.averageValue)} g
          </span>{" "}
          / {formatNumber(proteinTrend.targetMin)} g{" "}
          {isTargetMet ? "✓" : ""}
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={proteinTrend.averagePercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Đạm trung bình ${proteinTrend.averageValue}g trên mục tiêu ${proteinTrend.targetMin}g`}
        className="grid grid-cols-10 gap-[3px] w-full"
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={`h-1.5 rounded-xs transition-colors ${
              i < filledCount ? "bg-blue" : "bg-level-empty"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
