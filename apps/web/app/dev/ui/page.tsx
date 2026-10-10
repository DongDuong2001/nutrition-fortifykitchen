"use client";

import React, { useState } from "react";
import { Header } from "@/components/ui/header";
import { BottomNav } from "@/components/ui/bottom-nav";
import { SegmentedBar } from "@/components/ui/segmented-bar";
import { PillButton } from "@/components/ui/pill-button";
import { Chip } from "@/components/ui/chip";
import { Card } from "@/components/ui/card";
import { Row } from "@/components/ui/row";
import { Switch } from "@/components/ui/switch";
import { Sheet } from "@/components/ui/sheet";
import { Toast } from "@/components/ui/toast";

export default function DevUiPage() {
  const [switch1, setSwitch1] = useState(true);
  const [switch2, setSwitch2] = useState(false);
  const [selectedChip, setSelectedChip] = useState("all");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetInput, setSheetInput] = useState("");

  return (
    <div className="w-full max-w-[390px] min-h-[844px] mx-auto bg-page text-text flex flex-col relative font-sans pb-24">
      {/* 1. Header (Brand with Date Switcher) */}
      <Header
        showLogo
        dateText="Hôm nay, 10/10"
        onPrevDate={() => {}}
        onNextDate={() => {}}
      />

      <div className="flex-1 p-4 flex flex-col gap-6">
        {/* Section: Sub-screen Header Preview */}
        <section className="flex flex-col gap-2">
          <div className="text-xs font-bold text-secondary uppercase tracking-wider">
            Header phụ (Sub-screen Header)
          </div>
          <Header
            title="VỀ BẠN"
            subtitle="Mục tiêu được tính theo cân nặng và giới tính."
            backHref="/today"
            stepText="Bước 1 / 2"
            stepProgress={{ current: 1, total: 2 }}
          />
        </section>

        {/* Section: SegmentedBar */}
        <section className="flex flex-col gap-3">
          <div className="text-xs font-bold text-secondary uppercase tracking-wider">
            SegmentedBar (10 vạch — 4 cấp độ)
          </div>

          <Card className="flex flex-col gap-3">
            <div className="text-xs font-semibold text-secondary">
              Nền sáng (Light tone):
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span>Thiếu (&lt;50%): Canxi 28%</span>
                <span className="font-semibold text-level-red">28%</span>
              </div>
              <SegmentedBar aria-label="Tiến độ Canxi 28%" percentage={28} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span>Trung bình (50–79%): Béo 64%</span>
                <span className="font-semibold text-level-yellow">64%</span>
              </div>
              <SegmentedBar aria-label="Tiến độ Béo 64%" percentage={64} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span>Gần đủ (80–99%): Đồng 89%</span>
                <span className="font-semibold text-level-green">89%</span>
              </div>
              <SegmentedBar aria-label="Tiến độ Đồng 89%" percentage={89} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span>Đạt (≥100%): Natri 100%</span>
                <span className="font-semibold text-blue">100%</span>
              </div>
              <SegmentedBar aria-label="Tiến độ Natri 100%" percentage={100} />
            </div>
          </Card>

          {/* Dark Header SegmentedBar */}
          <div className="bg-ink p-4 rounded-[18px] text-white flex flex-col gap-3">
            <div className="text-xs font-semibold text-sky">
              Nền tối (Dark tone trong Header):
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span>Đạm 60%</span>
                <span className="text-grabber tabular-nums">62 / 104 g</span>
              </div>
              <SegmentedBar aria-label="Tiến độ Đạm 60%" percentage={60} tone="dark" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span>Chất xơ 47%</span>
                <span className="text-grabber tabular-nums">14 / 30 g</span>
              </div>
              <SegmentedBar aria-label="Tiến độ Chất xơ 47%" percentage={47} tone="dark" />
            </div>
          </div>
        </section>

        {/* Section: PillButtons (52px) */}
        <section className="flex flex-col gap-2.5">
          <div className="text-xs font-bold text-secondary uppercase tracking-wider">
            PillButton (52px CTA)
          </div>
          <PillButton variant="primary">Tiếp tục (Primary)</PillButton>
          <PillButton variant="secondary">Chép hôm qua (Secondary)</PillButton>
          <PillButton variant="destructive">Xoá món (Destructive)</PillButton>
        </section>

        {/* Section: Chips (44px) */}
        <section className="flex flex-col gap-2">
          <div className="text-xs font-bold text-secondary uppercase tracking-wider">
            Chip (44px tap targets)
          </div>
          <div className="flex gap-2 flex-wrap">
            <Chip
              selected={selectedChip === "all"}
              onClick={() => setSelectedChip("all")}
            >
              Tất cả
            </Chip>
            <Chip
              selected={selectedChip === "recent"}
              onClick={() => setSelectedChip("recent")}
            >
              Gần đây
            </Chip>
            <Chip
              selected={selectedChip === "fav"}
              onClick={() => setSelectedChip("fav")}
            >
              Ưa thích
            </Chip>
          </div>
        </section>

        {/* Section: Row & Card & Switch */}
        <section className="flex flex-col gap-2">
          <div className="text-xs font-bold text-secondary uppercase tracking-wider">
            Card, Row & Switch
          </div>
          <Card className="p-2 px-4">
            <Row
              label="Cân nặng"
              value="65 kg"
              withBorderTop={false}
              href="/profile/weight"
            />
            <Row
              label="Mục tiêu"
              value="Giữ cân"
              href="/profile/goal"
            />
            <div className="flex items-center justify-between min-h-[52px] border-t border-divider py-1">
              <div className="flex flex-col">
                <span className="text-[15px] font-normal">Gần/trong kỳ</span>
                <span className="text-[13px] text-secondary">
                  Tăng mục tiêu sắt lên 28 mg
                </span>
              </div>
              <Switch
                checked={switch1}
                onCheckedChange={setSwitch1}
                aria-label="Gần hoặc trong kỳ"
              />
            </div>
            <div className="flex items-center justify-between min-h-[52px] border-t border-divider py-1">
              <div className="flex flex-col">
                <span className="text-[15px] font-normal">Nhắc nhở bữa ăn</span>
              </div>
              <Switch
                checked={switch2}
                onCheckedChange={setSwitch2}
                aria-label="Nhắc nhở bữa ăn"
              />
            </div>
          </Card>
        </section>

        {/* Section: Sheet Trigger */}
        <section className="flex flex-col gap-2">
          <div className="text-xs font-bold text-secondary uppercase tracking-wider">
            Sheet (Bottom Sheet dialog)
          </div>
          <PillButton variant="secondary" onClick={() => setIsSheetOpen(true)}>
            Mở Sheet Demo
          </PillButton>
          <Sheet
            open={isSheetOpen}
            onClose={() => setIsSheetOpen(false)}
            title="Chép bữa hôm qua?"
            description="Thứ Sáu 09/10 · 1.980 kcal"
          >
            <div className="flex flex-col gap-3 py-2">
              <label className="text-xs font-semibold text-text flex flex-col gap-1">
                Kiểm tra gõ phím không mất focus:
                <input
                  type="text"
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                  placeholder="Gõ thử vào đây..."
                  className="h-10 px-3 rounded-lg border border-divider bg-page text-sm outline-none focus-visible:outline-2 focus-visible:outline-blue"
                />
              </label>
              <div className="text-sm text-secondary">
                Món đã có hôm nay sẽ không bị ghi đè.
              </div>
              <PillButton
                variant="primary"
                onClick={() => setIsSheetOpen(false)}
              >
                Chép 3 bữa
              </PillButton>
              <PillButton
                variant="secondary"
                onClick={() => setIsSheetOpen(false)}
              >
                Huỷ
              </PillButton>
            </div>
          </Sheet>
        </section>

        {/* Section: Toasts */}
        <section className="flex flex-col gap-3">
          <div className="text-xs font-bold text-secondary uppercase tracking-wider">
            Toast (role="status")
          </div>
          <Toast
            message="Đã thêm Chà là 30 g vào Trước tập"
            actionLabel="Xem"
            actionHref="/today"
          />
          <Toast
            message="Đã xoá Thịt bò nạc"
            actionLabel="Hoàn tác"
            onAction={() => {}}
            progressPercent={60}
          />
        </section>
      </div>

      {/* BottomNav */}
      <div className="sticky bottom-0 left-0 right-0 z-40 bg-ink">
        <BottomNav currentTab="today" />
      </div>
    </div>
  );
}
