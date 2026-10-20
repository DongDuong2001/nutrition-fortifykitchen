import React from "react";
import { AppHeader } from "@/components/ui/app-header";
import { Card } from "@/components/ui/card";

const BENEFITS = [
  "Gợi ý món theo vi chất còn thiếu",
  "Xu hướng 30 & 90 ngày",
  "Món & công thức riêng của huấn luyện viên",
  "Xuất dữ liệu CSV",
];

export default function PaywallPage() {
  return (
    <div className="w-full min-h-dvh bg-page text-text font-sans flex flex-col justify-between">
      <div className="flex flex-col">
        <AppHeader
          variant="sub"
          title="Pro"
          subtitle="Ăn theo huấn luyện viên, không phải đoán"
          backHref="/settings"
          backLabel="Quay lại"
          alignGroup="paywall-header"
        />

        <main className="w-full max-w-[560px] mx-auto px-4 pt-4 pb-4 flex flex-col gap-3">
          <Card className="p-4 flex flex-col gap-3">
            {/* Benefits list */}
            <ul className="list-none m-0 p-0 flex flex-col gap-2">
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="flex gap-3 items-start text-callout leading-snug text-text"
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
                    className="shrink-0 text-cobalt mt-0.5"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <p className="m-0 pt-2 border-t border-divider text-sm text-secondary">
              Sắp ra mắt — bạn sẽ được thông báo khi mở đăng ký.
            </p>
          </Card>
        </main>
      </div>

      <footer className="w-full max-w-[560px] mx-auto px-4 pt-2 pb-5 flex flex-col items-center gap-1.5">
        <div className="text-xs text-secondary text-center">
          Gói miễn phí vẫn theo dõi đủ 22 vi chất.
        </div>
      </footer>
    </div>
  );
}
