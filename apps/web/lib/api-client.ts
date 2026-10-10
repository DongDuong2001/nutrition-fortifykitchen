import { createClient } from "./supabase-client";
import {
  SAMPLE_DAY,
  type MockDayData,
  type MockMeal,
  type MockMacroStat,
  type MockMicroStat,
} from "./mock/sample-day";

export type { MockDayData, MockMeal, MockMacroStat, MockMicroStat };

export interface NutrientValues {
  // Macros (11)
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  saturated_fat?: number;
  trans_fat?: number;
  monounsaturated_fat?: number;
  polyunsaturated_fat?: number;
  fiber: number;
  sugar?: number;
  added_sugar?: number;

  // Minerals (11)
  cholesterol?: number;
  sodium: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  phosphorus?: number;
  magnesium?: number;
  zinc?: number;
  copper?: number;
  manganese?: number;
  selenium?: number;

  // Vitamins (4+)
  vitamin_a?: number;
  vitamin_c?: number;
  vitamin_d?: number;
  vitamin_e?: number;
  vitamin_k?: number;
  vitamin_b1?: number;
  vitamin_b2?: number;
  vitamin_b3?: number;
  vitamin_b5?: number;
  vitamin_b6?: number;
  vitamin_b9?: number;
  vitamin_b12?: number;
}

export interface Food {
  id: string;
  name: string;
  serving_size_g: number;
  per_100g_nutrients: NutrientValues;
  is_custom: boolean;
  created_by?: string;
  created_at: string;
}

export interface DiaryLog {
  id: string;
  user_id: string;
  food_id: string;
  meal_slot: "breakfast" | "lunch" | "dinner" | "snack" | "preworkout" | "intraworkout" | "postworkout";
  quantity: number;
  serving_size_g: number;
  nutrients_snapshot: NutrientValues;
  log_date: string;
  created_at: string;
}

export interface DailyProgress {
  log_date: string;
  total_nutrients: NutrientValues;
  target_nutrients?: NutrientValues;
  completion_percentages?: Record<string, number>;
  logs_count: number;
}

export interface LogMealPayload {
  id: string; // Client-generated UUID
  food_id: string;
  meal_slot: "breakfast" | "lunch" | "dinner" | "snack" | "preworkout" | "intraworkout" | "postworkout";
  quantity: number;
  serving_size_g?: number;
  log_date?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  } catch {
    return { "Content-Type": "application/json" };
  }
}

