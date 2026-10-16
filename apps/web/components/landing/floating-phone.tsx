"use client";

import React from "react";

/**
 * FloatingPhone Component
 * 3D perspective smartphone displaying the authentic H1T MICRO mobile app dashboard,
 * with pure CSS floating animation and zero external dependencies.
 */
export function FloatingPhone() {
  return (
    <div className="relative perspective-[1200px] flex items-center justify-center py-6">
      <style>{`
        @keyframes float-phone {
          0%, 100% {
            transform: translateZ(16px) translateY(-6px) rotateY(-20deg) rotateX(10deg);
          }
          50% {
            transform: translateZ(36px) translateY(-20px) rotateY(-16deg) rotateX(7deg);
          }
        }
        .floating-phone-wrap {
          transform-style: preserve-3d;
          animation: float-phone 5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .floating-phone-wrap {
            animation: none;
            transform: translateZ(16px) translateY(-6px) rotateY(-18deg) rotateX(8deg);
          }
        }
      `}</style>

      {/* Ambient background glow */}
      <div
        className="absolute -inset-4 rounded-full bg-gradient-to-tr from-blue/20 via-sky/20 to-transparent blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="floating-phone-wrap relative rounded-[40px] bg-gradient-to-tr from-blue via-sky/60 to-card p-1 shadow-2xl transition-transform duration-500 hover:rotate-0">
        {/* Outer Phone Hardware Chassis */}
        <div className="relative w-[280px] sm:w-[310px] h-[590px] rounded-[38px] border-4 border-ink/80 bg-ink p-2.5 shadow-2xl flex flex-col overflow-hidden">
          {/* Dynamic Island / Speaker Notch */}
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-30 h-5 w-24 rounded-full bg-ink flex items-center justify-between px-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-surface-dark border border-card/20" />
            <div className="h-1.5 w-8 rounded-full bg-surface-dark" />
          </div>

          {/* Phone Screen Display */}
          <div className="relative z-10 w-full h-full rounded-[30px] bg-page overflow-hidden flex flex-col text-text font-sans select-none border border-card-border/60">
            {/* Status Bar */}
            <div className="pt-2 px-5 flex items-center justify-between text-[11px] font-bold text-ink">
              <span>09:41</span>
              <div className="flex items-center gap-1.5 opacity-80">
                {/* Signal Icon */}
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z" />
                </svg>
                {/* Wifi Icon */}
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                </svg>
                {/* Battery Icon */}
                <div className="w-5 h-2.5 border border-ink rounded-xs p-0.5 flex items-center">
                  <div className="w-full h-full bg-ink rounded-2xs" />
                </div>
              </div>
            </div>

            {/* App Header */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-card-border/60 bg-page">
              <div className="flex items-center gap-1.5">
                <span className="font-display italic font-black text-base text-ink tracking-tight">
                  H1T <span className="text-blue">MICRO</span>
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue/10 text-blue border border-blue/20">
                Hôm nay
              </span>
            </div>

            {/* Scrollable Screen Content */}
            <div className="flex-1 overflow-hidden p-3 flex flex-col gap-2.5">
              {/* Daily Energy & Macro Card (Surface Dark) */}
              <div className="rounded-xl bg-surface-dark p-3 text-on-dark flex flex-col gap-2 shadow-sm border border-card-border/20">
                <div className="flex justify-between items-baseline">
                  <div>
                    <div className="text-[10px] font-bold text-sky uppercase tracking-wider">Năng lượng nạp</div>
                    <div className="text-xl font-black font-display italic leading-none mt-0.5">
                      1.041 <span className="text-[11px] font-normal text-muted-on-dark font-sans">/ 2.050 kcal</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue/30 text-sky border border-blue/40">
                    51%
                  </span>
                </div>

                {/* Calorie progress bar */}
                <div className="w-full h-1.5 rounded-full bg-card/15 overflow-hidden">
                  <div className="h-full bg-blue rounded-full w-[51%]" />
                </div>

                {/* 4 Macros mini grid */}
                <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] text-center border-t border-card-border/20">
                  <div className="bg-card/10 rounded py-1">
                    <div className="text-muted-on-dark text-[9px]">Đạm</div>
                    <div className="font-bold">62g</div>
                  </div>
                  <div className="bg-card/10 rounded py-1">
                    <div className="text-muted-on-dark text-[9px]">Carb</div>
                    <div className="font-bold">133g</div>
                  </div>
                  <div className="bg-card/10 rounded py-1">
                    <div className="text-muted-on-dark text-[9px]">Béo</div>
                    <div className="font-bold">21g</div>
                  </div>
                  <div className="bg-card/10 rounded py-1">
                    <div className="text-muted-on-dark text-[9px]">Xơ</div>
                    <div className="font-bold">14g</div>
                  </div>
                </div>
              </div>

              {/* 22 Micronutrients Status Pill */}
              <div className="rounded-lg bg-card border border-card-border p-2 flex items-center justify-between text-[11px] shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  <span className="h-2 w-2 rounded-full bg-level-green" />
                  <span>Vi chất đạt 18/22</span>
                </div>
                <span className="text-[10px] font-semibold text-blue">Xem chi tiết &rsaquo;</span>
              </div>

              {/* Meals List */}
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] font-extrabold uppercase text-secondary tracking-wider px-1">
                  Nhật ký món ăn
                </div>

                {/* Meal row 1 */}
                <div className="rounded-lg bg-card border border-card-border p-2 flex items-center justify-between shadow-2xs">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-text truncate">Phở bò tái nạm</span>
                    <span className="text-[10px] text-secondary">Bữa sáng · 1 tô (520g)</span>
                  </div>
                  <span className="text-xs font-bold text-ink">480 kcal</span>
                </div>

                {/* Meal row 2 */}
                <div className="rounded-lg bg-card border border-card-border p-2 flex items-center justify-between shadow-2xs">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-text truncate">Ức gà áp chảo</span>
                    <span className="text-[10px] text-secondary">Bữa trưa · 150g</span>
                  </div>
                  <span className="text-xs font-bold text-ink">247 kcal</span>
                </div>

                {/* Meal row 3 */}
                <div className="rounded-lg bg-card border border-card-border p-2 flex items-center justify-between shadow-2xs">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-text truncate">Cơm gạo lứt</span>
                    <span className="text-[10px] text-secondary">Bữa trưa · 1 chén (120g)</span>
                  </div>
                  <span className="text-xs font-bold text-ink">150 kcal</span>
                </div>
              </div>
            </div>

            {/* Phone Bottom Tab Bar */}
            <div className="px-4 py-2 border-t border-card-border bg-card/90 flex items-center justify-around text-[9px] font-bold text-secondary">
              <div className="flex flex-col items-center text-blue">
                <span className="text-xs leading-none">■</span>
                <span className="mt-0.5">Hôm nay</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs leading-none">▲</span>
                <span className="mt-0.5">Tổng quan</span>
              </div>
              <div className="flex flex-col items-center -mt-2">
                <div className="h-7 w-7 rounded-full bg-blue text-on-accent flex items-center justify-center font-bold text-sm shadow">
                  +
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs leading-none">●</span>
                <span className="mt-0.5">Khám phá</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs leading-none">⚙</span>
                <span className="mt-0.5">Cài đặt</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FloatingPhone;
