import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { IconRibbon } from "@/components/ui/icons";

/** Khám phá: the way into the leaderboard. One card, one link (the button), the text wraps. */
export function LeaderboardBanner() {
  return (
    <Card as="section" aria-labelledby="explore-leaderboard" className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue text-on-accent"
      >
        <IconRibbon />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <SectionTitle as="h2" id="explore-leaderboard">
          Bảng xếp hạng kỷ luật
        </SectionTitle>
        <p className="m-0 text-[13px] leading-snug text-secondary">
          Vinh danh người dùng duy trì vi chất và mục tiêu cao nhất
        </p>
      </div>
      <Link
        href="/explore/leaderboard"
        className="flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-blue px-4 text-[13px] font-bold text-on-accent no-underline hover:text-on-accent active:scale-[0.97] transition-press motion-reduce:active:scale-100"
      >
        Xem bảng
      </Link>
    </Card>
  );
}
