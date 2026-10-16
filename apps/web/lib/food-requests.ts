import { accountStorage } from "./storage-keys";

/**
 * "Gửi yêu cầu thêm món": the ingredient a user could not find. In mock and demo mode the request is kept in this
 * browser only (live mode hides the button until the API has POST /food-requests, see OPEN_QUESTIONS).
 */
export const FOOD_REQUESTS_KEY = "h1t_food_requests_v1";

export interface FoodRequest {
  name: string;
  at: string;
}

export function readFoodRequests(): FoodRequest[] {
  try {
    const parsed: unknown = JSON.parse(accountStorage()?.getItem(FOOD_REQUESTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((r): r is FoodRequest => typeof r?.name === "string" && typeof r?.at === "string") : [];
  } catch {
    return [];
  }
}

/** Stores one request. A blank name or a repeat of one already stored (same name, any case) is not stored twice. */
export function saveFoodRequest(name: string, now: Date = new Date()): "saved" | "duplicate" | "blank" | "failed" {
  const clean = name.trim();
  if (!clean) return "blank";
  const all = readFoodRequests();
  if (all.some((r) => r.name.toLocaleLowerCase("vi-VN") === clean.toLocaleLowerCase("vi-VN"))) return "duplicate";
  try {
    const storage = accountStorage();
    if (!storage) return "failed";
    storage.setItem(FOOD_REQUESTS_KEY, JSON.stringify([...all, { name: clean, at: now.toISOString() }]));
    return "saved";
  } catch {
    return "failed";
  }
}
