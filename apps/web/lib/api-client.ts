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
  name_vi?: string;
  serving_size_g: number;
  per_100g_nutrients: NutrientValues;
  is_custom: boolean;
  category?: string;
  source?: string;
  source_id?: string;
  created_by?: string;
  created_at: string;
}

export interface DiaryLog {
  id: string;
  user_id: string;
  food_id: string;
  kind?: "food" | "quick";
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
  kind?: "food" | "quick";
  meal_slot: "breakfast" | "lunch" | "dinner" | "snack" | "preworkout" | "intraworkout" | "postworkout";
  quantity: number;
  serving_size_g?: number;
  log_date?: string;
  calories?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

/** Returns true only when configured to call the live Go backend. Default is mock. */
export function isLiveMode(): boolean {
  return process.env.NEXT_PUBLIC_API_MODE === "live";
}

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

// Offline queue for idempotent replay
const OUTBOX_STORAGE_KEY = "h1t_offline_outbox";

interface OutboxItem {
  id: string;
  date: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export function enqueueOfflineEntry(date: string, payload: Record<string, unknown>): void {
  try {
    const current: OutboxItem[] = JSON.parse(globalThis.localStorage?.getItem(OUTBOX_STORAGE_KEY) || "[]");
    current.push({
      id: (payload.id as string) || `offline-${Date.now()}`,
      date,
      payload,
      createdAt: Date.now(),
    });
    globalThis.localStorage?.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable
  }
}

export async function syncOfflineOutbox(): Promise<number> {
  try {
    const items: OutboxItem[] = JSON.parse(globalThis.localStorage?.getItem(OUTBOX_STORAGE_KEY) || "[]");
    if (!items.length) return 0;

    const headers = await getAuthHeaders();
    const remaining: OutboxItem[] = [];
    let synced = 0;

    for (const item of items) {
      try {
        const res = await fetch(`${API_BASE_URL}/days/${item.date}/entries`, {
          method: "POST",
          headers,
          body: JSON.stringify(item.payload),
        });
        if (res.ok || res.status === 409) {
          synced++;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    globalThis.localStorage?.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(remaining));
    return synced;
  } catch {
    return 0;
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
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const targetDate = date || new Date().toISOString().split("T")[0];
        const res = await fetch(`${API_BASE_URL}/days/${encodeURIComponent(targetDate)}`, { headers });
        if (res.ok) {
          const json = await res.json();
          return json;
        }
      } catch {
        // Fallback to mock on transport failure
      }
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
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const date = payload.log_date || new Date().toISOString().split("T")[0];
        const res = await fetch(`${API_BASE_URL}/days/${date}/entries`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          return json;
        }
      } catch {
        enqueueOfflineEntry(payload.log_date || new Date().toISOString().split("T")[0], payload as unknown as Record<string, unknown>);
      }
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

  async searchFoods(query = "", category?: string): Promise<FoodItem[]> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (category) params.set("category", category);
        const res = await fetch(`${API_BASE_URL}/foods?${params.toString()}`, { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.items && Array.isArray(json.items)) {
            return json.items;
          }
        }
      } catch {
        // Fallback
      }
    }

    const filtered = category ? MOCK_FOODS.filter((f) => f.category === category) : MOCK_FOODS;
    return searchMockFoods(filtered, query);
  },

