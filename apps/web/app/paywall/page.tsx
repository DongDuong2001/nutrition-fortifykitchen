"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/ui/app-header";
import { useBack } from "@/hooks/use-back";

interface Plan {
  id: "month" | "year";
  name: string;
  price: string;
  chip?: string;
}

const PLANS: Plan[] = [
  { id: "month", name: "Tháng", price: "[GIÁ/THÁNG]" },
  { id: "year", name: "Năm", price: "[GIÁ/NĂM]", chip: "Tiết kiệm [X]%" },
];

const BENEFITS = [
  "Gợi ý món theo vi chất còn thiếu",
  "Xu hướng 30 & 90 ngày",
  "Món & công thức riêng của Coach",
  "Xuất dữ liệu CSV",
];

export default function PaywallPage() {
  const goBack = useBack();
  const [selectedPlan, setSelectedPlan] = useState<"month" | "year">("year");

  return (
    <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col justify-between">
      <div className="flex flex-col">
        <AppHeader
          variant="sub"
          title="PRO"
          subtitle="Ăn theo Coach, không phải đoán"
          onBack={goBack}
          backLabel="Quay lại"
          alignGroup="paywall-header"
        />

        <main className="w-full max-w-[560px] mx-auto px-4 pt-4 pb-4 flex flex-col gap-3">
          {/* Benefits list */}
          <ul className="list-none m-0 p-0 flex flex-col gap-2">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex gap-3 items-start text-[15px] leading-snug text-text"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="shrink-0 text-blue mt-0.5"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          {/* Pricing plans */}
          <div
            role="radiogroup"
            aria-label="Chọn gói"
            className="flex flex-col gap-2 pt-1"
          >
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`text-left min-h-[64px] rounded-xl bg-card text-ink p-2 px-4 flex items-center gap-3 transition-all cursor-pointer active:scale-[0.99] ${
                    isSelected
                      ? "border-2 border-blue shadow-sm"
                      : "border-2 border-card-border hover:border-divider"
                  }`}
                >
                  {/* Radio dot */}
                  <span
                    aria-hidden="true"
                    className={`shrink-0 w-5 h-5 rounded-full border-2 box-border flex items-center justify-center transition-colors ${
                      isSelected ? "border-blue" : "border-divider"
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        isSelected ? "bg-blue" : "bg-transparent"
                      }`}
                    />
                  </span>

                  <span className="flex-1 flex flex-col gap-1 items-start">
                    <span className="text-base font-bold text-text leading-tight">
                      {plan.name}
                    </span>
                    {plan.chip && (
                      <span className="text-[13px] font-bold text-on-accent bg-blue rounded-full py-0.5 px-3 leading-none">
                        {plan.chip}
                      </span>
                    )}
                  </span>

                  <span className="text-[15px] font-bold tabular-nums text-text">
                    {plan.price}
                  </span>
                </button>
              );
            })}
          </div>
        </main>
      </div>

      {/* Footer checkout actions */}
      <footer className="w-full max-w-[560px] mx-auto px-4 pt-2 pb-5 flex flex-col items-center gap-1.5">
        <Link
          href="/settings"
          className="no-underline self-stretch h-[52px] rounded-full bg-blue text-on-accent flex items-center justify-center text-base font-bold shadow-sm hover:opacity-95 active:scale-[0.97] transition-all"
        >
          Tiếp tục thanh toán
        </Link>
        <div className="text-[13px] text-secondary text-center">
          Thanh toán qua [NHÀ CUNG CẤP THANH TOÁN] · huỷ bất cứ lúc nào
        </div>
        <button
          type="button"
          className="h-11 border-0 bg-transparent text-blue text-[15px] font-semibold underline cursor-pointer hover:opacity-85"
        >
          Khôi phục gói đã mua
        </button>
        <div className="text-xs text-secondary text-center">
          Gói Miễn phí vẫn ghi đủ 22 vi chất.
        </div>
      </footer>
    </div>
  );
}
