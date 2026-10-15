export type MasteryLevelId = 1 | 2 | 3 | 4 | 5;

export interface MasteryLevelConfig {
  level: MasteryLevelId;
  title: string;
  shortLabel: string;
  description: string;
  minStreakDays: number;
  minAvgMicros: number; // out of 22
}

export interface MasteryLevelInfo extends MasteryLevelConfig {
  nextLevel: MasteryLevelConfig | null;
  progressPct: number; // 0 to 100 towards next level
  nextRequirementText?: string;
  isCoach?: boolean;
  canApplyForCoach?: boolean;
}

export const MASTERY_LEVELS: MasteryLevelConfig[] = [
  {
    level: 1,
    title: "Người mới bắt đầu",
    shortLabel: "Cấp 1 · Bắt đầu",
    description: "Bắt đầu hành trình ghi nhận và theo dõi dinh dưỡng.",
    minStreakDays: 0,
    minAvgMicros: 0,
  },
  {
    level: 2,
    title: "Kỷ luật cơ bản",
    shortLabel: "Cấp 2 · Kỷ luật",
    description: "Duy trì ghi chép liên tục 7 ngày và đạt tối thiểu 10/22 vi chất.",
    minStreakDays: 7,
    minAvgMicros: 10,
  },
  {
    level: 3,
    title: "Cân bằng vi chất",
    shortLabel: "Cấp 3 · Cân bằng",
    description: "Duy trì ghi chép 14 ngày và đạt tối thiểu 14/22 vi chất.",
    minStreakDays: 14,
    minAvgMicros: 14,
  },
  {
    level: 4,
    title: "Dinh dưỡng tối ưu",
    shortLabel: "Cấp 4 · Tối ưu",
    description: "Duy trì ghi chép 30 ngày và đạt tối thiểu 18/22 vi chất.",
    minStreakDays: 30,
    minAvgMicros: 18,
  },
  {
    level: 5,
    title: "Bậc thầy H1T · Huấn luyện viên",
    shortLabel: "Cấp 5 · HLV",
    description: "Đỉnh cao kỷ luật dinh dưỡng thể thao và vi chất toàn diện, được bảo chứng bởi Ban Chuyên môn H1T.",
    minStreakDays: 60,
    minAvgMicros: 20,
  },
];

export function getMasteryLevelDetails(level: MasteryLevelId): MasteryLevelConfig {
  return MASTERY_LEVELS.find((l) => l.level === level) || MASTERY_LEVELS[0];
}

export function calculateMasteryLevel(
  streakDays: number,
  avgMicrosAchieved: number,
  isCoach: boolean = false
): MasteryLevelInfo {
  const safeStreak = Math.max(0, streakDays);
  const safeMicros = Math.max(0, avgMicrosAchieved);

  // If certified as coach, user is granted Level 5 directly
  if (isCoach) {
    const tier5 = MASTERY_LEVELS[4];
    return {
      ...tier5,
      nextLevel: null,
      progressPct: 100,
      isCoach: true,
      canApplyForCoach: false,
    };
  }

  // Automatic progression for regular members caps at Level 4 (Index 3)
  // Level 5 requires Admin / Coaching review
  let currentIdx = 0;
  for (let i = 3; i >= 0; i--) {
    const tier = MASTERY_LEVELS[i];
    if (safeStreak >= tier.minStreakDays && safeMicros >= tier.minAvgMicros) {
      currentIdx = i;
      break;
    }
  }

  const current = MASTERY_LEVELS[currentIdx];
  const next = currentIdx < MASTERY_LEVELS.length - 1 ? MASTERY_LEVELS[currentIdx + 1] : null;

  // If user has reached Level 4
  if (current.level === 4) {
    const tier5 = MASTERY_LEVELS[4];
    const streakNeeded = Math.max(0, tier5.minStreakDays - safeStreak);
    const microsNeeded = Math.max(0, Math.ceil(tier5.minAvgMicros - safeMicros));

    let nextRequirementText = "";
    if (streakNeeded > 0 || microsNeeded > 0) {
      nextRequirementText = `Cần ${tier5.minStreakDays} ngày và ${tier5.minAvgMicros}/22 vi chất trước khi ứng tuyển Huấn luyện viên`;
    } else {
      nextRequirementText = "Đã đủ điều kiện dữ liệu. Đăng ký xét duyệt với Ban Chuyên môn để kích hoạt Cấp 5 (Huấn luyện viên)";
    }

    const streakProgress = Math.min(1, safeStreak / tier5.minStreakDays);
    const microsProgress = Math.min(1, safeMicros / tier5.minAvgMicros);
    const progressPct = Math.round(((streakProgress + microsProgress) / 2) * 100);

    return {
      ...current,
      nextLevel: tier5,
      progressPct,
      nextRequirementText,
      isCoach: false,
      canApplyForCoach: true,
    };
  }

  // Normal progression for Levels 1 to 3
  const streakRange = next!.minStreakDays - current.minStreakDays;
  const microsRange = next!.minAvgMicros - current.minAvgMicros;

  const streakProgress = streakRange > 0 ? Math.min(1, Math.max(0, (safeStreak - current.minStreakDays) / streakRange)) : 1;
  const microsProgress = microsRange > 0 ? Math.min(1, Math.max(0, (safeMicros - current.minAvgMicros) / microsRange)) : 1;

  const progressPct = Math.round(((streakProgress + microsProgress) / 2) * 100);

  const streakNeeded = Math.max(0, next!.minStreakDays - safeStreak);
  const microsNeeded = Math.max(0, Math.ceil(next!.minAvgMicros - safeMicros));

  let nextRequirementText = "";
  if (streakNeeded > 0 && microsNeeded > 0) {
    nextRequirementText = `Cần thêm ${streakNeeded} ngày liên tiếp và +${microsNeeded} vi chất`;
  } else if (streakNeeded > 0) {
    nextRequirementText = `Cần thêm ${streakNeeded} ngày ghi nhận liên tiếp`;
  } else if (microsNeeded > 0) {
    nextRequirementText = `Cần đạt thêm ${microsNeeded} vi chất mỗi ngày`;
  }

  return {
    ...current,
    nextLevel: next,
    progressPct,
    nextRequirementText,
    isCoach: false,
    canApplyForCoach: false,
  };
}

export const getMasteryLevel = calculateMasteryLevel;
