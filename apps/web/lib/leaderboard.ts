export type LeaderboardPeriod = "weekly" | "monthly";

export interface LeaderboardRankItem {
  rank: number;
  userId: string;
  displayName: string;
  masteryLevel: number;
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

export const LEADERBOARD_STORAGE_KEY = "h1t_leaderboard_opt_in";

let memoryOptIn: boolean | null = null;

export function isLeaderboardOptedIn(): boolean {
  if (memoryOptIn !== null) return memoryOptIn;
  try {
    const storage = typeof window !== "undefined" ? window.localStorage : globalThis.localStorage;
    return storage?.getItem(LEADERBOARD_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setLeaderboardOptIn(optIn: boolean): void {
  memoryOptIn = optIn;
  try {
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

const MOCK_COMMUNITY_USERS: Array<{ id: string; name: string; level: number; days: number; micros: number; hits: number }> = [
  { id: "u-1", name: "Minh Quân", level: 5, days: 7, micros: 95.4, hits: 7 },
  { id: "u-2", name: "Thanh Trúc", level: 4, days: 7, micros: 91.2, hits: 6 },
  { id: "u-3", name: "Hoàng Long", level: 4, days: 6, micros: 88.5, hits: 6 },
  { id: "u-4", name: "Phương Anh", level: 3, days: 6, micros: 82.0, hits: 5 },
  { id: "u-5", name: "Đức Huy", level: 3, days: 5, micros: 79.4, hits: 4 },
  { id: "u-6", name: "Thùy Dung", level: 2, days: 5, micros: 75.2, hits: 4 },
  { id: "u-7", name: "Bảo Nam", level: 2, days: 4, micros: 71.0, hits: 3 },
  { id: "u-8", name: "Khánh Linh", level: 2, days: 4, micros: 68.5, hits: 3 },
  { id: "u-9", name: "Anh Tuấn", level: 1, days: 3, micros: 64.0, hits: 2 },
  { id: "u-10", name: "Ngọc Mai", level: 1, days: 3, micros: 58.2, hits: 2 },
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
      masteryLevel: u.level,
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
      masteryLevel: 3,
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
