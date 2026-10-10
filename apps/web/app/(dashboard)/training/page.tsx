"use client";

import { useState } from "react";
import { BottomNav } from "@/components/ui/bottom-nav";
import { CheckIcon } from "@/lib/runeicons";

export default function TrainingPage() {
  const [selectedDuration, setSelectedDuration] = useState<string>("60");
  const [preChecked, setPreChecked] = useState<Record<string, boolean>>({
    "cha-la": true,
    "bot-cu-den": true,
  });
  const [intraChecked, setIntraChecked] = useState<Record<string, boolean>>({
    "muoi-0-20": true,
    "muoi-20-40": false,
    "muoi-40-60": false,
    "carb-nhanh": false,
  });

  const durations = [
    { id: "rest", label: "Nghỉ" },
    { id: "45", label: "45 phút" },
    { id: "60", label: "60 phút" },
    { id: "90", label: "90 phút" },
    { id: "120", label: "120 phút" },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24 md:pb-12">
      {/* Top Black Header (Matches Safari _ Ng_y t_p.png) */}
      <div className="bg-[#0A0A0A] text-white rounded-b-3xl md:rounded-3xl p-5 md:p-8 shadow-md">
        <div className="text-xs font-semibold text-neutral-400">
          Hôm nay, 10/10
        </div>
        <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mt-0.5">
          NGÀY TẬP
        </h1>

        {/* Duration Pills Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-5">
          {durations.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDuration(d.id)}
              className={`py-3 rounded-2xl text-xs font-black transition-all ${
                selectedDuration === d.id
                  ? "bg-[#2563EB] text-white shadow-md"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Salt Requirement Banner */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
          <div>
            <div className="text-xs font-bold text-neutral-400">Muối cần hôm nay</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              4–6 g cả ngày + 3–4,5 g khi tập
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black italic font-mono text-white">
            7–10,5 <span className="text-sm font-normal not-italic text-neutral-400">g</span>
          </div>
        </div>
      </div>

      {/* Main Routine Checklists */}
      <div className="px-4 md:px-0 mt-4 md:mt-6 space-y-4">
        {/* Trước tập (Pre-workout) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
            <h3 className="font-black text-base text-neutral-900">Trước tập</h3>
            <span className="font-mono text-xs font-bold text-neutral-500">2 / 2</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preChecked["cha-la"]}
                  onChange={(e) =>
                    setPreChecked({ ...preChecked, "cha-la": e.target.checked })
                  }
                  className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="font-bold text-sm text-neutral-900">Chà là</div>
                  <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                    <CheckIcon className="w-3 h-3 text-blue-600 stroke-[3]" />
                    <span>Đã ghi vào Trước tập</span>
                  </div>
                </div>
              </label>
              <span className="font-mono text-sm font-bold text-neutral-900 shrink-0">
                30 g
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 pt-2 border-t border-neutral-50">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preChecked["bot-cu-den"]}
                  onChange={(e) =>
                    setPreChecked({ ...preChecked, "bot-cu-den": e.target.checked })
                  }
                  className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="font-bold text-sm text-neutral-900">
                    Bột củ dền (Dalahouse)
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    Tăng lưu chuyển dinh dưỡng
                  </div>
                </div>
              </label>
              <span className="font-mono text-sm font-bold text-neutral-900 shrink-0">
                3 g
              </span>
            </div>
          </div>
        </div>

        {/* Trong tập (Intra-workout) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
            <h3 className="font-black text-base text-neutral-900">
              Trong tập · 60 phút
            </h3>
            <span className="font-mono text-xs font-bold text-neutral-500">1 / 4</span>
          </div>

          <div className="space-y-3">
            {[
              {
                id: "muoi-0-20",
                title: "Muối · phút 0–20",
                subtitle: "Đã ghi 1 g vào nhật ký · chạm để sửa",
                amount: "1–1,5 g",
              },
              {
                id: "muoi-20-40",
                title: "Muối · phút 20–40",
                subtitle: "Pha cùng 300 ml nước",
                amount: "1–1,5 g",
              },
              {
                id: "muoi-40-60",
                title: "Muối · phút 40–60",
                subtitle: "Pha cùng 300 ml nước",
                amount: "1–1,5 g",
              },
              {
                id: "carb-nhanh",
                title: "Carb nhanh",
                subtitle: "Mật mía / nước ép hoa quả",
                amount: "30–45 g",
              },
            ].map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 pt-2 first:pt-0 border-t first:border-t-0 border-neutral-50"
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={intraChecked[item.id]}
                    onChange={(e) =>
                      setIntraChecked({
                        ...intraChecked,
                        [item.id]: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="font-bold text-sm text-neutral-900">{item.title}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">{item.subtitle}</div>
                  </div>
                </label>
                <span className="font-mono text-sm font-bold text-neutral-900 shrink-0">
                  {item.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Dock */}
      <BottomNav currentTab="training" />
    </div>
  );
}
