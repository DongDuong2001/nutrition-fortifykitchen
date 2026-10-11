"use client";

import React from "react";
import { getRestDayTips } from "@/lib/training";

export interface RestDayCardProps {
  className?: string;
}

export function RestDayCard({ className = "" }: RestDayCardProps) {
  const tips = getRestDayTips();

  return (
    <section
      aria-labelledby="rest-title"
      data-align-group="training-content"
      data-align-edge="left"
      className={`bg-card border border-card-border rounded-[18px] px-4 pt-3.5 pb-1.5 flex flex-col ${className}`}
    >
      <div className="flex items-center gap-3 pb-2.5">
        <div className="w-11 h-11 rounded-full bg-blue/10 text-blue flex items-center justify-center shrink-0">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
          </svg>
        </div>
        <h2 id="rest-title" className="m-0 text-lg font-bold text-text">
          Hôm nay nghỉ tập
        </h2>
      </div>

      <div className="flex flex-col">
        {tips.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 min-h-[52px] border-t border-divider first:border-t-0"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-blue shrink-0"
            >
              <path d={t.path} />
            </svg>
            <span className="text-[15px] font-semibold text-text">{t.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
