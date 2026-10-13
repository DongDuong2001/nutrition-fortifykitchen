import type { FoodNutrientValue, TargetSource } from "../nutrients";
import type { GoalType, SexType } from "../targets";

export interface MockFoodItem {
  id: string;
  name: string;
  qty: string;
  kcal: number;
  /** Second line of a row, e.g. the macros of a quick kcal entry ("Đạm — · Tinh bột 30 g · Béo —"). */
  detail?: string;
  nutrients?: Record<string, FoodNutrientValue>;
}

export interface MockMeal {
  id: string;
  slot: "breakfast" | "lunch" | "preworkout" | "dinner" | "snack";
  name: string;
  kcal: number;
  items: MockFoodItem[];
}

export interface MockMacroStat {
  key: "protein" | "carbs" | "fat" | "fiber";
  label: string;
  consumed: number | null;
  targetMin: number | null;
  targetMax?: number;
  unit: string;
  displayValue: string;
  percentage: number | null;
}

export interface MockMicroStat {
  key: string;
  name: string;
  group: "mineral" | "vitamin";
  consumed: number | null;
  targetMin: number | null;
  targetMax?: number;
  unit: string;
  displayValue: string;
  percentage: number | null;
  isCoachRule: boolean;
  targetSource?: TargetSource;
}

export interface MockDayData {
  date: string; // e.g. "2026-10-10"
  dateLabel: string; // "Hôm nay 10/10"
  desktopDateLabel?: string; // "Thứ Bảy, 10/10/2026 · Ngày tập 60' · Giữ cân · 65 kg"
  user: {
    sex: SexType;
    weightKg: number;
    birthYear: number;
    email: string;
    goal: GoalType;
    goalLabel: string;
    trainingMinutes: number;
  };
  calories: {
    consumed: number;
    targetMin: number;
    targetMax: number;
    remaining: number;
    percentage: number;
  };
  macros: MockMacroStat[];
  meals: MockMeal[];
  minerals: MockMicroStat[];
  vitamins: MockMicroStat[];
  microsSummary: {
    achieved: number;
    total: number;
    mineralsAchieved: number;
    mineralsTotal: number;
    vitaminsAchieved: number;
    vitaminsTotal: number;
    mostLacking: string[];
  };
  nutrients?: Record<string, number | null>;
}

