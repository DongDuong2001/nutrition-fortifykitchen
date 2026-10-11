import { createClient } from "./supabase-client";
import {
  SAMPLE_DAY,
  type MockDayData,
  type MockMeal,
  type MockMacroStat,
  type MockMicroStat,
} from "./mock/sample-day";
import { calculateTargets } from "./targets";
import { MOCK_FOODS, type FoodItem } from "./mock/foods";
import { searchFoods as searchMockFoods } from "./search";
import type { SetupProfile } from "./onboarding";

export * from "./nutrients";
export * from "./mock/foods";
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
    const targets = calculateTargets({
      weightKg: 65,
      goal: "maintain",
      trainingMinutes: 60,
      sex: "male",
    });

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
        calories: targets.calories.min,
        protein: targets.protein.min,
        carbohydrates: targets.carbs.min,
        fat: targets.fat.min,
        fiber: targets.fiber.min,
        sodium: targets.sodium.min,
        potassium: targets.potassium.min,
        calcium: targets.calcium.min,
        magnesium: targets.magnesium.min,
        iron: targets.iron.min,
        zinc: targets.zinc.min,
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

  async searchFoods(query = ""): Promise<FoodItem[]> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/foods?q=${encodeURIComponent(query)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch {
      // Fallback
    }

    return searchMockFoods(MOCK_FOODS, query);
  },

  async getFood(id: string): Promise<FoodItem | null> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/foods/${encodeURIComponent(id)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
    } catch {
      // Fallback
    }

    return MOCK_FOODS.find((f) => f.id === id) || null;
  },

  async createFood(input: {
    nameVi: string;
    servingUnit: string;
    servingSize: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    micros?: {
      sodium?: number;
      calcium?: number;
      iron?: number;
      potassium?: number;
      vitamin_d?: number;
    };
  }): Promise<FoodItem> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/foods`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
    } catch {
      // Fallback
    }

    const factor = input.servingSize > 0 ? 100 / input.servingSize : 1;
    const newFood: FoodItem = {
      id: `custom-${Date.now()}`,
      nameVi: input.nameVi,
      source: "user",
      servings: [
        { label: `${input.servingSize} ${input.servingUnit}`, grams: input.servingSize },
        { label: "100 g", grams: 100 },
      ],
      nutrients: {
        energy: Math.round(input.calories * factor),
        protein: Math.round(input.protein * factor * 10) / 10,
        carbs: Math.round(input.carbs * factor * 10) / 10,
        fat: Math.round(input.fat * factor * 10) / 10,
        sodium: input.micros?.sodium ? Math.round(input.micros.sodium * factor) : null,
        calcium: input.micros?.calcium ? Math.round(input.micros.calcium * factor) : null,
        iron: input.micros?.iron ? Math.round(input.micros.iron * factor * 10) / 10 : null,
        potassium: input.micros?.potassium ? Math.round(input.micros.potassium * factor) : null,
        vitamin_d: input.micros?.vitamin_d ? Math.round(input.micros.vitamin_d * factor * 10) / 10 : null,
      },
    };
    MOCK_FOODS.unshift(newFood);
    return newFood;
  },

  async addEntry(payload: {
    foodId: string;
    grams: number;
    mealSlot: string;
    date?: string;
  }): Promise<{ success: boolean; id: string }> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/diary/entries`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || { success: true, id: `entry-${Date.now()}` };
      }
    } catch {
      // Fallback
    }
    return { success: true, id: `entry-${Date.now()}` };
  },

  // Mock auth and onboarding. Nothing is sent anywhere yet; swap these bodies for
  // Supabase magic links and Dong's profile endpoint once the backend is ready.
  async requestMagicLink(email: string): Promise<{ ok: true }> {
    void email;
    return { ok: true };
  },

  async signInWithGoogle(): Promise<{ ok: true }> {
    return { ok: true };
  },

  async saveSetup(profile: SetupProfile): Promise<{ ok: true }> {
    void profile;
    return { ok: true };
  },
};