export const apiClient = {
  /**
   * Get the complete typed day data matching design/SPEC.md
   * (Backed by typed mock until backend API is ready)
   */
  async getTodayData(): Promise<MockDayData> {
    return Promise.resolve(SAMPLE_DAY);
  },

  async getDailyProgress(date?: string): Promise<{ progress: DailyProgress; logs: DiaryLog[] }> {
    try {
      const headers = await getAuthHeaders();
      const query = date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(`${API_BASE_URL}/diary/daily${query}`, { headers });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch {
      // Fallback to typed mock when backend is unavailable
    }

    // Convert SAMPLE_DAY to DailyProgress fallback
    const mockProgress: DailyProgress = {
      log_date: date || SAMPLE_DAY.date,
      total_nutrients: {
        calories: SAMPLE_DAY.calories.consumed,
        protein: SAMPLE_DAY.macros.find((m) => m.key === "protein")?.consumed || 62,
        carbohydrates: SAMPLE_DAY.macros.find((m) => m.key === "carbs")?.consumed || 133,
        fat: SAMPLE_DAY.macros.find((m) => m.key === "fat")?.consumed || 21,
        fiber: SAMPLE_DAY.macros.find((m) => m.key === "fiber")?.consumed || 14,
        sodium: 2900,
        potassium: 3900,
        calcium: 331,
        magnesium: 410,
        iron: 11,
        zinc: 12.4,
      },
      target_nutrients: {
        calories: SAMPLE_DAY.calories.targetMin,
        protein: 104,
        carbohydrates: 254,
        fat: 33,
        fiber: 30,
        sodium: 2751,
        potassium: 5200,
        calcium: 1200,
        magnesium: 600,
        iron: 8,
        zinc: 12,
      },
      completion_percentages: {
        calories: SAMPLE_DAY.calories.percentage,
        protein: 60,
        carbohydrates: 52,
        fat: 64,
        fiber: 47,
      },
      logs_count: SAMPLE_DAY.meals.reduce((acc, m) => acc + m.items.length, 0),
    };

    return { progress: mockProgress, logs: [] };
  },

  async logMeal(payload: LogMealPayload): Promise<{ log: DiaryLog; today_progress: DailyProgress }> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/diary/logs`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch {
      // Fallback
    }

    const dummyLog: DiaryLog = {
      id: payload.id,
      user_id: "mock-user",
      food_id: payload.food_id,
      meal_slot: payload.meal_slot,
      quantity: payload.quantity,
      serving_size_g: payload.serving_size_g || 100,
      nutrients_snapshot: {
        calories: 100,
        protein: 10,
        carbohydrates: 10,
        fat: 2,
        fiber: 1,
        sodium: 50,
      },
      log_date: payload.log_date || "2026-10-10",
      created_at: new Date().toISOString(),
    };

    const { progress } = await this.getDailyProgress();
    return { log: dummyLog, today_progress: progress };
  },

  async searchFoods(query = ""): Promise<Food[]> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/foods?q=${encodeURIComponent(query)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch {
      // Fallback
    }

    // Default mock foods from sample day
    const mockFoods: Food[] = [
      {
        id: "food-1",
        name: "Yến mạch",
        serving_size_g: 60,
        is_custom: false,
        created_at: "2026-10-10",
        per_100g_nutrients: { calories: 380, protein: 13, carbohydrates: 68, fat: 7, fiber: 10, sodium: 5 },
      },
      {
        id: "food-2",
        name: "Yogurt kefir",
        serving_size_g: 200,
        is_custom: false,
        created_at: "2026-10-10",
        per_100g_nutrients: { calories: 63, protein: 3.5, carbohydrates: 4.8, fat: 3.2, fiber: 0, sodium: 40 },
      },
      {
        id: "food-3",
        name: "Chuối",
        serving_size_g: 120,
        is_custom: false,
        created_at: "2026-10-10",
        per_100g_nutrients: { calories: 88, protein: 1.1, carbohydrates: 23, fat: 0.3, fiber: 2.6, sodium: 1 },
      },
      {
        id: "food-4",
        name: "Cơm gạo lứt",
        serving_size_g: 150,
        is_custom: false,
        created_at: "2026-10-10",
        per_100g_nutrients: { calories: 112, protein: 2.6, carbohydrates: 24, fat: 0.9, fiber: 1.8, sodium: 2 },
      },
      {
        id: "food-5",
        name: "Thịt bò nạc",
        serving_size_g: 150,
        is_custom: false,
        created_at: "2026-10-10",
        per_100g_nutrients: { calories: 213, protein: 26, carbohydrates: 0, fat: 12, fiber: 0, sodium: 70 },
      },
      {
        id: "food-6",
        name: "Chà là",
        serving_size_g: 30,
        is_custom: false,
        created_at: "2026-10-10",
        per_100g_nutrients: { calories: 280, protein: 2.5, carbohydrates: 75, fat: 0.4, fiber: 8, sodium: 2 },
      },
      {
        id: "food-7",
        name: "Bột củ dền",
        serving_size_g: 3,
        is_custom: false,
        created_at: "2026-10-10",
        per_100g_nutrients: { calories: 333, protein: 12, carbohydrates: 65, fat: 1, fiber: 20, sodium: 250 },
      },
    ];

    if (!query) return mockFoods;
    const q = query.toLowerCase();
    return mockFoods.filter((f) => f.name.toLowerCase().includes(q));
  },

  async createCustomFood(food: Partial<Food>): Promise<Food> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/foods/custom`, {
        method: "POST",
        headers,
        body: JSON.stringify(food),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch {
      // Fallback
    }

    return {
      id: `custom-${Date.now()}`,
      name: food.name || "Món tuỳ chỉnh",
      serving_size_g: food.serving_size_g || 100,
      per_100g_nutrients: food.per_100g_nutrients || { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sodium: 0 },
      is_custom: true,
      created_at: new Date().toISOString(),
    };
  },
};