  async getFood(id: string): Promise<FoodItem | null> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/foods/${encodeURIComponent(id)}`, { headers });
        if (res.ok) {
          const json = await res.json();
          return json;
        }
      } catch {
        // Fallback
      }
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
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/foods/custom`, {
          method: "POST",
          headers,
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const json = await res.json();
          return json;
        }
      } catch {
        // Fallback
      }
    }

    const factor = input.servingSize > 0 ? 100 / input.servingSize : 1;
    const newFood: FoodItem = {
      id: `custom-${Date.now()}`,
      nameVi: input.nameVi,
      category: "cua_toi",
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
    id?: string;
  }): Promise<{ success: boolean; id: string }> {
    const entryId = payload.id || `entry-${Date.now()}`;
    const date = payload.date || new Date().toISOString().split("T")[0];

    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/days/${date}/entries`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: entryId,
            food_id: payload.foodId,
            serving_size_g: payload.grams,
            meal_slot: payload.mealSlot,
            kind: "food",
          }),
        });
        if (res.ok) {
          const json = await res.json();
          return { success: true, id: json.id || entryId };
        }
      } catch {
        enqueueOfflineEntry(date, {
          id: entryId,
          food_id: payload.foodId,
          serving_size_g: payload.grams,
          meal_slot: payload.mealSlot,
          kind: "food",
        });
      }
    }

    return { success: true, id: entryId };
  },

  async getTrends(days = 7, offset = 0): Promise<Record<string, unknown>> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/trends?days=${days}&offset=${offset}`, { headers });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }
    }
    return {};
  },

  async getFavourites(): Promise<FoodItem[]> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/favourites`, { headers });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }
    }
    return [];
  },

  async addFavourite(foodId: string): Promise<boolean> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/favourites`, {
          method: "POST",
          headers,
          body: JSON.stringify({ food_id: foodId }),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
  },

  async removeFavourite(foodId: string): Promise<boolean> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/favourites/${encodeURIComponent(foodId)}`, {
          method: "DELETE",
          headers,
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
  },

  async getRecents(): Promise<FoodItem[]> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/recents`, { headers });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }
    }
    return [];
  },

  async getSavedMeals(): Promise<Array<{ id: string; name: string; items: unknown[] }>> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/saved-meals`, { headers });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }
    }
    return [];
  },

  async createSavedMeal(name: string, items: Array<{ foodId: string; grams: number }>): Promise<{ id: string }> {
    const id = `saved-meal-${Date.now()}`;
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/saved-meals`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name,
            items: items.map((it) => ({ food_id: it.foodId, serving_size_g: it.grams })),
          }),
        });
        if (res.ok) {
          const json = await res.json();
          return { id: json.id || id };
        }
      } catch {
        // Fallback
      }
    }
    return { id };
  },

  async deleteSavedMeal(id: string): Promise<boolean> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/saved-meals/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers,
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
  },

  async logSavedMeal(date: string, savedMealId: string, meal: string): Promise<boolean> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/days/${date}/entries/from-saved/${encodeURIComponent(savedMealId)}?meal=${encodeURIComponent(meal)}`, {
          method: "POST",
          headers,
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
  },

  async updateWeight(date: string, weightKg: number): Promise<boolean> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/me/weight/${encodeURIComponent(date)}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ weight_kg: weightKg }),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
  },

  async getWeightLogs(from?: string, to?: string): Promise<Array<{ log_date: string; weight_kg: number }>> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const res = await fetch(`${API_BASE_URL}/me/weight?${params.toString()}`, { headers });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }
    }
    return [];
  },

  async setTraining(date: string, minutes: number): Promise<boolean> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/days/${encodeURIComponent(date)}/training`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ minutes }),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
  },

  async copyYesterday(date: string): Promise<boolean> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/days/${encodeURIComponent(date)}/copy-yesterday`, {
          method: "POST",
          headers,
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
  },

  async deleteMeal(date: string, meal: string): Promise<boolean> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/days/${encodeURIComponent(date)}/meals/${encodeURIComponent(meal)}`, {
          method: "DELETE",
          headers,
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
  },

  async restoreEntry(id: string): Promise<boolean> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/entries/${encodeURIComponent(id)}/restore`, {
          method: "POST",
          headers,
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
  },

  async requestMagicLink(email: string): Promise<{ ok: true }> {
    void email;
    return { ok: true };
  },

  async signInWithGoogle(): Promise<{ ok: true }> {
    return { ok: true };
  },

  async saveSetup(profile: SetupProfile): Promise<{ ok: true }> {
    if (isLiveMode()) {
      try {
        const headers = await getAuthHeaders();
        await fetch(`${API_BASE_URL}/me/profile`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            sex: profile.sex,
            birth_year: profile.birthYear,
            weight_kg: profile.weightKg,
            goal: profile.goal,
          }),
        });
      } catch {
        // Fallback
      }
    }
    return { ok: true };
  },
};
