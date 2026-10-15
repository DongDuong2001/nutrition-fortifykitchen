import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export function LeaderboardBanner() {
  return (
    <Card as="section" className="flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-blue/5 via-card to-card border border-blue/20">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue text-xs font-black text-on-accent shadow-xs">
          Top
        </span>
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-bold text-text">Bảng xếp hạng kỷ luật</span>
          <span className="truncate text-xs text-secondary">
            Vinh danh người dùng duy trì vi chất & mục tiêu cao nhất
          </span>
        </div>
      </div>

      <Link
        href="/explore/leaderboard"
        className="shrink-0 flex h-9 items-center justify-center rounded-full bg-blue px-3.5 text-xs font-bold text-on-accent no-underline shadow-xs hover:bg-blue/90 transition-colors"
      >
        Xem BXH &rsaquo;
      </Link>
    </Card>
  );
}
