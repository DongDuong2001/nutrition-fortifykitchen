import React from "react";
import type { LeaderboardRankItem } from "@/lib/leaderboard";
import { formatNumber } from "@/lib/format";
import { IconStar } from "@/components/ui/icons";

// Medal colours come from the existing tokens: gold = level-yellow, silver = the neutral track, bronze = the warm warning pair.
const MEDAL = {
  1: "bg-level-yellow text-on-accent",
  2: "bg-level-empty text-secondary",
  3: "bg-warning-bg text-warning-text",
} as const;

function PodiumPlace({ item, place }: { item: LeaderboardRankItem; place: 1 | 2 | 3 }) {
  const first = place === 1;
  return (
    <li
      className={`flex min-w-0 flex-col items-center gap-2 rounded-[18px] bg-card p-3 text-center ${
        first ? "border-2 border-level-yellow" : "border border-card-border"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-11 w-11 items-center justify-center rounded-full font-display text-xl font-extrabold ${MEDAL[place]}`}
      >
        {first ? <IconStar /> : place}
      </span>
      <span className="sr-only">Hạng {place}</span>
      <span
        title={item.displayName}
        className="line-clamp-2 w-full break-words text-[15px] font-bold leading-snug text-text"
      >
        {item.displayName}
      </span>
      <span className="font-display text-[28px] font-extrabold italic leading-none tabular-nums text-blue">
        {formatNumber(item.totalScore)}
      </span>
      <span className="text-[13px] text-secondary">điểm</span>
    </li>
  );
}

/** The three best of the period, side by side (second, first, third). */
export function LeaderboardPodium({ topThree }: { topThree: LeaderboardRankItem[] }) {
  if (topThree.length < 3) return null;
  const [first, second, third] = topThree;
  return (
    <ol role="list" aria-label="Ba người đứng đầu" className="m-0 grid list-none grid-cols-3 items-end gap-2 p-0">
      <PodiumPlace item={second} place={2} />
      <PodiumPlace item={first} place={1} />
      <PodiumPlace item={third} place={3} />
    </ol>
  );
}
