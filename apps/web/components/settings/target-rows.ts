import { calculateSaltTarget, formatSaltRange } from "../../lib/training";
import { formatAmount, formatNumber, formatRange } from "../../lib/format";
import { goalName } from "../../lib/onboarding";
import { calculateEnergyTarget, type TargetRange } from "../../lib/targets";
import { getNutrientDefinition, nutrientName } from "../../lib/nutrients";
import { targetsFor, type Profile } from "../../lib/profile";
import { ageOf, rdaWho } from "../../lib/rda";

export interface TargetRowData {
  label: string;
  /** The formula, or the source of the value: "Giữ cân: 30–35 kcal/kg × 65 kg". */
  detail: string;
  value: string;
}

export interface TargetSection {
  title: string;
  rows: TargetRowData[];
}

// The VN 2016 values (lib/rda.ts) in the design's order; names and units come from the catalogue.
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


function range(target: TargetRange, unit: string): string {
  return `${formatRange(target.min, target.max)} ${unit}`;
}

/**
 * The daily targets of a profile as the design lists them: formula lines from the coach rules for energy and the macros
 * (lib/targets.ts), and the VN 2016 recommended amounts for the 22 vitamins and minerals (lib/rda.ts). Read-only; nothing here is edited.
 */
export function targetSections(profile: Profile): TargetSection[] {
  const t = targetsFor(profile);
  const who = `VN 2016, ${rdaWho(profile.sex, ageOf(profile.birthYear)).toLowerCase()}`;
  const weight = formatNumber(profile.weightKg);
  const perKg = calculateEnergyTarget(1, profile.goal);
  const salt = calculateSaltTarget(profile.trainingMinutesDefault);

  return [
    {
      title: "Năng lượng và đa lượng",
      rows: [
        {
          label: "Kcal",
          detail: `${goalName(profile.goal)}: ${formatRange(perKg.min, perKg.max)} kcal/kg × ${weight} kg`,
          value: range(t.calories, "kcal"),
        },
        { label: "Đạm", detail: `1,6–2,2 g/kg × ${weight} kg`, value: range(t.protein, "g") },
        { label: "Chất béo", detail: `0,5–1 g/kg × ${weight} kg`, value: range(t.fat, "g") },
        {
          label: "Tinh bột",
          detail: "Phần còn lại: (kcal − đạm × 4 − béo × 9) ÷ 4",
          value: `${formatNumber(t.carbs.min)} g`,
        },
        {
          // Provisional, not a coach rule: the "*" note on the card says so
          label: "Chất xơ*",
          detail: "14 g mỗi 1.000 kcal, giới hạn theo giới tính",
          value: range(t.fiber, "g"),
        },
      ],
    },
    {
      title: "Khoáng chất",
      rows: [
        // Sodium stays the coach's training formula for now (TODO cc-67: Hao decides on VN 2016's 2.000 mg, OPEN_QUESTIONS)
        {
          label: "Muối",
          detail: "Nền 4–6 g + 1–1,5 g mỗi 20 phút tập",
          value: `${formatSaltRange(salt.totalMin, salt.totalMax)} g`,
        },
        ...["potassium", "calcium", "magnesium", "iron", "zinc"].map((key) => ({
          label: nutrientName(key),
          detail: who,
          value: `${formatAmount(t[key]?.min ?? 0, "mg")} mg`,
        })),
      ],
    },
    {
      title: "Vitamin và khoáng khác",
      rows: VITAMIN_ROWS.map((key) => {
        const target = t[key];
        const unit = getNutrientDefinition(key)?.unit ?? "";
        return { label: nutrientName(key), detail: who, value: target ? `${formatAmount(target.min, unit)} ${unit}` : "—" };
      }),
    },
  ];
}
