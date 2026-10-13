"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isNewUser, readFirstRunFacts, setupSummary, summaryAddHref, type SetupSummary as Summary } from "@/lib/first-run";
import { loadProfile } from "@/lib/profile";
import { AppHeader } from "@/components/ui/app-header";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";

interface Ready {
  summary: Summary;
  /** The add sheet for the meal of the clock while nothing is logged, otherwise the overview. */
  href: string;
  label: string;
}

const TITLE = "Hồ sơ đã lưu";

/** Last step of setup: the daily targets as facts, then one button to the first meal. */
export function SetupSummary() {
  const [ready, setReady] = useState<Ready | null>(null);

  // Profile and clock are client-only: nothing renders from them before mount (no hydration mismatch).
  useEffect(() => {
    const now = new Date();
    const first = isNewUser(readFirstRunFacts());
    setReady({
      summary: setupSummary(loadProfile(now.getFullYear())),
      href: first ? summaryAddHref(now) : "/",
      label: first ? "Bắt đầu ghi bữa đầu tiên" : "Xem tổng quan",
    });
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-page lg:items-center lg:px-4 lg:py-8">
      <div className="lg:hidden">
        <AppHeader variant="sub" title={TITLE} progress={{ current: 2, total: 2 }} />
      </div>

      <main className="flex flex-1 flex-col gap-6 px-4 py-5 lg:w-full lg:max-w-[760px] lg:flex-none lg:rounded-[20px] lg:border lg:border-card-border lg:bg-card lg:p-8">
        <h1 className="m-0 hidden font-display text-[32px] font-black italic uppercase lg:block">{TITLE}</h1>

        {ready === null ? (
          <div aria-busy="true" className="h-[96px] rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none" />
        ) : (
          <Card className="flex flex-col gap-2">
            <p className="m-0 text-[15px] font-bold">
              Mục tiêu mỗi ngày: <span className="tabular-nums">{ready.summary.energy}</span> ·{" "}
              <span className="whitespace-nowrap">
                đạm <span className="tabular-nums">{ready.summary.protein}</span>
              </span>
            </p>
            <p className="m-0 text-[13px] text-secondary">Bạn có thể sửa bất cứ lúc nào trong Cài đặt.</p>
          </Card>
        )}

        <div className="mt-auto flex flex-col gap-2 lg:mt-0">
          <PillButton href={ready?.href ?? "/"} disabled={ready === null}>
            {ready?.label ?? "Bắt đầu ghi bữa đầu tiên"}
          </PillButton>
          {ready?.href !== "/" && (
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center px-2 text-[15px] font-semibold text-blue no-underline"
            >
              Để sau
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
