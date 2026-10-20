import { calculateSaltTarget, formatSaltRange } from "../../lib/training";
import { formatAmount, formatNumber } from "../../lib/format";
import { goalName } from "../../lib/onboarding";
import { FAT_G_PER_KG, FIBER_G_PER_1000_KCAL, FIBER_MAX_G, KCAL_PER_KG, PROTEIN_G_PER_KG } from "../../lib/targets";
import { applyCustomTargets, CUSTOM_TARGETS_ENABLED, isCustom } from "../../lib/custom-targets";
import { getNutrientDefinition, nutrientName } from "../../lib/nutrients";
import { targetsFor, type Profile } from "../../lib/profile";
import { ageOf, rdaWho, upperLimits } from "../../lib/rda";

export interface TargetRowData {
  label: string;
  /** The formula of the value ("Giữ cân: 35 kcal/kg × 65 kg"), or a reason it is not the DRI (iron in the period). Empty on a DRI row: the card says whose they are. */
  detail: string;
  value: string;
  /** The nutrient id of a vitamin or mineral row (the ones that can be tapped to set a custom target) */
  id?: string;
  /** The unit of the value, for the editor */
  unit?: string;
  /** The default (DRI) amount, which "Về mặc định" goes back to */
  defaultValue?: number;
  /** The amount in force, a number */
  amount?: number;
  /** The Tolerable Upper Intake Level, shown under the row: "Tối đa 2.500 mg" */
  max?: string;
  /** The user set this target: "tự đặt" */
  custom?: boolean;
  /** The row can be tapped to set a custom target (the flag is on and this is a vitamin or mineral row) */
  editable?: boolean;
}

export interface TargetSection {
  title: string;
  /** Whose amounts the card shows, once for all its rows: "Theo DRI · nam 19–30 tuổi" (the cards of the DRI amounts only) */
  subtitle?: string;
  rows: TargetRowData[];
}

// The DRI values (lib/rda.ts) in the design's order; names and units come from the catalogue.
const VITAMIN_ROWS = [
  "vitamin_a",
  "vitamin_c",
  "vitamin_d",
  "vitamin_e",
  "vitamin_k",
  "b1",
  "b2",
  "b3",
  "b5",
  "b6",
  "folate",
  "b12",
  "copper",
  "manganese",
  "phosphorus",
  "selenium",
];

const MINERAL_ROWS = ["potassium", "calcium", "magnesium", "iron", "zinc"];

/** "Tối đa 2.500 mg", or "Tối đa 350 mg, chỉ tính từ thực phẩm bổ sung" for a limit that covers supplements only. */
function maxText(limit: { limit: number; supplementsOnly: boolean } | undefined, unit: string): string | undefined {
  if (!limit) return undefined;
  const text = `Tối đa ${formatAmount(limit.limit, unit)} ${unit}`;
  return limit.supplementsOnly ? `${text}, chỉ tính từ thực phẩm bổ sung` : text;
}

/**
 * The daily targets of a profile as the design lists them: formula lines from the coach rules for energy and the macros
 * (lib/targets.ts, the upper end of each range), and the US DRI amounts for the vitamins and minerals (lib/rda.ts) with the
 * Tolerable Upper Intake Level under each row. Read-only, except a vitamin or mineral row when custom targets are on.
 */
export function targetSections(profile: Profile, customEditable = CUSTOM_TARGETS_ENABLED): TargetSection[] {
  const t = customEditable ? applyCustomTargets(targetsFor(profile), profile.customTargets) : targetsFor(profile);
  const age = ageOf(profile.birthYear);
  const who = `Theo DRI · ${rdaWho(profile.sex, age).toLowerCase()}`;
  const weight = formatNumber(profile.weightKg);
  const salt = calculateSaltTarget(profile.trainingMinutesDefault);
  const limits = upperLimits(age);
  const defaultsAt = targetsFor({ ...profile, customTargets: undefined });

  const microRow = (key: string): TargetRowData => {
    const unit = getNutrientDefinition(key)?.unit ?? "";
    const target = t[key];
    const custom = customEditable && isCustom(profile.customTargets, key);
    const periodIron = key === "iron" && profile.sex === "female" && profile.periodMode;
    return {
      label: nutrientName(key),
      // Whose amounts these are is on the card once; a row keeps only its own line. Iron in the period is the coach's 28 mg, not a DRI amount
      detail: periodIron ? "Gần/đang trong kỳ: quy tắc của huấn luyện viên" : "",
      value: target ? `${formatAmount(target.min, unit)} ${unit}` : "—",
      id: key,
      unit,
      amount: target?.min,
      defaultValue: defaultsAt[key]?.min,
      max: maxText(limits[key], unit),
      custom,
      editable: customEditable,
    };
  };

  return [
    {
      title: "Năng lượng và đa lượng",
      rows: [
        {
          label: "Kcal",
          detail: `${goalName(profile.goal)}: ${formatNumber(KCAL_PER_KG[profile.goal])} kcal/kg × ${weight} kg`,
          value: `${formatNumber(t.calories.min)} kcal`,
        },
        { label: "Đạm", detail: `${formatNumber(PROTEIN_G_PER_KG)} g/kg × ${weight} kg`, value: `${formatNumber(t.protein.min)} g` },
        { label: "Chất béo", detail: `${formatNumber(FAT_G_PER_KG)} g/kg × ${weight} kg`, value: `${formatNumber(t.fat.min)} g` },
        {
          label: "Tinh bột",
          detail: "Phần còn lại: (kcal − đạm × 4 − béo × 9) ÷ 4",
          value: `${formatNumber(t.carbs.min)} g`,
        },
        {
          // Provisional, not a coach rule: the "*" note on the card says so
          label: "Chất xơ*",
          detail: `${FIBER_G_PER_1000_KCAL} g mỗi 1.000 kcal, tối đa ${FIBER_MAX_G[profile.sex]} g`,
          value: `${formatNumber(t.fiber.min)} g`,
        },
      ],
    },
    {
      title: "Khoáng chất",
      subtitle: who,
      rows: [
        // Salt stays the coach's training formula and a range (Hao 20/10), not the DRI's 1.500 mg
        {
          label: "Muối",
          detail: "Nền 4–6 g + 1–1,5 g mỗi 20 phút tập",
          value: `${formatSaltRange(salt.totalMin, salt.totalMax)} g`,
        },
        ...MINERAL_ROWS.map(microRow),
      ],
    },
    {
      title: "Vitamin và khoáng khác",
      subtitle: who,
      rows: VITAMIN_ROWS.map(microRow),
    },
  ];
}
