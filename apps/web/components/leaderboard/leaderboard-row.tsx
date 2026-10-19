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
      className={`flex min-h-14 list-none items-center justify-between gap-3 rounded-card bg-card px-4 py-2 ${
        isHighlight ? "border-2 border-cobalt" : "border border-card-border"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-surface px-2 text-cap font-bold tabular-nums text-secondary"
        >
          {formatNumber(item.rank)}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <span title={item.displayName} className="line-clamp-2 break-words text-callout font-bold leading-snug text-text">
              <span className="sr-only">Hạng {item.rank}: </span>
              {item.displayName}
            </span>
            {item.isCurrentUser && (
              <span className="shrink-0 rounded-full bg-cobalt px-2 py-0.5 text-micro font-bold text-on-accent">Bạn</span>
            )}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className="block font-display text-2xl font-extrabold italic leading-none tabular-nums text-cobalt">
          {formatNumber(item.totalScore)}
        </span>
        <span className="block text-cap text-secondary">điểm</span>
      </div>
    </li>
  );
}
