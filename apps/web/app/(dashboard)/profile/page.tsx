"use client";

import { useState } from "react";
import { BottomNav } from "@/components/ui/bottom-nav";
import { AppHeader } from "@/components/ui/app-header";
import { ChevronRightIcon } from "@/lib/runeicons";

export default function ProfilePage() {
  const [inPeriod, setInPeriod] = useState(false);

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24 md:pb-12">
      {/* Top Header */}
      <AppHeader
        variant="tab"
        title="HỒ SƠ"
        subtitle="user@example.com · Gói Miễn phí"
      />

      <div className="px-4 md:px-0 mt-4 md:mt-6 space-y-4">
        {/* Physical Stats Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-xs">
          <div className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-2">
            Cơ thể
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-1">
              <span className="font-bold text-sm text-neutral-900">Giới tính</span>
              <div className="flex items-center gap-1 text-sm font-bold text-neutral-800">
                <span>Nam</span>
                <ChevronRightIcon className="w-4 h-4 text-neutral-400" />
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-neutral-50">
              <div>
                <div className="font-bold text-sm text-neutral-900">
                  Gần/đang trong kỳ
                </div>
                <div className="text-xs text-neutral-400">
                  Chỉ với Nữ · sắt 18 → 28 mg/ngày
                </div>
              </div>
              <input
                type="checkbox"
                checked={inPeriod}
                onChange={(e) => setInPeriod(e.target.checked)}
                className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-1 border-t border-neutral-50">
              <span className="font-bold text-sm text-neutral-900">Năm sinh</span>
              <div className="flex items-center gap-1 text-sm font-bold text-neutral-800 font-mono">
                <span>2003</span>
                <ChevronRightIcon className="w-4 h-4 text-neutral-400" />
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-neutral-50">
              <span className="font-bold text-sm text-neutral-900">Cân nặng</span>
              <div className="flex items-center gap-1 text-sm font-bold text-neutral-800 font-mono">
                <span>65 kg</span>
                <ChevronRightIcon className="w-4 h-4 text-neutral-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Goals Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-xs">
          <div className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-2">
            Mục tiêu
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-1">
              <span className="font-bold text-sm text-neutral-900">Mục tiêu</span>
              <div className="flex items-center gap-1 text-sm font-bold text-neutral-800">
                <span>Giữ cân</span>
                <ChevronRightIcon className="w-4 h-4 text-neutral-400" />
              </div>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-neutral-50">
              <span className="font-bold text-sm text-neutral-900">
                Ngày tập mặc định
              </span>
              <div className="flex items-center gap-1 text-sm font-bold text-neutral-800">
                <span>60 phút</span>
                <ChevronRightIcon className="w-4 h-4 text-neutral-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Pro Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
          <div>
            <div className="font-black text-sm uppercase tracking-wider">
              Nâng cấp H1T MICRO Pro
            </div>
            <div className="text-xs text-blue-100 mt-0.5">
              Gợi ý của Coach, xu hướng 30 ngày
            </div>
          </div>
          <button className="px-3.5 py-1.5 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-xs hover:bg-blue-50 transition-colors">
            Xem gói
          </button>
        </div>
      </div>

      {/* Mobile Dock */}
      <BottomNav currentTab="profile" />
    </div>
  );
}
