import React from "react";
import type { LeaderboardRankItem } from "@/lib/leaderboard";

export function LeaderboardRow({
  item,
  isHighlight = false,
}: {
  item: LeaderboardRankItem;
  isHighlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${
        isHighlight
          ? "bg-blue/10 border-2 border-blue font-semibold text-text"
          : "bg-card border border-card-border/70 hover:bg-page"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-page text-xs font-bold text-secondary">
          {item.rank}
        </span>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-bold text-text">{item.displayName}</span>
            {item.isCurrentUser && (
              <span className="rounded-full bg-blue px-1.5 py-0.2 text-[9px] font-bold text-on-accent">
                Bạn
              </span>
            )}
          </div>
          <span className="text-[11px] text-secondary">
            Cấp {item.masteryLevel} · {item.daysLogged} ngày ghi · {Math.round(item.microsCompletionPct)}% vi chất
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <span className="text-sm font-black text-blue">{item.totalScore}</span>
        <span className="block text-[10px] text-secondary font-medium">điểm</span>
      </div>
    </div>
  );
}
