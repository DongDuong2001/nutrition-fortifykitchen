import React from "react";
import type { LeaderboardRankItem } from "@/lib/leaderboard";
import { IconStar } from "@/components/ui/icons";

export function LeaderboardPodium({ topThree }: { topThree: LeaderboardRankItem[] }) {
  if (topThree.length < 3) return null;

  const [first, second, third] = topThree;

  return (
    <div className="grid grid-cols-3 items-end gap-2 pt-2 pb-1">
      {/* 2nd Place */}
      <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-card border border-card-border p-3 shadow-xs">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700">
          2
        </span>
        <span className="w-full truncate text-center text-xs font-bold text-text">{second.displayName}</span>
        <span className="text-[13px] font-black text-blue">{second.totalScore}</span>
        <span className="text-[10px] font-medium text-secondary">Cấp {second.masteryLevel}</span>
      </div>

      {/* 1st Place */}
      <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-card border-2 border-amber-400 p-3.5 shadow-sm -mt-2 bg-gradient-to-b from-amber-50/40 to-card">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-xs">
          <IconStar size={18} />
        </span>
        <span className="w-full truncate text-center text-sm font-extrabold text-text">{first.displayName}</span>
        <span className="text-base font-black text-blue">{first.totalScore}</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
          Cấp {first.masteryLevel}
        </span>
      </div>

      {/* 3rd Place */}
      <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-card border border-card-border p-3 shadow-xs">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-700/20 text-xs font-black text-amber-800">
          3
        </span>
        <span className="w-full truncate text-center text-xs font-bold text-text">{third.displayName}</span>
        <span className="text-[13px] font-black text-blue">{third.totalScore}</span>
        <span className="text-[10px] font-medium text-secondary">Cấp {third.masteryLevel}</span>
      </div>
    </div>
  );
}
