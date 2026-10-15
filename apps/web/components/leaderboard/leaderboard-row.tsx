import React from "react";
import type { LeaderboardRankItem } from "@/lib/leaderboard";
import { formatNumber } from "@/lib/format";

export function LeaderboardRow({
  item,
  isHighlight = false,
}: {
  item: LeaderboardRankItem;
  isHighlight?: boolean;
}) {
  return (
    <div
      data-align-group="leaderboard-row"
      className={`flex min-h-[48px] items-center justify-between gap-3 rounded-[18px] px-3.5 py-2.5 transition-colors ${
        isHighlight
          ? "bg-blue/10 border-2 border-blue font-semibold text-text"
          : "bg-card border border-card-border/70 hover:bg-page"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-xs font-bold text-secondary border border-card-border">
          {item.rank}
        </span>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-bold text-text">{item.displayName}</span>
            {item.isCurrentUser && (
              <span className="rounded-full bg-blue px-2 py-0.5 text-[11px] font-bold text-on-accent">
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
        <span className="font-saira text-base font-black tabular-nums text-blue">{formatNumber(item.totalScore)}</span>
        <span className="block text-[11px] text-secondary font-medium">điểm</span>
      </div>
    </div>
  );
}

