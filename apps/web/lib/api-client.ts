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
import { accountStorage } from "./storage-keys";
import {
  type CoachProfile,
  type CoachApplication,
  filterCoachesBySpecialty,
  getCoachById,
  getCoachApplications,
  submitCoachApplication,
  updateCoachApplicationStatus,
} from "./coaches";
import { type LeaderboardPeriod, type LeaderboardResponse, getMockLeaderboard, setLeaderboardOptIn as setLeaderboardOptInState } from "./leaderboard";
import { type MasteryLevelInfo, calculateMasteryLevel } from "./mastery-levels";

export * from "./nutrients";
export * from "./mock/foods";
export * from "./coaches";
export * from "./leaderboard";
export * from "./mastery-levels";
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

export interface MealSlotEntry {
  id: string;
  food_id: string | null;
  food_name: string;
  kind: string;
  meal_slot: string;
  serving_label: string;
  grams: number;
  calories: number;
  nutrients: Record<string, number | null>;
  created_at: string;
}

export interface MealSlotSummary {
  slot: string;
  name_vi: string;
  total_kcal: number;
  target_min_kcal: number;
  entries: MealSlotEntry[];
}

export interface DaySummaryResponse {
  date: string;
  training_minutes: number;
  is_read_only: boolean;
  summary: Record<string, number | null>;
  targets?: unknown;
  meals: MealSlotSummary[];
}

export interface DiaryLog {
  id: string;
  user_id: string;
  food_id: string;
  kind?: "food" | "quick";
  meal_slot: "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "preworkout" | "intraworkout" | "postworkout";
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
  meal_slot: "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "preworkout" | "intraworkout" | "postworkout";
  quantity: number;
  serving_size_g?: number;
  log_date?: string;
  calories?: number;
}

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url;
  return "http://localhost:8080/api/v1";
}

const API_BASE_URL = getApiBaseUrl();

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

