import React from "react";
import type { LeaderboardRankItem } from "@/lib/leaderboard";
import { formatNumber } from "@/lib/format";

/** One place of the ranking: the display name and the discipline score, nothing else (the opt-in promise). */
export function LeaderboardRow({
  item,
  isHighlight = false,
}: {
  item: LeaderboardRankItem;
  isHighlight?: boolean;
}) {
  return (
    <li
      data-align-group="leaderboard-row"
      className={`flex min-h-14 list-none items-center justify-between gap-3 rounded-[18px] bg-card px-4 py-2 ${
        isHighlight ? "border-2 border-blue" : "border border-card-border"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-[13px] font-bold tabular-nums text-secondary"
        >
          {item.rank}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <span title={item.displayName} className="line-clamp-2 break-words text-[15px] font-bold leading-snug text-text">
              <span className="sr-only">Hạng {item.rank}: </span>
              {item.displayName}
            </span>
            {item.isCurrentUser && (
              <span className="shrink-0 rounded-full bg-blue px-2 py-0.5 text-[11px] font-bold text-on-accent">Bạn</span>
            )}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className="block font-display text-2xl font-extrabold italic leading-none tabular-nums text-blue">
          {formatNumber(item.totalScore)}
        </span>
        <span className="block text-[13px] text-secondary">điểm</span>
      </div>
    </li>
  );
}
