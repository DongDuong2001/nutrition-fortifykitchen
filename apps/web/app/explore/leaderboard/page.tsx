"use client";

import React, { useState } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { LeaderboardPodium } from "@/components/leaderboard/leaderboard-podium";
import { LeaderboardRow } from "@/components/leaderboard/leaderboard-row";
import {
  type LeaderboardPeriod,
  getMockLeaderboard,
  isLeaderboardOptedIn,
  setLeaderboardOptIn,
} from "@/lib/leaderboard";
import { MasteryBadge } from "@/components/profile/mastery-badge";
import { getMasteryLevel } from "@/lib/mastery-levels";
import { SectionTitle } from "@/components/ui/section-title";

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [optedIn, setOptedIn] = useState<boolean>(() => isLeaderboardOptedIn());

  const data = getMockLeaderboard(period);
  const userMastery = getMasteryLevel(12, 85);
  const topThree = data.ranks.slice(0, 3);
  const rest = data.ranks.slice(3);

  const handleToggleOptIn = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setLeaderboardOptIn(checked);
    setOptedIn(checked);
  };

  return (
    <AppShell alignContainer="leaderboard-page">
      <AppHeader
        variant="sub"
        title="Bảng xếp hạng"
        subtitle="Vinh danh kỷ luật dinh dưỡng & hoàn thành vi chất"
        backHref="/explore"
        layout="wide"
        alignGroup="leaderboard-header"
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-12 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8">
        {/* Period Switcher */}
        <div className="flex rounded-full bg-page p-1 border border-card-border" role="group" aria-label="Kỳ bảng xếp hạng">
          <button
            type="button"
            onClick={() => setPeriod("weekly")}
            className={`flex-1 min-h-[44px] h-11 rounded-full text-xs font-bold transition-colors cursor-pointer border-0 ${
              period === "weekly" ? "bg-card text-blue shadow-xs" : "bg-transparent text-secondary hover:text-text"
            }`}
          >
            Tuần này
          </button>
          <button
            type="button"
            onClick={() => setPeriod("monthly")}
            className={`flex-1 min-h-[44px] h-11 rounded-full text-xs font-bold transition-colors cursor-pointer border-0 ${
              period === "monthly" ? "bg-card text-blue shadow-xs" : "bg-transparent text-secondary hover:text-text"
            }`}
          >
            Tháng này
          </button>
        </div>

        {/* Privacy & Opt-in Settings Card */}
        <Card as="section" className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="m-0 text-sm font-bold text-text">Tham gia Bảng xếp hạng</h2>
              <span className="text-xs text-secondary">
                {optedIn ? "Đang công khai tên hiển thị" : "Đang ở chế độ ẩn danh"}
              </span>
            </div>
            <label className="relative inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                checked={optedIn}
                onChange={handleToggleOptIn}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-page border border-card-border peer-checked:bg-blue peer-focus:outline-none transition-colors after:absolute after:top-[12px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          <p className="m-0 text-[11px] text-secondary leading-relaxed pt-1 border-t border-card-border/60">
            Chỉ hiển thị Tên hiển thị và Điểm kỷ luật vi chất. Nhật ký ăn uống cá nhân luôn được bảo mật tuyệt đối.
          </p>
        </Card>

        {/* User Mastery Level */}
        <div className="flex flex-col gap-2">
          <SectionTitle>Cấp độ vi chất của bạn</SectionTitle>
          <MasteryBadge info={userMastery} />
        </div>

        {/* User Rank Card if opted in */}
        {optedIn && data.currentUserRank && (
          <div className="flex flex-col gap-2">
            <SectionTitle>Vị trí của bạn</SectionTitle>
            <LeaderboardRow item={data.currentUserRank} isHighlight={true} />
          </div>
        )}

        {/* Podium for Top 3 */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-baseline justify-between px-1">
            <SectionTitle>Top đầu kỳ này</SectionTitle>
            <span className="text-[13px] font-medium text-secondary">{data.cycleEndDate}</span>
          </div>
          <LeaderboardPodium topThree={topThree} />
        </div>

        {/* Remaining Ranks */}
        <div className="flex flex-col gap-2 pt-2">
          <SectionTitle>Bảng tổng sắp</SectionTitle>
          <div className="flex flex-col gap-2">
            {rest.map((r) => (
              <LeaderboardRow key={r.userId} item={r} />
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}