/**
 * apiFetch executes authenticated requests against the Go backend API.
 * Automatically transmits HTTPOnly session cookies via credentials: "include"
 * and attaches Bearer authorization headers when available.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const authHeaders = await getAuthHeaders();
  const mergedHeaders: Record<string, string> = {
    ...(authHeaders as Record<string, string>),
    ...((init.headers as Record<string, string>) || {}),
  };

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: mergedHeaders,
    credentials: "include",
  });
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
  const storage = accountStorage();
  if (!storage) return;
  try {
    const current: OutboxItem[] = JSON.parse(storage.getItem(OUTBOX_STORAGE_KEY) || "[]");
    current.push({
      id: (payload.id as string) || `offline-${Date.now()}`,
      date,
      payload,
      createdAt: Date.now(),
    });
    storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable
  }
}

export async function syncOfflineOutbox(): Promise<number> {
  const storage = accountStorage();
  if (!storage) return 0;
  try {
    const items: OutboxItem[] = JSON.parse(storage.getItem(OUTBOX_STORAGE_KEY) || "[]");
    if (!items.length) return 0;

    const remaining: OutboxItem[] = [];
    let synced = 0;

    for (const item of items) {
      try {
        const res = await apiFetch(`/days/${item.date}/entries`, {
          method: "POST",
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

    storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(remaining));
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

  async getDay(date?: string): Promise<DaySummaryResponse> {
    const targetDate = date || new Date().toISOString().split("T")[0];
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/days/${encodeURIComponent(targetDate)}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback below
      }
    }
    return {
      date: targetDate,
      training_minutes: 60,
      is_read_only: false,
      summary: {
        calories: SAMPLE_DAY.calories.consumed,
        protein: SAMPLE_DAY.macros.find((m) => m.key === "protein")?.consumed || 62,
        carbs: SAMPLE_DAY.macros.find((m) => m.key === "carbs")?.consumed || 133,
        fat: SAMPLE_DAY.macros.find((m) => m.key === "fat")?.consumed || 21,
      },
      meals: [],
    };
  },

  async getDailyProgress(date?: string): Promise<{ progress: DailyProgress; logs: DiaryLog[] }> {
    if (isLiveMode()) {
      try {
        const targetDate = date || new Date().toISOString().split("T")[0];
        const res = await apiFetch(`/days/${encodeURIComponent(targetDate)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.meals && json.summary) {
            const logs: DiaryLog[] = [];
            for (const m of json.meals) {
              for (const e of m.entries || []) {
                logs.push({
                  id: e.id,
                  user_id: "",
                  food_id: e.food_id || "",
                  kind: e.kind,
                  meal_slot: e.meal_slot,
                  quantity: 1,
                  serving_size_g: e.grams,
                  nutrients_snapshot: e.nutrients || {},
                  log_date: json.date,
                  created_at: e.created_at,
                });
              }
            }
            const progress: DailyProgress = {
              log_date: json.date,
              total_nutrients: {
                calories: json.summary.calories || json.summary.energy || 0,
                protein: json.summary.protein || 0,
                carbohydrates: json.summary.carbs || 0,
                fat: json.summary.fat || 0,
                fiber: json.summary.fiber || 0,
                sodium: json.summary.sodium || 0,
                potassium: json.summary.potassium || 0,
                calcium: json.summary.calcium || 0,
                magnesium: json.summary.magnesium || 0,
                iron: json.summary.iron || 0,
                zinc: json.summary.zinc || 0,
              },
              logs_count: logs.length,
            };
            return { progress, logs };
          }
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
        const date = payload.log_date || new Date().toISOString().split("T")[0];
        const res = await apiFetch(`/days/${date}/entries`, {
          method: "POST",
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
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (category) params.set("category", category);
        const res = await apiFetch(`/foods?${params.toString()}`);
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
        const res = await apiFetch(`/foods/${encodeURIComponent(id)}`);
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
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    micros?: {
      sodium?: number | null;
      calcium?: number | null;
      iron?: number | null;
      potassium?: number | null;
      vitamin_d?: number | null;
    };
  }): Promise<FoodItem> {
    if (isLiveMode()) {
      try {
        const payload = {
          name_vi: input.nameVi,
          nameVi: input.nameVi,
          serving_unit: input.servingUnit,
          servingUnit: input.servingUnit,
          serving_size: input.servingSize,
          servingSize: input.servingSize,
          calories: input.calories,
          protein: input.protein,
          carbs: input.carbs,
          fat: input.fat,
          micros: input.micros,
        };
        const res = await apiFetch(`/foods/custom`, {
          method: "POST",
          body: JSON.stringify(payload),
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
        protein: input.protein != null ? Math.round(input.protein * factor * 10) / 10 : null,
        carbs: input.carbs != null ? Math.round(input.carbs * factor * 10) / 10 : null,
        fat: input.fat != null ? Math.round(input.fat * factor * 10) / 10 : null,
        sodium: input.micros?.sodium != null ? Math.round(input.micros.sodium * factor) : null,
        calcium: input.micros?.calcium != null ? Math.round(input.micros.calcium * factor) : null,
        iron: input.micros?.iron != null ? Math.round(input.micros.iron * factor * 10) / 10 : null,
        potassium: input.micros?.potassium != null ? Math.round(input.micros.potassium * factor) : null,
        vitamin_d: input.micros?.vitamin_d != null ? Math.round(input.micros.vitamin_d * factor * 10) / 10 : null,
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

    const slot = payload.mealSlot === "preworkout" ? "pre_workout" : payload.mealSlot;
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/days/${date}/entries`, {
          method: "POST",
          body: JSON.stringify({
            id: entryId,
            food_id: payload.foodId,
            grams: payload.grams,
            serving_size_g: payload.grams,
            meal_slot: slot,
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
          grams: payload.grams,
          serving_size_g: payload.grams,
          meal_slot: slot,
          kind: "food",
        });
      }
    }

    return { success: true, id: entryId };
  },

  async getTrends(days = 7, offset = 0): Promise<Record<string, unknown>> {
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/trends?days=${days}&offset=${offset}`);
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
        const res = await apiFetch(`/favourites`);
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
        const res = await apiFetch(`/favourites`, {
          method: "POST",
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
        const res = await apiFetch(`/favourites/${encodeURIComponent(foodId)}`, {
          method: "DELETE",
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
        const res = await apiFetch(`/recents`);
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
        const res = await apiFetch(`/saved-meals`);
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
        const res = await apiFetch(`/saved-meals`, {
          method: "POST",
          body: JSON.stringify({
            name,
            items: items.map((it, idx) => ({
              food_id: it.foodId,
              grams: it.grams,
              serving_size_g: it.grams,
              portion_label: "Khẩu phần",
              sort: idx,
            })),
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
        const res = await apiFetch(`/saved-meals/${encodeURIComponent(id)}`, {
          method: "DELETE",
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
        const res = await apiFetch(`/days/${date}/entries/from-saved/${encodeURIComponent(savedMealId)}?meal=${encodeURIComponent(meal)}`, {
          method: "POST",
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
        const res = await apiFetch(`/me/weight/${encodeURIComponent(date)}`, {
          method: "PUT",
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
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const res = await apiFetch(`/me/weight?${params.toString()}`);
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
        const res = await apiFetch(`/days/${encodeURIComponent(date)}/training`, {
          method: "PUT",
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
        const res = await apiFetch(`/days/${encodeURIComponent(date)}/copy-yesterday`, {
          method: "POST",
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
        const res = await apiFetch(`/days/${encodeURIComponent(date)}/meals/${encodeURIComponent(meal)}`, {
          method: "DELETE",
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
        const res = await apiFetch(`/entries/${encodeURIComponent(id)}/restore`, {
          method: "POST",
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
        await apiFetch(`/me/profile`, {
          method: "PUT",
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

  async getCoaches(specialty?: string): Promise<CoachProfile[]> {
    if (isLiveMode()) {
      try {
        const query = specialty && specialty !== "Tất cả" ? `?specialty=${encodeURIComponent(specialty)}` : "";
        const res = await apiFetch(`/coaches${query}`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) return json;
        }
      } catch {
        // Fallback
      }
    }
    return filterCoachesBySpecialty(specialty || "Tất cả");
  },

  async getCoach(id: string): Promise<CoachProfile | null> {
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/coaches/${encodeURIComponent(id)}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }
    }
    return getCoachById(id);
  },

  async getLeaderboard(period: LeaderboardPeriod = "weekly"): Promise<LeaderboardResponse> {
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/leaderboard?period=${period}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }
    }
    return getMockLeaderboard(period);
  },

  async setLeaderboardOptIn(optIn: boolean): Promise<boolean> {
    setLeaderboardOptInState(optIn);
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/me/leaderboard-opt-in`, {
          method: "PUT",
          body: JSON.stringify({ opt_in: optIn }),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
  },

  getMasteryLevel(streakDays = 0, avgMicrosAchieved = 0, isCoach = false): MasteryLevelInfo {
    return calculateMasteryLevel(streakDays, avgMicrosAchieved, isCoach);
  },

  async getCoachApplications(): Promise<CoachApplication[]> {
    return getCoachApplications();
  },

  async submitCoachApplication(data: Omit<CoachApplication, "id" | "status" | "createdAt">): Promise<CoachApplication> {
    return submitCoachApplication(data);
  },

  async updateCoachApplicationStatus(id: string, status: "approved" | "rejected"): Promise<void> {
    updateCoachApplicationStatus(id, status);
  },
};

