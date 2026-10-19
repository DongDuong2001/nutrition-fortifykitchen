import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LeaderboardRow } from "@/components/leaderboard/leaderboard-row";

const item = (rank: number) => ({ userId: "u", rank, displayName: "Mai", daysLogged: 5, microsCompletionPct: 70, totalScore: 800, isCurrentUser: false });

describe("LeaderboardRow rank badge (cc-63, B9)", () => {
  it("grows with a 5-digit rank instead of overflowing a fixed circle, and groups the thousands", () => {
    const html = renderToStaticMarkup(<LeaderboardRow item={item(12345)} />);
    expect(html).toContain("min-w-8");
    expect(html).toContain("px-2");
    expect(html).not.toMatch(/ w-8 /);
    expect(html).toContain(">12.345<");
  });
});
