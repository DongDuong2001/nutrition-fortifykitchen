import React from "react";
import type { LeaderboardRankItem } from "@/lib/leaderboard";
import { IconStar } from "@/components/ui/icons";
import { formatNumber } from "@/lib/format";

export function LeaderboardPodium({ topThree }: { topThree: LeaderboardRankItem[] }) {
  if (topThree.length < 3) return null;

  const [first, second, third] = topThree;

  return (
    <div className="grid grid-cols-3 items-end gap-2 pt-2 pb-1">
      {/* 2nd Place */}
      <div className="flex flex-col items-center gap-2 rounded-[18px] bg-card border border-card-border p-3 shadow-xs">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-level-empty text-xs font-black text-text">
          2
        </span>
        <span className="w-full truncate text-center text-xs font-bold text-text">{second.displayName}</span>
        <span className="font-saira text-[15px] font-black tabular-nums text-blue">{formatNumber(second.totalScore)}</span>
        <span className="text-[11px] font-medium text-secondary">Cấp {second.masteryLevel}</span>
      </div>

      {/* 1st Place */}
      <div className="flex flex-col items-center gap-2 rounded-[18px] bg-card border-2 border-level-yellow p-3.5 shadow-xs -mt-2 bg-warning-bg">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-level-yellow text-card shadow-xs">
          <IconStar size={18} />
        </span>
        <span className="w-full truncate text-center text-sm font-extrabold text-text">{first.displayName}</span>
        <span className="font-saira text-lg font-black tabular-nums text-blue">{formatNumber(first.totalScore)}</span>
        <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-warning-text border border-level-yellow/40">
          Cấp {first.masteryLevel}
        </span>
      </div>

      {/* 3rd Place */}
      <div className="flex flex-col items-center gap-2 rounded-[18px] bg-card border border-card-border p-3 shadow-xs">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-level-empty text-xs font-black text-secondary">
          3
        </span>
        <span className="w-full truncate text-center text-xs font-bold text-text">{third.displayName}</span>
        <span className="font-saira text-[15px] font-black tabular-nums text-blue">{formatNumber(third.totalScore)}</span>
        <span className="text-[11px] font-medium text-secondary">Cấp {third.masteryLevel}</span>
      </div>
    </div>
  );
}

