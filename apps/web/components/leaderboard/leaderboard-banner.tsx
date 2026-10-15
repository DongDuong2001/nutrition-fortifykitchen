import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { IconRibbon, IconChevronRight } from "@/components/ui/icons";

export function LeaderboardBanner() {
  return (
    <Card as="section" className="flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-blue/5 via-card to-card border border-blue/20">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue text-on-accent shadow-xs">
          <IconRibbon size={20} />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-text leading-tight">Bảng xếp hạng kỷ luật</span>
          <span className="text-xs text-secondary leading-snug">
            Vinh danh người dùng duy trì vi chất & mục tiêu cao nhất
          </span>
        </div>
      </div>

      <Link
        href="/explore/leaderboard"
        className="shrink-0 flex min-h-[44px] min-w-[44px] items-center gap-1 justify-center rounded-full bg-blue px-4 text-xs font-bold text-on-accent no-underline shadow-xs hover:bg-blue/90 transition-transform duration-150 active:scale-[0.97]"
      >
        <span>Xem BXH</span>
        <IconChevronRight size={16} />
      </Link>
    </Card>

  );
}
