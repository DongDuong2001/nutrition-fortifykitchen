export type LeaderboardPeriod = "weekly" | "monthly";

export interface LeaderboardRankItem {
  rank: number;
  userId: string;
  displayName: string;
  daysLogged: number;
  microsCompletionPct: number;
  totalScore: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  periodLabel: string;
  cycleEndDate: string;
  ranks: LeaderboardRankItem[];
  currentUserRank?: LeaderboardRankItem | null;
  optedIn: boolean;
}

import { accountStorage } from "./storage-keys";

/**
 * The ranks as the screen draws them: the podium takes the first three when there are three or more, and the rest go
 * in rows. With one or two ranks there is no podium, so every rank is a row (nothing is left to draw a blank screen).
 */
export function splitRanks<T>(ranks: readonly T[]): { podium: T[]; rows: T[] } {
  return ranks.length >= 3 ? { podium: ranks.slice(0, 3), rows: ranks.slice(3) } : { podium: [], rows: [...ranks] };
}

export const LEADERBOARD_STORAGE_KEY = "h1t_leaderboard_opt_in";

let memoryOptIn: boolean | null = null;

export function isLeaderboardOptedIn(): boolean {
  if (memoryOptIn !== null) return memoryOptIn;
  try {
    const acc = accountStorage();
    if (acc) {
      const val = acc.getItem(LEADERBOARD_STORAGE_KEY);
      if (val !== null) return val === "true";
    }
    const storage = typeof window !== "undefined" ? window.localStorage : globalThis.localStorage;
    return storage?.getItem(LEADERBOARD_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setLeaderboardOptIn(optIn: boolean): void {
  memoryOptIn = optIn;
  try {
    const acc = accountStorage();
    if (acc) {
      acc.setItem(LEADERBOARD_STORAGE_KEY, optIn ? "true" : "false");
      return;
    }
    const storage = typeof window !== "undefined" ? window.localStorage : globalThis.localStorage;
    storage?.setItem(LEADERBOARD_STORAGE_KEY, optIn ? "true" : "false");
  } catch {
    // Storage unavailable
  }
}

export function calculateDisciplineScore(daysLogged: number, avgMicrosPct: number, targetHitDays: number): number {
  const days = Math.max(0, daysLogged);
  const microsPct = Math.max(0, Math.min(100, avgMicrosPct));
  const hits = Math.max(0, targetHitDays);

  const raw = days * 20 + microsPct * 0.6 + hits * 15;
  return Math.min(1000, Math.round(raw));
}

// Sample ranking of mock and demo mode only (live mode shows none). Neutral names: no real-looking people.
const MOCK_COMMUNITY_USERS: Array<{ id: string; name: string; days: number; micros: number; hits: number }> = [
  { id: "u-1", name: "Học viên A", days: 7, micros: 95.4, hits: 7 },
  { id: "u-2", name: "Học viên B", days: 7, micros: 91.2, hits: 6 },
  { id: "u-3", name: "Học viên C", days: 6, micros: 88.5, hits: 6 },
  { id: "u-4", name: "Học viên D", days: 6, micros: 82.0, hits: 5 },
  { id: "u-5", name: "Học viên E", days: 5, micros: 79.4, hits: 4 },
  { id: "u-6", name: "Học viên F", days: 5, micros: 75.2, hits: 4 },
  { id: "u-7", name: "Học viên G", days: 4, micros: 71.0, hits: 3 },
  { id: "u-8", name: "Học viên H", days: 4, micros: 68.5, hits: 3 },
  { id: "u-9", name: "Học viên I", days: 3, micros: 64.0, hits: 2 },
  { id: "u-10", name: "Học viên K", days: 3, micros: 58.2, hits: 2 },
];

export function getMockLeaderboard(period: LeaderboardPeriod, currentUserId = "user-me"): LeaderboardResponse {
  const optedIn = isLeaderboardOptedIn();
  const mult = period === "monthly" ? 4 : 1;

  const ranks: LeaderboardRankItem[] = MOCK_COMMUNITY_USERS.map((u, idx) => {
    const days = Math.min(period === "monthly" ? 30 : 7, u.days * mult);
    const hits = Math.min(days, u.hits * mult);
    const score = calculateDisciplineScore(days, u.micros, hits);

    return {
      rank: idx + 1,
      userId: u.id,
      displayName: u.name,
      daysLogged: days,
      microsCompletionPct: u.micros,
      totalScore: score,
      isCurrentUser: false,
    };
  });

  // Current user entry
  const myDays = period === "monthly" ? 22 : 6;
  const myHits = period === "monthly" ? 18 : 5;
  const myMicros = 84.5;
  const myScore = calculateDisciplineScore(myDays, myMicros, myHits);

  let currentUserRank: LeaderboardRankItem | null = null;
  if (optedIn) {
    currentUserRank = {
      rank: 5,
      userId: currentUserId,
      displayName: "Bạn",
      daysLogged: myDays,
      microsCompletionPct: myMicros,
      totalScore: myScore,
      isCurrentUser: true,
    };
  }

  const periodLabel = period === "weekly" ? "Tuần này (T2 – CN)" : "Tháng này";
  const cycleEndDate = period === "weekly" ? "Chủ Nhật, 23:59" : "Cuối tháng, 23:59";

  return {
    period,
    periodLabel,
    cycleEndDate,
    ranks,
    currentUserRank,
    optedIn,
  };
}
