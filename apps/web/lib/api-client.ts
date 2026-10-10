import { createClient } from "./supabase-client";

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

  // Vitamins (4)
  vitamin_a?: number;
  vitamin_c?: number;
  vitamin_d?: number;
  vitamin_e?: number;
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
}

export const apiClient = {
  async getDailyProgress(date?: string): Promise<{ progress: DailyProgress; logs: DiaryLog[] }> {
    const headers = await getAuthHeaders();
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    const res = await fetch(`${API_BASE_URL}/diary/daily${query}`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load daily progress: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data;
  },

  async logMeal(payload: LogMealPayload): Promise<{ log: DiaryLog; today_progress: DailyProgress }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/diary/logs`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to log meal");
    }
    const json = await res.json();
    return json.data;
  },

  async searchFoods(query = ""): Promise<Food[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/foods?q=${encodeURIComponent(query)}`, { headers });
    if (!res.ok) {
      throw new Error("Failed to search foods");
    }
    const json = await res.json();
    return json.data || [];
  },

  async createCustomFood(food: Partial<Food>): Promise<Food> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/foods/custom`, {
      method: "POST",
      headers,
      body: JSON.stringify(food),
    });
    if (!res.ok) {
      throw new Error("Failed to create custom food");
    }
    const json = await res.json();
    return json.data;
  },
};
