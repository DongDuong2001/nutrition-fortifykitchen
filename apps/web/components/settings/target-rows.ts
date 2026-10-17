import { calculateSaltTarget, formatSaltRange } from "../../lib/training";
import { formatAmount, formatNumber, formatRange } from "../../lib/format";
import { goalName } from "../../lib/onboarding";
import { calculateEnergyTarget, type TargetRange } from "../../lib/targets";
import { getNutrientDefinition, nutrientName } from "../../lib/nutrients";
import { targetsFor, type Profile } from "../../lib/profile";

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

// The VN 2016 values (lib/targets.ts VN2016_TARGETS) in the design's order; names and units come from the catalogue.
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
 * The daily targets of a profile as the design lists them: formula lines from the coach rules
 * (lib/targets.ts, lib/training.ts), and VN 2016 values for the rest. Read-only; nothing here is edited.
 */
export function targetSections(profile: Profile): TargetSection[] {
  const t = targetsFor(profile);
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
        {
          label: "Muối",
          detail: "Nền 4–6 g + 1–1,5 g mỗi 20 phút tập",
          value: `${formatSaltRange(salt.totalMin, salt.totalMax)} g`,
        },
        { label: nutrientName("potassium"), detail: `80–100 mg/kg × ${weight} kg`, value: range(t.potassium, "mg") },
        { label: nutrientName("calcium"), detail: "Khoảng mục tiêu theo huấn luyện viên", value: range(t.calcium, "mg") },
        { label: nutrientName("magnesium"), detail: `50% mục tiêu ${nutrientName("calcium")}`, value: range(t.magnesium, "mg") },
        {
          label: nutrientName("iron"),
          detail: "Nam 8 mg · Nữ 18 mg, đang kinh 28 mg",
          value: `${formatNumber(t.iron.min)} mg`,
        },
        { label: nutrientName("zinc"), detail: "Nam 12 mg · Nữ 8 mg", value: `${formatNumber(t.zinc.min)} mg` },
      ],
    },
    {
      title: "Vitamin và khoáng khác*",
      rows: VITAMIN_ROWS.map((key) => {
        const target = t[key];
        const unit = getNutrientDefinition(key)?.unit ?? "";
        return { label: nutrientName(key), detail: "", value: target ? `${formatAmount(target.min, unit)} ${unit}` : "—" };
      }),
    },
  ];
}
