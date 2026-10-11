export interface DailyTrendEntry {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "CN", "T2", "T3", "T4", "T5", "T6", "T7"
  dateNumber: string; // "04", "05", etc.
  isToday?: boolean;
  calories: number;
  protein: number; // g
  fat: number; // g
  carbs: number; // g
  fiber: number; // g
  // 5 key micros:
  calcium: number; // mg
  iron: number; // mg
  potassium: number; // mg
  magnesium: number; // mg
  vitamin_d: number; // µg
}

export interface NutrientTargetDef {
  key: string;
  name: string;
  unit: string;
  targetMin: number;
  targetMax?: number;
  isCoachRule?: boolean;
}

/**
 * 7-day mock series matching Trends.dc.html
 * Days 1..6 are completed; Day 7 (today) is partially logged (đang ghi).
 */
export const MOCK_TRENDS_7_DAYS: DailyTrendEntry[] = [
  {
    date: "2026-10-04",
    dayLabel: "CN",
    dateNumber: "04",
    calories: 2050,
    protein: 115,
    fat: 58,
    carbs: 260,
    fiber: 26,
    calcium: 420,
    iron: 11.2,
    potassium: 2600,
    magnesium: 250,
    vitamin_d: 2.8,
  },
  {
    date: "2026-10-05",
    dayLabel: "T2",
    dateNumber: "05",
    calories: 1890,
    protein: 102,
    fat: 50,
    carbs: 245,
    fiber: 22,
    calcium: 380,
    iron: 9.8,
    potassium: 2400,
    magnesium: 230,
    vitamin_d: 2.2,
  },
  {
    date: "2026-10-06",
    dayLabel: "T3",
    dateNumber: "06",
    calories: 2210,
    protein: 118,
    fat: 62,
    carbs: 285,
    fiber: 29,
    calcium: 450,
    iron: 12.5,
    potassium: 2850,
    magnesium: 270,
    vitamin_d: 3.5,
  },
  {
    date: "2026-10-07",
    dayLabel: "T4",
    dateNumber: "07",
    calories: 1640,
    protein: 94,
    fat: 46,
    carbs: 210,
    fiber: 19,
    calcium: 360,
    iron: 8.5,
    potassium: 2200,
    magnesium: 210,
    vitamin_d: 1.8,
  },
  {
    date: "2026-10-08",
    dayLabel: "T5",
    dateNumber: "08",
    calories: 2120,
    protein: 116,
    fat: 59,
    carbs: 270,
    fiber: 27,
    calcium: 430,
    iron: 11.8,
    potassium: 2700,
    magnesium: 260,
    vitamin_d: 3.0,
  },
  {
    date: "2026-10-09",
    dayLabel: "T6",
    dateNumber: "09",
    calories: 1980,
    protein: 110,
    fat: 54,
    carbs: 255,
    fiber: 25,
    calcium: 420,
    iron: 10.9,
    potassium: 2550,
    magnesium: 250,
    vitamin_d: 2.7,
  },
  {
    date: "2026-10-10",
    dayLabel: "T7",
    dateNumber: "10",
    isToday: true,
    calories: 1041,
    protein: 58,
    fat: 32,
    carbs: 133,
    fiber: 14,
    calcium: 210,
    iron: 5.4,
    potassium: 1450,
    magnesium: 140,
    vitamin_d: 1.2,
  },
];

/**
 * 30-day mock series building back from today (2026-10-10)
 */
export const MOCK_TRENDS_30_DAYS: DailyTrendEntry[] = (() => {
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const list: DailyTrendEntry[] = [];

  // Seed baseline patterns
  for (let i = 29; i >= 0; i--) {
    const d = new Date(2026, 9, 10 - i);
    const dayLabel = dayNames[d.getDay()];
    const dateNumber = String(d.getDate()).padStart(2, "0");
    const dateStr = `2026-${String(d.getMonth() + 1).padStart(2, "0")}-${dateNumber}`;
    const isToday = i === 0;

    if (isToday) {
      list.push(MOCK_TRENDS_7_DAYS[6]);
    } else if (i < 7) {
      list.push(MOCK_TRENDS_7_DAYS[6 - i]);
    } else {
      // Deterministic variation around typical baseline values
      const cycle = i % 7;
      const calOffset = (cycle === 0 ? 120 : cycle === 3 ? -250 : cycle === 5 ? 80 : 0);
      const cal = 2050 + calOffset;
      const pro = Math.round(108 + (cycle === 3 ? -10 : 8));
      const fat = Math.round(56 + (cycle % 2 === 0 ? 4 : -3));
      const carb = Math.round(260 + calOffset / 8);
      const fib = Math.round(25 + (cycle % 3));

      list.push({
        date: dateStr,
        dayLabel,
        dateNumber,
        calories: cal,
        protein: pro,
        fat,
        carbs: carb,
        fiber: fib,
        calcium: 410 + (cycle * 10),
        iron: 10.5 + (cycle * 0.3),
        potassium: 2500 + (cycle * 40),
        magnesium: 245 + (cycle * 5),
        vitamin_d: 2.6 + (cycle * 0.2),
      });
    }
  }

  return list;
})();
