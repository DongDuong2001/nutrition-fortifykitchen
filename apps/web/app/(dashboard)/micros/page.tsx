"use client";

import { useState } from "react";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import { BottomDock } from "@/components/layout/bottom-dock";
import { CheckIcon, ChevronRightIcon } from "@/lib/runeicons";

interface MicronutrientItem {
  id: string;
  name: string;
  consumed: number;
  target: number;
  unit: string;
  status: "dat" | "gandu" | "trungbinh" | "thieu";
}

const VITAMINS: MicronutrientItem[] = [
  { id: "b12", name: "Vitamin B12", consumed: 3.1, target: 2.4, unit: "µg", status: "dat" },
  { id: "b2", name: "Vitamin B2", consumed: 1.4, target: 1.3, unit: "mg", status: "dat" },
  { id: "b3", name: "Vitamin B3", consumed: 18, target: 16, unit: "mg", status: "dat" },
  { id: "b6", name: "Vitamin B6", consumed: 1.1, target: 1.3, unit: "mg", status: "gandu" },
  { id: "b5", name: "Vitamin B5", consumed: 4.1, target: 5.0, unit: "mg", status: "gandu" },
  { id: "a", name: "Vitamin A", consumed: 520, target: 650, unit: "µg", status: "gandu" },
  { id: "b1", name: "Vitamin B1", consumed: 0.9, target: 1.2, unit: "mg", status: "trungbinh" },
  { id: "b9", name: "Folate (B9)", consumed: 290, target: 400, unit: "µg", status: "trungbinh" },
  { id: "k", name: "Vitamin K", consumed: 85, target: 150, unit: "µg", status: "trungbinh" },
  { id: "c", name: "Vitamin C", consumed: 35, target: 90, unit: "mg", status: "thieu" },
  { id: "d", name: "Vitamin D", consumed: 4, target: 20, unit: "µg", status: "thieu" },
  { id: "e", name: "Vitamin E", consumed: 4.5, target: 15, unit: "mg", status: "thieu" },
];

const MINERALS: MicronutrientItem[] = [
  { id: "na", name: "Natri", consumed: 2100, target: 2000, unit: "mg", status: "dat" },
  { id: "fe", name: "Sắt", consumed: 18.5, target: 18, unit: "mg", status: "dat" },
  { id: "p", name: "Photpho", consumed: 750, target: 700, unit: "mg", status: "dat" },
  { id: "zn", name: "Kẽm", consumed: 11.2, target: 11, unit: "mg", status: "dat" },
  { id: "cu", name: "Đồng", consumed: 0.95, target: 0.9, unit: "mg", status: "dat" },
  { id: "k_m", name: "Kali", consumed: 2800, target: 3500, unit: "mg", status: "gandu" },
  { id: "mg", name: "Magie", consumed: 310, target: 400, unit: "mg", status: "gandu" },
  { id: "se", name: "Selen", consumed: 38, target: 55, unit: "µg", status: "trungbinh" },
  { id: "ca", name: "Canxi", consumed: 380, target: 1000, unit: "mg", status: "thieu" },
];

export default function MicrosPage() {
  const [activeTab, setActiveTab] = useState<"minerals" | "vitamins">("vitamins");

  const items = activeTab === "vitamins" ? VITAMINS : MINERALS;

  const getStatusColor = (status: MicronutrientItem["status"]) => {
    switch (status) {
      case "dat":
        return "blue";
      case "gandu":
        return "emerald";
      case "trungbinh":
        return "gold";
      case "thieu":
        return "coral";
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24 md:pb-12">
      {/* Black Top Header (Matches Safari _ Vi ch_t _ Vitamin.png) */}
      <div className="bg-[#0A0A0A] text-white rounded-b-3xl md:rounded-3xl p-5 md:p-8 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-neutral-400">
              Hôm nay, 10/10
            </div>
            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mt-0.5">
              VI CHẤT
            </h1>
          </div>
          <div className="text-right">
            <div className="text-3xl md:text-4xl font-black italic tracking-tighter text-white font-mono leading-none">
              8/21
            </div>
            <div className="text-xs font-semibold text-neutral-400 mt-1">
              đã đạt mục tiêu
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 p-1 bg-neutral-900 rounded-2xl flex items-center">
          <button
            onClick={() => setActiveTab("minerals")}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${
              activeTab === "minerals"
                ? "bg-white text-black shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Khoáng chất · 5/9
          </button>
          <button
            onClick={() => setActiveTab("vitamins")}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${
              activeTab === "vitamins"
                ? "bg-white text-black shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Vitamin · 3/12
          </button>
        </div>

        {/* Status Legend */}
        <div className="flex items-center justify-between text-[11px] font-bold mt-4 pt-3 border-t border-neutral-800 text-neutral-400 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#EF4444]" />
            <span>Thiếu (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#EAB308]" />
            <span>Trung bình (50–79%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#10B981]" />
            <span>Gần đủ (80–99%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-400">
            <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
            <span>Đạt (≥100%)</span>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="px-4 md:px-0 mt-4 md:mt-6 space-y-2.5">
        {items.map((item) => {
          const ratio = (item.consumed / item.target) * 100;
          const statusColor = getStatusColor(item.status);

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-neutral-100 shadow-xs hover:border-neutral-200 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-sm text-neutral-900">
                  {item.name}
                </span>

                <div className="flex items-center gap-1.5">
                  {item.status === "dat" && (
                    <span className="text-xs font-black text-[#2563EB] flex items-center gap-0.5">
                      <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
                      Đạt
                    </span>
                  )}
                  <span className="font-mono text-xs font-bold text-neutral-600">
                    {item.consumed.toLocaleString("vi-VN")} / {item.target.toLocaleString("vi-VN")} {item.unit}
                  </span>
                  <ChevronRightIcon className="w-4 h-4 text-neutral-400 ml-1" />
                </div>
              </div>

              <SegmentedBar
                totalSegments={8}
                filledSegments={Math.round((ratio / 100) * 8)}
                color={statusColor}
              />
            </div>
          );
        })}
      </div>

      {/* Mobile Dock */}
      <BottomDock />
    </div>
  );
}