export const SAMPLE_DAY: MockDayData = {
  date: "2026-10-10",
  dateLabel: "Hôm nay 10/10",
  desktopDateLabel: "Thứ Bảy, 10/10/2026 · Ngày tập 60′ · Giữ cân · 65 kg",
  user: {
    sex: "male",
    weightKg: 65,
    birthYear: 2003,
    email: "ban@email.com",
    goal: "maintain",
    goalLabel: "Giữ cân",
    trainingMinutes: 60,
  },
  calories: {
    consumed: 1041,
    targetMin: 1950,
    targetMax: 2275,
    remaining: 909,
    percentage: Math.round((1041 / 1950) * 100),
  },
  nutrients: {
    // General
    energy: 1041,
    water: 1450,
    alcohol: null,
    caffeine: null,
    oxalate: null,
    phytate: null,

    // Carbohydrates
    carbs: 133,
    net_carbs: 119,
    fiber: 14,
    insoluble_fiber: 8.5,
    soluble_fiber: 5.5,
    starch: 78,
    sugars: 41,
    added_sugars: 0,

    // Lipids
    fat: 21,
    monounsaturated_fat: 8.1,
    polyunsaturated_fat: 3.4,
    omega3: 0.55,
    ala: 0.45,
    dha: 0.05,
    epa: 0.05,
    omega6: 2.85,
    saturated_fat: 7.2,
    trans_fat: 0.3,
    cholesterol: 115,

    // Protein & Amino Acids
    protein: 62,
    cystine: 0.8,
    histidine: 1.8,
    isoleucine: 2.8,
    leucine: 5.1,
    lysine: 5.2,
    methionine: 1.6,
    phenylalanine: 2.6,
    threonine: 2.5,
    tryptophan: 0.7,
    tyrosine: 2.1,
    valine: 3.2,
  },
  macros: [
    {
      key: "protein",
      label: "Đạm",
      consumed: 62,
      targetMin: 104,
      targetMax: 143,
      unit: "g",
      displayValue: "62 / 104 g",
      percentage: 60,
    },
    {
      key: "carbs",
      label: "Tinh bột",
      consumed: 133,
      targetMin: 254,
      unit: "g",
      displayValue: "133 / 254 g",
      percentage: 52,
    },
    {
      key: "fat",
      label: "Béo",
      consumed: 21,
      targetMin: 33,
      targetMax: 65,
      unit: "g",
      displayValue: "21 / 33–65 g",
      percentage: 64,
    },
    {
      key: "fiber",
      label: "Chất xơ",
      consumed: 14,
      targetMin: 30,
      targetMax: 40,
      unit: "g",
      displayValue: "14 / 30 g",
      percentage: 47,
    },
  ],
  meals: [
    {
      id: "meal-1",
      slot: "breakfast",
      name: "Bữa sáng",
      kcal: 459,
      items: [
        { id: "item-1", name: "Yến mạch", qty: "60 g", kcal: 228 },
        { id: "item-2", name: "Yogurt kefir", qty: "200 ml", kcal: 126 },
        { id: "item-3", name: "Chuối", qty: "1 quả", kcal: 105 },
      ],
    },
    {
      id: "meal-2",
      slot: "lunch",
      name: "Bữa trưa",
      kcal: 488,
      items: [
        { id: "item-4", name: "Cơm gạo lứt", qty: "150 g", kcal: 168 },
        { id: "item-5", name: "Thịt bò nạc", qty: "150 g", kcal: 320 },
      ],
    },
    {
      id: "meal-3",
      slot: "preworkout",
      name: "Trước tập",
      kcal: 94,
      items: [
        { id: "item-6", name: "Chà là", qty: "30 g", kcal: 84 },
        { id: "item-7", name: "Bột củ dền", qty: "3 g", kcal: 10 },
      ],
    },
    {
      id: "meal-4",
      slot: "dinner",
      name: "Bữa tối",
      kcal: 0,
      items: [],
    },
    {
      id: "meal-5",
      slot: "snack",
      name: "Bữa phụ",
      kcal: 0,
      items: [],
    },
  ],
  minerals: [
    {
      key: "sodium",
      name: "Natri (muối)",
      group: "mineral",
      consumed: 2900,
      targetMin: 2750,
      targetMax: 4130,
      unit: "mg",
      displayValue: "2.900 / 2.750–4.130 mg",
      percentage: 100,
      isCoachRule: true,
    },
    {
      key: "iron",
      name: "Sắt",
      group: "mineral",
      consumed: 11,
      targetMin: 8,
      targetMax: 10,
      unit: "mg",
      displayValue: "11 / 8 mg",
      percentage: 100,
      isCoachRule: true,
    },
    {
      key: "zinc",
      name: "Kẽm",
      group: "mineral",
      consumed: 12.4,
      targetMin: 12,
      unit: "mg",
      displayValue: "12,4 / 12 mg",
      percentage: 100,
      isCoachRule: true,
    },
    {
      key: "phosphorus",
      name: "Phốt pho",
      group: "mineral",
      consumed: 1050,
      targetMin: 700,
      unit: "mg",
      displayValue: "1.050 / 700 mg",
      percentage: 100,
      isCoachRule: false,
    },
    {
      key: "selenium",
      name: "Selen",
      group: "mineral",
      consumed: 52,
      targetMin: 34,
      unit: "µg",
      displayValue: "52 / 34 µg",
      percentage: 100,
      isCoachRule: false,
    },
    {
      key: "copper",
      name: "Đồng",
      group: "mineral",
      consumed: 0.8,
      targetMin: 0.9,
      unit: "mg",
      displayValue: "0,8 / 0,9 mg",
      percentage: 89,
      isCoachRule: false,
    },
    {
      key: "potassium",
      name: "Kali",
      group: "mineral",
      consumed: 3900,
      targetMin: 5200,
      targetMax: 6500,
      unit: "mg",
      displayValue: "3.900 / 5.200 mg",
      percentage: 75,
      isCoachRule: true,
    },
    {
      key: "magnesium",
      name: "Magie",
      group: "mineral",
      consumed: 410,
      targetMin: 600,
      targetMax: 750,
      unit: "mg",
      displayValue: "410 / 600 mg",
      percentage: 68,
      isCoachRule: true,
    },
    {
      key: "calcium",
      name: "Canxi",
      group: "mineral",
      consumed: 331,
      targetMin: 1200,
      targetMax: 1500,
      unit: "mg",
      displayValue: "331 / 1.200 mg",
      percentage: 28,
      isCoachRule: true,
      targetSource: "coach",
    },
    {
      key: "manganese",
      name: "Mangan",
      group: "mineral",
      consumed: 1.8,
      targetMin: 2.3,
      unit: "mg",
      displayValue: "1,8 / 2,3 mg",
      percentage: 78,
      isCoachRule: false,
      targetSource: "vn2016",
    },
  ],
  vitamins: [
    {
      key: "b12",
      name: "Vitamin B12",
      group: "vitamin",
      consumed: 3.1,
      targetMin: 2.4,
      unit: "µg",
      displayValue: "3,1 / 2,4 µg",
      percentage: 100,
      isCoachRule: false,
      targetSource: "vn2016",
    },
    {
      key: "b2",
      name: "Vitamin B2",
      group: "vitamin",
      consumed: 1.4,
      targetMin: 1.3,
      unit: "mg",
      displayValue: "1,4 / 1,3 mg",
      percentage: 100,
      isCoachRule: false,
      targetSource: "vn2016",
    },
    {
      key: "b3",
      name: "Vitamin B3",
      group: "vitamin",
      consumed: 18,
      targetMin: 16,
      unit: "mg",
      displayValue: "18 / 16 mg",
      percentage: 100,
      isCoachRule: false,
      targetSource: "vn2016",
    },
    {
      key: "b6",
      name: "Vitamin B6",
      group: "vitamin",
      consumed: 1.1,
      targetMin: 1.3,
      unit: "mg",
      displayValue: "1,1 / 1,3 mg",
      percentage: 85,
      isCoachRule: false,
      targetSource: "vn2016",
    },
    {
      key: "b5",
      name: "Vitamin B5",
      group: "vitamin",
      consumed: 4.1,
      targetMin: 5,
      unit: "mg",
      displayValue: "4,1 / 5 mg",
      percentage: 82,
      isCoachRule: false,
      targetSource: "vn2016",
    },
    {
      key: "vitamin_a",
      name: "Vitamin A",
      group: "vitamin",
      consumed: 520,
      targetMin: 650,
      unit: "µg",
      displayValue: "520 / 650 µg",
      percentage: 80,
      isCoachRule: false,
      targetSource: "vn2016",
    },
    {
      key: "b1",
      name: "Vitamin B1",
      group: "vitamin",
      consumed: 0.9,
      targetMin: 1.2,
      unit: "mg",
      displayValue: "0,9 / 1,2 mg",
      percentage: 75,
      isCoachRule: false,
      targetSource: "vn2016",
    },
    {
      key: "folate",
      name: "Folate (B9)",
      group: "vitamin",
      consumed: 290,
      targetMin: 400,
      unit: "µg",
      displayValue: "290 / 400 µg",
      percentage: 73,
      isCoachRule: false,
      targetSource: "vn2016",
    },
    {
      key: "vitamin_k",
      name: "Vitamin K",
      group: "vitamin",
      consumed: 85,
      targetMin: 150,
      unit: "µg",
      displayValue: "85 / 150 µg",
      percentage: 57,
      isCoachRule: false,
      targetSource: "vn2016",
    },
    {
      key: "vitamin_e",
      name: "Vitamin E",
      group: "vitamin",
      consumed: 3.2,
      targetMin: 6.5,
      unit: "mg",
      displayValue: "3,2 / 6,5 mg",
      percentage: 49,
      isCoachRule: false,
      targetSource: "vn2016",
    },
    {
      key: "vitamin_c",
      name: "Vitamin C",
      group: "vitamin",
      consumed: 48,
      targetMin: 100,
      unit: "mg",
      displayValue: "48 / 100 mg",
      percentage: 48,
      isCoachRule: false,
      targetSource: "vn2016",
    },
    {
      key: "vitamin_d",
      name: "Vitamin D",
      group: "vitamin",
      consumed: 2.1,
      targetMin: 15,
      unit: "µg",
      displayValue: "2,1 / 15 µg",
      percentage: 14,
      isCoachRule: false,
      targetSource: "vn2016",
    },
  ],
  microsSummary: {
    achieved: 8,
    total: 22,
    mineralsAchieved: 5,
    mineralsTotal: 10,
    vitaminsAchieved: 3,
    vitaminsTotal: 12,
    mostLacking: ["Vitamin D", "Canxi"],
  },
};
