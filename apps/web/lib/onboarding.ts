import {
  calculateEnergyTarget,
  calculateTargets,
  type GoalType,
  type SexType,
} from "./targets";
import { formatNumber, formatRange } from "./format";

export interface SetupDraft {
  sex: SexType;
  birthYear: string;
  weight: string;
  goal: GoalType;
}

export interface SetupProfile {
  sex: SexType;
  birthYear: number;
  weightKg: number;
  goal: GoalType;
}

export interface SetupErrors {
  birthYear?: string;
  weight?: string;
}

export const DEFAULT_DRAFT: SetupDraft = {
  sex: "male",
  birthYear: "2003",
  weight: "65",
  goal: "maintain",
};

const GOAL_COPY: Record<GoalType, { name: string; note: string; rule: string }> = {
  build: { name: "Tăng cơ", note: "Ăn dư một chút để lên cơ", rule: "35–40 kcal / kg" },
  maintain: { name: "Giữ cân", note: "Duy trì cân nặng hiện tại", rule: "30–35 kcal / kg" },
  cut: { name: "Giảm mỡ", note: "Thâm hụt vừa phải, giữ cơ", rule: "25–30 kcal / kg" },
  deep_cut: { name: "Giảm mỡ nhanh", note: "Ngắn hạn — tối đa 4–6 tuần", rule: "20–25 kcal / kg" },
};

const GOAL_ORDER: GoalType[] = ["build", "maintain", "cut", "deep_cut"];

export function parseWeightKg(text: string): number | null {
  const normalised = text.trim().replace(",", ".");
  if (normalised === "") return null;
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

export function parseBirthYear(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function validateSetupDraft(
  draft: SetupDraft,
  currentYear: number,
): { profile?: SetupProfile; errors: SetupErrors } {
  const errors: SetupErrors = {};

  const birthYear = parseBirthYear(draft.birthYear);
  if (birthYear === null || birthYear < 1900 || birthYear > currentYear) {
    errors.birthYear = `Nhập năm sinh từ 1900 đến ${currentYear}`;
  }

  const weightKg = parseWeightKg(draft.weight);
  if (weightKg === null || weightKg < 30 || weightKg > 300) {
    errors.weight = "Nhập cân nặng từ 30 đến 300 kg";
  }

  if (errors.birthYear || errors.weight || birthYear === null || weightKg === null) {
    return { errors };
  }

  return {
    profile: { sex: draft.sex, birthYear, weightKg, goal: draft.goal },
    errors,
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export interface GoalOption {
  goal: GoalType;
  name: string;
  note: string;
  rule: string;
  kcal: string;
}

// weightKg is null while the weight field holds no valid number yet.
export function goalOptions(weightKg: number | null): GoalOption[] {
  return GOAL_ORDER.map((goal) => {
    if (weightKg === null) return { goal, ...GOAL_COPY[goal], kcal: "—" };
    const energy = calculateEnergyTarget(weightKg, goal);
    return { goal, ...GOAL_COPY[goal], kcal: formatRange(energy.min, energy.max) };
  });
}

export interface TargetRow {
  label: string;
  value: string;
}

export function dailyTargetRows(weightKg: number | null, sex: SexType, goal: GoalType): TargetRow[] {
  if (weightKg === null) return [];
  const targets = calculateTargets({ sex, weightKg, goal });
  return [
    {
      label: "Năng lượng",
      value: `${formatRange(targets.calories.min, targets.calories.max)} kcal`,
    },
    {
      label: "Đạm (1,6–2,2 g/kg)",
      value: `${formatRange(targets.protein.min, targets.protein.max)} g`,
    },
    {
      label: "Béo (0,5–1 g/kg)",
      value: `${formatRange(targets.fat.min, targets.fat.max)} g`,
    },
    {
      label: "Kali (80–100 mg/kg)",
      value: `${formatRange(targets.potassium.min, targets.potassium.max)} mg`,
    },
  ];
}

export function resendLabel(secondsLeft: number): string {
  return secondsLeft > 0
    ? `Gửi lại link (sau ${formatNumber(secondsLeft)} giây)`
    : "Gửi lại link";
}

const DRAFT_KEY = "h1t-onboarding-draft";
const EMAIL_KEY = "h1t-pending-email";

// sessionStorage keeps the in-progress setup and the pending sign-in email between
// screens. Storage can be blocked (private mode), so every access is guarded.
export function readDraft(): SetupDraft {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...DEFAULT_DRAFT, ...(JSON.parse(raw) as Partial<SetupDraft>) } : DEFAULT_DRAFT;
  } catch {
    return DEFAULT_DRAFT;
  }
}

export function writeDraft(draft: SetupDraft): void {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable: the draft lives only in component state.
  }
}

export function readPendingEmail(): string {
  try {
    return window.sessionStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writePendingEmail(email: string): void {
  try {
    window.sessionStorage.setItem(EMAIL_KEY, email);
  } catch {
    // Storage unavailable: the email is not remembered between screens.
  }
}
