"use client";

import { markUsed } from "@/lib/onboarding-store";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { SectionTitle } from "@/components/ui/section-title";
import { Switch } from "@/components/ui/switch";
import { LeaderboardPodium } from "@/components/leaderboard/leaderboard-podium";
import { LeaderboardRow } from "@/components/leaderboard/leaderboard-row";
import { useBack } from "@/hooks/use-back";
import {
  type LeaderboardPeriod,
  getMockLeaderboard,
  isLeaderboardOptedIn,
  setLeaderboardOptIn,
  splitRanks,
} from "@/lib/leaderboard";
import { LevelBadge } from "@/components/profile/level-badge";
import { useCoaching } from "@/hooks/use-coaching";
import { levelSourceText } from "@/lib/level-copy";

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "weekly", label: "Tuần này" },
  { id: "monthly", label: "Tháng này" },
];

/** Bảng xếp hạng: a pushed screen under Khám phá. Shows display names and the discipline score only. */
export default function LeaderboardPage() {
  const goBack = useBack();
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  // Read after mount so the server and the first client render agree (the opt-in lives in localStorage)
  const [optedIn, setOptedIn] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOptedIn(isLeaderboardOptedIn());
    setHydrated(true);
  }, []);

  const data = getMockLeaderboard(period);
  // Level is the coach-set Level (0 with no coach); the earned Cấp is gone from the UI
  const { level, coach, available } = useCoaching();
  const { podium: topThree, rows: rest } = splitRanks(data.ranks);

  const handleToggleOptIn = (checked: boolean) => {
    markUsed("leaderboard-optin");
    setLeaderboardOptIn(checked);
    setOptedIn(checked);
  };

  return (
    <AppShell alignContainer="leaderboard-page">
      <AppHeader
        variant="sub"
        title="Bảng xếp hạng"
        subtitle="Vinh danh kỷ luật dinh dưỡng và hoàn thành vi chất"
        onBack={goBack}
        layout="wide"
        alignGroup="leaderboard-header"
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8">
        <ChipGroup
          columns={2}
          data-align-group="leaderboard-period"
          items={PERIODS.map((p) => ({
            id: p.id,
            label: p.label,
            active: p.id === period,
            onClick: () => setPeriod(p.id),
          }))}
        />

        <Card as="section" aria-labelledby="lb-optin" className="flex flex-col gap-2">
          <div data-tour="leaderboard-join" className="flex min-h-11 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <SectionTitle as="h2" id="lb-optin">
                Tham gia Bảng xếp hạng
              </SectionTitle>
              <span aria-live="polite" className="text-cap leading-snug text-secondary">
                {!hydrated ? "Đang tải" : optedIn ? "Đang công khai tên hiển thị" : "Đang ở chế độ ẩn danh"}
              </span>
            </div>
            <Switch
              checked={optedIn}
              onCheckedChange={handleToggleOptIn}
              disabled={!hydrated}
              aria-label="Tham gia Bảng xếp hạng"
            />
          </div>
          <p className="m-0 border-t border-divider pt-2 text-cap leading-snug text-secondary">
            Chỉ hiển thị tên hiển thị và điểm kỷ luật vi chất. Nhật ký ăn uống cá nhân luôn được giữ riêng tư.
          </p>
        </Card>

        <section aria-labelledby="lb-level" className="flex flex-col gap-2">
          <SectionTitle as="h2" id="lb-level">
            Level của bạn
          </SectionTitle>
          <Card className="flex items-center justify-between gap-3">
            <p className="m-0 min-w-0 text-callout leading-snug text-text">
              {coach ? `${coach.name} · ${levelSourceText(level)}` : "Chưa có huấn luyện viên"}
            </p>
            <LevelBadge level={level} />
          </Card>
          {available && !coach && (
            <Link href="/settings/coach" className="inline-flex min-h-11 items-center px-1 text-callout font-bold text-cobalt no-underline">
              Nhập mã huấn luyện viên
            </Link>
          )}
        </section>

        {optedIn && data.currentUserRank && (
          <section aria-labelledby="lb-me" className="flex flex-col gap-2">
            <SectionTitle as="h2" id="lb-me">
              Vị trí của bạn
            </SectionTitle>
            <ul role="list" className="m-0 flex list-none flex-col gap-2 p-0">
              <LeaderboardRow item={data.currentUserRank} isHighlight />
            </ul>
          </section>
        )}

        {data.ranks.length === 0 ? (
          <Card as="section" aria-label="Bảng xếp hạng trống" className="text-cap leading-snug text-secondary">
            Kỳ này chưa có ai trong bảng. Hãy quay lại sau khi có người ghi nhật ký.
          </Card>
        ) : (
          <>
            {topThree.length > 0 && (
              <section aria-labelledby="lb-top" className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <SectionTitle as="h2" id="lb-top">
                    Ba người đứng đầu
                  </SectionTitle>
                  <span className="text-cap text-secondary">Chốt kỳ: {data.cycleEndDate}</span>
                </div>
                <LeaderboardPodium topThree={topThree} />
              </section>
            )}

            {rest.length > 0 && (
              <section aria-labelledby="lb-rest" className="flex flex-col gap-2">
                <SectionTitle as="h2" id="lb-rest">
                  Bảng tổng sắp
                </SectionTitle>
                <ul role="list" className="m-0 flex list-none flex-col gap-2 p-0">
                  {rest.map((r) => (
                    <LeaderboardRow key={r.userId} item={r} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
