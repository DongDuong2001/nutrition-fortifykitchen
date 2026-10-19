import { getTodayIsoVN } from "./date";
import {
  SAMPLE_DAY,
  type MockDayData,
  type MockMeal,
  type MockMacroStat,
  type MockMicroStat,
} from "./mock/sample-day";
import { calculateTargets } from "./targets";
import { MOCK_FOODS, addCatalogFood, catalogChanged, setCatalogFoods, setCatalogStatus, type FoodItem } from "./mock/foods";
import { searchFoods as searchMockFoods } from "./search";
import type { SetupProfile } from "./onboarding";
import { currentAccountId } from "./auth-actions";
import { yieldToMain } from "./idle";
import type { OutboxItem } from "./outbox";
import { isDemo } from "./demo";
import { type CoachProfile, filterCoachesBySpecialty, getCoachById } from "./coaches";
import { type LeaderboardPeriod, type LeaderboardResponse, getMockLeaderboard, setLeaderboardOptIn as setLeaderboardOptInState } from "./leaderboard";
import { readStoredProfile, type Profile } from "./profile";
import { shiftIsoDate } from "./day-history";
import { generateUuid, isUuid } from "./uuid";
import { refreshServerSession } from "./server-session";
import { reportClientError } from "./client-errors";
// The device's copy of the catalogue (and IndexedDB behind it) is loaded when the catalogue is read or written, not with the page
const catalogCache = () => import("./catalog-cache");
import { normaliseCoaching } from "./coaching-link";
import { isRecipeId } from "./recipe";
import type { GoalType, SexType } from "./targets";

export * from "./nutrients";
export * from "./mock/foods";
export * from "./coaches";
export * from "./leaderboard";
export type { MockDayData, MockMeal, MockMacroStat, MockMicroStat };

export function mapApiFoodToFoodItem(raw: any): FoodItem {
  if (!raw) return raw;
  const nameVi = raw.nameVi || raw.name_vi || raw.name || "Món ăn";
  const servings = Array.isArray(raw.servings) && raw.servings.length > 0
    ? raw.servings.map((s: any) => ({
        label: s.label || s.label_vi || `${s.grams || 100} g`,
        grams: Number(s.grams) || 100,
        display: s.display,
      }))
    : [{ label: "100 g", grams: 100 }];

  const rawNutrients = raw.nutrients || raw.per_100g_nutrients || {};
  const nutrients: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(rawNutrients)) {
    nutrients[k] = v != null ? Number(v) : null;
  }
  if (nutrients.energy == null && nutrients.calories != null) {
    nutrients.energy = nutrients.calories;
  }

  return {
    id: String(raw.id),
    nameVi,
    category: raw.category || "khac",
    brand: raw.brand,
    source: raw.source || "user",
    sourceId: raw.source_id ?? raw.sourceId,
    servings,
    tipVi: raw.tipVi || raw.tip_vi,
    nutrients,
    match: raw.match,
    sourceRef: raw.sourceRef,
    recipe: mapApiRecipe(raw.recipe),
  };
}

/** The API's `recipe` ({ ingredients: [{ food_id, name_vi, grams }], cooked_g }); anything else is no recipe. */
function mapApiRecipe(raw: any): FoodItem["recipe"] {
  if (!raw || !Array.isArray(raw.ingredients)) return undefined;
  const ingredients = raw.ingredients
    .filter((i: any) => i && (i.food_id || i.foodId) && Number(i.grams) > 0)
    .map((i: any) => ({ foodId: String(i.food_id ?? i.foodId), name: String(i.name_vi ?? i.name ?? ""), grams: Number(i.grams) }));
  if (ingredients.length === 0) return undefined;
  const cooked = Number(raw.cooked_g ?? raw.cookedGrams);
  return { ingredients, cookedGrams: cooked > 0 ? cooked : null };
}

export function mapApiProfileToProfile(raw: any): Profile {
  const data = raw.data ?? raw;
  const sex: SexType = data.sex === "female" ? "female" : "male";
  const goal: GoalType = ["build", "maintain", "cut", "deep_cut"].includes(data.goal) ? data.goal : "maintain";
  return {
    sex,
    birthYear: Number(data.birth_year ?? data.birthYear) || 2000,
    weightKg: Number(data.weight_kg ?? data.weightKg) || 60,
    goal,
    periodMode: Boolean(data.near_period ?? data.nearPeriod ?? data.periodMode),
    trainingMinutesDefault: Number(data.training_minutes_default ?? data.trainingMinutesDefault) || 60,
    displayName: data.display_name ?? data.displayName ?? "",
    trainingPrefs: data.training_prefs ?? data.trainingPrefs ?? undefined,
    ...normaliseCoaching(data),
  };
}

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
  training_minutes: number | null;
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

/**
 * POST /foods/custom: the values of one serving of `servingSize` (the server stores them per 100 g). `micros` takes
 * any canonical nutrient key (fiber and the 22 micros); null is unknown.
 */
export interface CreateFoodInput {
  nameVi: string;
  servingUnit: string;
  servingSize: number;
  calories: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  micros?: Record<string, number | null | undefined>;
}

/** Thrown by searchFoods in live mode when /foods did not answer. */
export const FOODS_UNAVAILABLE = "foods_unavailable";

// The whole catalogue, kept for a while so a repeat visit does not page /foods again
const FOODS_PAGE_LIMIT = 500;
const FOODS_MAX_PAGES = 30;
let foodsInFlight: Promise<FoodItem[]> | null = null;

/**
 * The catalogue: the device's copy when there is one (lib/catalog-cache: fresh 10 min, then shown and refreshed in the
 * background up to 24 h), else every page of /foods.
 */
async function fetchAllFoods(): Promise<FoodItem[]> {
  const account = currentAccountId();
  const { readCatalogCache, catalogCacheState } = await catalogCache();
  const saved = await readCatalogCache(account);
  const state = catalogCacheState(saved?.at ?? null, Date.now());
  if (saved && (state === "fresh" || state === "stale")) {
    setCatalogFoods(saved.foods);
    setCatalogStatus("ready");
    if (state === "stale") void downloadCatalog(account, true).catch(() => {});
    return saved.foods;
  }
  try {
    return await downloadCatalog(account, false);
  } catch (error) {
    // Offline (or the API is down) with a copy older than 24 h: an old list beats no list, search keeps working
    if (!saved) throw error;
    setCatalogFoods(saved.foods);
    setCatalogStatus("ready");
    return saved.foods;
  }
}

/** One page of /foods: its foods and the catalogue total, or null when the call or the shape is not right. */
async function fetchFoodsPage(page: number): Promise<{ items: unknown[]; total: number } | null> {
  const res = await apiFetch(`/foods?limit=${FOODS_PAGE_LIMIT}&page=${page}`);
  if (!res.ok) return null;
  const json = await res.json();
  const payload = json.data ?? json;
  const items = payload.items ?? (Array.isArray(payload) ? payload : null);
  if (!Array.isArray(items)) return null;
  return { items, total: Number(payload.total) };
}

/** Pages loading at once after the first (cc-58). */
const FOODS_PAGES_IN_FLIGHT = 4;

/**
 * Every page of /foods. Page 1 says how many there are; the rest are fetched together (at most 4 at a time) and added in
 * page order. A background refresh changes nothing on screen until it has the whole list.
 */
async function downloadCatalog(account: string | null, background: boolean): Promise<FoodItem[]> {
  if (!background) setCatalogStatus("loading");
  const collected = new Map<string, FoodItem>();
  let complete = false;
  const add = async (items: unknown[]) => {
    // The mapping of thousands of rows goes in slices, so a tap between two of them is not held up
    for (let i = 0; i < items.length; i++) {
      const food = mapApiFoodToFoodItem(items[i]);
      collected.set(food.id, food);
      if (i % 250 === 249) await yieldToMain();
    }
  };
  try {
    const first = await fetchFoodsPage(1);
    if (first) {
      await add(first.items);
      if (first.total > 0 ? collected.size >= first.total : first.items.length === 0) {
        complete = true;
      } else if (first.items.length > 0 && first.total > 0) {
        // The server may cap a page below the limit asked for: the size that really came says how many pages there are
        const pages = Math.min(FOODS_MAX_PAGES, Math.ceil(first.total / first.items.length));
        const loaded: Array<{ items: unknown[] } | null> = new Array(pages + 1).fill(null);
        let next = 2;
        const worker = async () => {
          while (next <= pages) {
            const page = next++;
            try {
              loaded[page] = await fetchFoodsPage(page);
            } catch {
              loaded[page] = null;
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(FOODS_PAGES_IN_FLIGHT, pages - 1) }, worker));
        // In page order, up to the first page that did not come: a short list is kept, as before
        for (let page = 2; page <= pages; page++) {
          const got = loaded[page];
          if (!got || got.items.length === 0) break;
          await add(got.items);
        }
        // Pages that came short leave a gap: the rest is read one after the other, as before
        for (let page = pages + 1; collected.size < first.total && page <= FOODS_MAX_PAGES; page++) {
          const got = await fetchFoodsPage(page);
          if (!got || got.items.length === 0) break;
          await add(got.items);
        }
        complete = collected.size >= first.total;
      } else if (first.items.length > 0) {
        // No total: the pages are read one after the other until one is empty
        for (let page = 2; page <= FOODS_MAX_PAGES; page++) {
          const got = await fetchFoodsPage(page);
          if (!got) break;
          if (got.items.length === 0) {
            complete = true;
            break;
          }
          await add(got.items);
        }
      }
    }
  } catch {
    // Keep what loaded
  }

  const foods = Array.from(collected.values());
  if (background) {
    if (!complete) throw new Error("Catalogue refresh incomplete");
  } else if (foods.length === 0) {
    setCatalogStatus("failed");
    throw new Error("Chưa tải được danh mục món ăn");
  }
  setCatalogFoods(foods);
  setCatalogStatus("ready");
  if (complete) void catalogCache().then((c) => c.writeCatalogCache(account, foods));
  return foods;
}

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url;
  if (typeof window !== "undefined" && isLiveMode()) {
    return "/api/v1";
  }
  return "http://localhost:8080/api/v1";
}

const API_BASE_URL = getApiBaseUrl();

/** Returns true only when configured to call the live Go backend. Default is mock. */
export function isLiveMode(): boolean {
  return process.env.NEXT_PUBLIC_API_MODE === "live";
}

// The API reads the session from the httpOnly sb-access-token cookie that middleware.ts and the auth callback set
// (credentials: "include" below sends it). No script in the browser reads or forwards the access token.
const JSON_HEADERS: Record<string, string> = { "Content-Type": "application/json" };

/**
 * apiFetch executes authenticated requests against the Go backend API.
 * Sends the httpOnly session cookie via credentials: "include"; there is no Authorization header.
 * A 401 in the browser means the cookie expired: /auth/session renews it (refreshServerSession) and the request is
 * sent once more, unless another account signed in meanwhile. A second 401 is returned as it is.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const mergedHeaders: Record<string, string> = {
    ...JSON_HEADERS,
    ...((init.headers as Record<string, string>) || {}),
  };
  const send = () =>
    fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: mergedHeaders,
      credentials: "include",
    });

  const account = currentAccountId();
  const res = await send();
  if (res.status !== 401 || typeof window === "undefined") return res;
  await refreshServerSession();
  // Another account signed in meanwhile: its cookie must not carry this request. The 401 stands (a diary write then
  // counts it as "retry" and goes back to the outbox of the account it belongs to).
  if (currentAccountId() !== account) return res;
  return send();
}

// Diary writes and the outbox (cc-68: write-ahead). Every write is committed to the outbox (lib/outbox: IndexedDB, one
// record per write) BEFORE its request goes out, marked "sending"; it leaves the outbox when the server has it. A write
// that did not reach the server is never dropped: it waits there to be sent again on the next sync. The outbox belongs
// to the account that was signed in when the write was made (the scope is taken at that moment), never another's.

/**
 * The server saved it, it waits in the outbox to be sent again, the server refused it (a 4xx) and it waits for Thử lại,
 * or "local": it can never reach the server (a food the server has no row for, a recipe made in the app) and stays on
 * this device only (review 05:30 M1).
 */
export type WriteState = "saved" | "queued" | "held" | "local";

export interface WriteResult {
  state: WriteState;
  /** The answer's status (0 = no answer) and the server's message, for a held write. */
  status?: number;
  message?: string;
  /** Held for good (409 PAST_DAY_READ_ONLY on a day beyond the editable window): never sent again, not even by Thử lại. */
  final?: boolean;
}

/** The server's code for a write to a day that has passed: sending it again can never work (beyond the editable window). */
export const PAST_DAY_READ_ONLY = "PAST_DAY_READ_ONLY";

/** What a diary write's answer means. 0 = no answer (offline, or the request failed). */
export function writeOutcome(status: number, method: string): "saved" | "retry" | "held" {
  if (status === 0 || status === 401 || status === 408 || status === 429 || status >= 500) return "retry";
  if (status >= 200 && status < 300) return "saved";
  // Deleted already (here or on another device)
  if (status === 404 && method === "DELETE") return "saved";
  return "held";
}

export type { OutboxItem } from "./outbox";

/** A write refused for good (held.final) is kept this long, then dropped so the outbox does not grow without end. */
export const FINAL_OUTBOX_KEEP_MS = 7 * 24 * 60 * 60 * 1000;

/** The outbox without the writes refused for good more than FINAL_OUTBOX_KEEP_MS ago (by createdAt). */
export function pruneOutbox<T extends Pick<OutboxItem, "createdAt" | "held">>(items: T[], now: number): T[] {
  return items.filter((item) => !(item.held?.final && now - item.createdAt > FINAL_OUTBOX_KEEP_MS));
}

export async function serverAnswer(res: Response): Promise<{ message: string; code: string }> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return { message: String(json?.error?.message ?? json?.message ?? json?.error ?? text), code: String(json?.error?.code ?? "") };
    } catch {
      return { message: text, code: "" };
    }
  } catch {
    return { message: "", code: "" };
  }
}

/** Diary requests give up after this: a request a phone froze in the background must not hold the outbox or a refetch. */
export const DIARY_REQUEST_MS = 20 * 1000;
export const diaryTimeout = (): AbortSignal | undefined =>
  typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(DIARY_REQUEST_MS) : undefined;

export interface SyncResult {
  /** Entries whose add or edit the server has now (a delete is not listed). */
  saved: string[];
  /** Writes the server refused in this run, with its answer (`final`: refused for good, now and never sent again). */
  held: Array<{ id: string; status: number; message: string; date: string; final: boolean }>;
}


// The sending side of the outbox (lib/sync-engine, with lib/outbox and IndexedDB behind it) is loaded after the first
// paint: the diary provider asks for it on mount, and the first write or sync loads it if it is not there yet. These
// are its front. The reads the screens make while rendering answer "nothing waiting" until it is loaded, which is true:
// nothing can be sent or queued by this page life before it is.
type Engine = typeof import("./sync-engine");
let engine: Engine | null = null;
let engineLoading: Promise<Engine> | null = null;

export function loadSyncEngine(): Promise<Engine> {
  engineLoading ??= import("./sync-engine").then((loaded) => (engine = loaded));
  return engineLoading;
}

/** Runs `use` with the engine: at once when it is loaded (a write is registered in the same tick), else after it loads. */
function withEngine<T>(use: (loaded: Engine) => T | Promise<T>): Promise<T> {
  return engine ? Promise.resolve(use(engine)) : loadSyncEngine().then(use);
}

/** The diary's list could not be written (no room, storage blocked): the lasting banner goes up. */
export function reportStorageFailure(error: unknown): void {
  void loadSyncEngine().then((loaded) => loaded.storageFailed(error));
}

/** A write of the diary's list worked again: the banner of a full disk goes down. */
export function reportStorageWorked(): void {
  void loadSyncEngine().then((loaded) => loaded.storageWorked());
}

/** The function that folds a day read from the server into the diary's list (lazy: only a sync needs it). */
export const loadServerDay = () => withEngine((e) => e.applyServerDay);

/** Starts reading the account's outbox from disk (and moves the old localStorage array over). Call when an account loads. */
export const loadOfflineOutbox = (): Promise<void> => withEngine((e) => e.loadOfflineOutbox());

/**
 * Sends the outbox in order, one run at a time. A write that fails again stays, and the later writes of its entry wait
 * behind it; no answer at all ends the run (offline). Held writes are sent only with `retryHeld` (Thử lại). Only one
 * tab drains at a time.
 */
export const syncOfflineOutbox = (options: { retryHeld?: boolean } = {}): Promise<SyncResult> => withEngine((e) => e.syncOfflineOutbox(options));

/** Entry ids with a write in the outbox for the active account. */
export const getPendingOfflineEntryIds = (): string[] => engine?.getPendingOfflineEntryIds() ?? [];
/** Entry ids a refetch must leave as they are on the device: a write is queued or being sent. */
export const pendingWriteIds = (): Set<string> => engine?.pendingWriteIds() ?? new Set<string>();
/** Entry ids whose last write started at or after `time` (ms). */
export const writtenSince = (time: number): string[] => engine?.writtenSince(time) ?? [];
/** How many diary writes are being sent now. */
export const writesInFlight = (): number => engine?.writesInFlight() ?? 0;
/** Whether a side write (profile, weight, favourite, training) is waiting: a server copy read now must not replace it. */
export const hasPendingWrite = (entity: string): boolean => engine?.hasPendingWrite(entity) ?? false;
/** The favourites changes waiting to be sent, oldest first: [foodId, on]. Applied on top of a list read from the server. */
export const pendingFavouriteOps = (): Array<[string, boolean]> => engine?.pendingFavouriteOps() ?? [];

/** Runs `onChange` when the outbox changes, here or in another tab (the screens' "Chưa lưu" markers follow it). */
export function watchOutbox(onChange: () => void): () => void {
  let stop = () => {};
  let stopped = false;
  void loadSyncEngine().then((loaded) => {
    if (!stopped) stop = loaded.watchOutbox(onChange);
  });
  return () => {
    stopped = true;
    stop();
  };
}

/** Queues an add to send later (kept for callers from before cc-49; diary writes queue themselves). */
export function enqueueOfflineEntry(date: string, payload: Record<string, unknown>): void {
  void withEngine((e) => e.enqueueOfflineEntry(date, payload));
}

/** Removes every queued write of an entry (an entry that never reached the server, deleted or undone). */
export function dropOfflineEntry(id: string): void {
  void withEngine((e) => e.dropOfflineEntry(id));
}

/**
 * Points `account`'s queued writes that name food `from` (a recipe's local id) at `to` (its server food), and lifts
 * their hold (the server refused the local id), so the next sync sends them. A write held for good stays held.
 */
export function repointOutboxFood(from: string, to: string, account: string | null): number {
  return engine?.repointOutboxFood(from, to, account) ?? 0;
}

/** For tests: forgets the writes this page life had in the air (a page that was killed has none). */
export function resetWriteMemory(): void {
  engine?.resetWriteMemory();
}

/** The body of PUT /me/profile. */
function profileBody(profile: SetupProfile): Record<string, unknown> {
  return {
    sex: profile.sex,
    birth_year: profile.birthYear,
    weight_kg: profile.weightKg,
    goal: profile.goal,
    ...(profile.nearPeriod !== undefined || profile.periodMode !== undefined ? { near_period: Boolean(profile.nearPeriod ?? profile.periodMode) } : {}),
    ...(profile.trainingMinutesDefault !== undefined ? { training_minutes_default: profile.trainingMinutesDefault } : {}),
    // The display name travels with the profile save
    ...(profile.displayName ? { display_name: profile.displayName } : {}),
  };
}

export const apiClient = {
  /**
   * Get the complete typed day data matching design/SPEC.md
   * (Backed by typed mock until backend API is ready)
   */
  async getTodayData(): Promise<MockDayData> {
    return Promise.resolve(SAMPLE_DAY);
  },

  /** The day as the server has it. Null in live mode when it could not be read: never an empty day, which a refetch would take for "everything was deleted". */
  async getDay(date?: string): Promise<DaySummaryResponse | null> {
    const targetDate = date || getTodayIsoVN();
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/days/${encodeURIComponent(targetDate)}`, { signal: diaryTimeout() });
        if (res.ok) {
          const json = await res.json();
          return json.data ?? json;
        }
        reportClientError({ kind: "sync", method: "GET", path: `/days/${targetDate}`, status: res.status, message: (await serverAnswer(res)).message });
      } catch {
        // No answer (or no answer within DIARY_REQUEST_MS)
      }
      return null;
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
        const targetDate = date || getTodayIsoVN();
        const res = await apiFetch(`/days/${encodeURIComponent(targetDate)}`);
        if (res.ok) {
          const json = await res.json();
          const dayData = json.data ?? json;
          if (dayData.meals && dayData.summary) {
            const logs: DiaryLog[] = [];
            for (const m of dayData.meals) {
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
                  log_date: dayData.date,
                  created_at: e.created_at,
                });
              }
            }
            const progress: DailyProgress = {
              log_date: dayData.date,
              total_nutrients: {
                calories: dayData.summary.calories || dayData.summary.energy || 0,
                protein: dayData.summary.protein || 0,
                carbohydrates: dayData.summary.carbs || 0,
                fat: dayData.summary.fat || 0,
                fiber: dayData.summary.fiber || 0,
                sodium: dayData.summary.sodium || 0,
                potassium: dayData.summary.potassium || 0,
                calcium: dayData.summary.calcium || 0,
                magnesium: dayData.summary.magnesium || 0,
                iron: dayData.summary.iron || 0,
                zinc: dayData.summary.zinc || 0,
              },
              logs_count: logs.length,
            };
            return { progress, logs };
          }
          return dayData;
        }
      } catch {
        // Fallback to mock on transport failure
      }
      return {
        progress: {
          log_date: date || getTodayIsoVN(),
          total_nutrients: {
            calories: 0,
            protein: 0,
            carbohydrates: 0,
            fat: 0,
            fiber: 0,
            sodium: 0,
            potassium: 0,
            calcium: 0,
            magnesium: 0,
            iron: 0,
            zinc: 0,
          },
          logs_count: 0,
        },
        logs: [],
      };
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
        const date = payload.log_date || getTodayIsoVN();
        const res = await apiFetch(`/days/${date}/entries`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          return json.data ?? json;
        }
      } catch {
        enqueueOfflineEntry(payload.log_date || getTodayIsoVN(), payload as unknown as Record<string, unknown>);
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

  async searchFoods(query = "", category?: string, limit = 500): Promise<FoodItem[]> {
    if (isLiveMode()) {
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (category) params.set("category", category);
        if (limit) params.set("limit", String(limit));
        const res = await apiFetch(`/foods?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          const payload = json.data ?? json;
          const items = payload.items ?? (Array.isArray(payload) ? payload : []);
          if (Array.isArray(items)) {
            const mapped = items.map(mapApiFoodToFoodItem);
            setCatalogFoods(mapped);
            return mapped;
          }
        }
      } catch {
        // Falls through to the error below
      }
      // Live mode never answers with the sample foods: the caller shows an error with Thử lại
      throw new Error(FOODS_UNAVAILABLE);
    }

    const filtered = category ? MOCK_FOODS.filter((f) => f.category === category) : MOCK_FOODS;
    return searchMockFoods(filtered, query);
  },

  /**
   * Live mode: the whole catalogue. Asks /foods?limit=500&page=1 and goes on with the next page (same limit) while
   * fewer foods than the response's total are collected, at most 30 pages (a server that caps a page at 50 still
   * answers every page; with no total, it stops at an empty page). Everything goes to setCatalogFoods once. A page
   * that fails keeps what loaded before it; with nothing loaded it throws (the screen offers Thử lại). One load at a
   * time: a call made while one runs gets the same promise. The result is kept in sessionStorage for 10 minutes, per
   * account. Mock mode: nothing to load.
   */
  loadAllFoods(): Promise<FoodItem[]> {
    if (!isLiveMode()) return Promise.resolve(MOCK_FOODS);
    if (!foodsInFlight) {
      foodsInFlight = fetchAllFoods().finally(() => {
        foodsInFlight = null;
      });
    }
    return foodsInFlight;
  },

  async getFood(id: string): Promise<FoodItem | null> {
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/foods/${encodeURIComponent(id)}`);
        if (res.ok) {
          const json = await res.json();
          const raw = json.data ?? json;
          if (raw && (raw.name_vi || raw.nameVi)) {
            return mapApiFoodToFoodItem(raw);
          }
        }
      } catch {
        // Fallback
      }
      return null;
    }

    return MOCK_FOODS.find((f) => f.id === id) || null;
  },

  async createFood(input: CreateFoodInput): Promise<FoodItem> {
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
          const raw = json.data ?? json;
          const mapped = mapApiFoodToFoodItem(raw);
          addCatalogFood(mapped);
          void catalogCache().then((c) => c.addToCatalogCache(currentAccountId(), mapped));
          return mapped;
        }
        let msg = `Không thể tạo món (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) msg = errJson.error.message;
        } catch {}
        throw new Error(msg);
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("Không thể tạo món")) {
          throw err;
        }
        throw new Error("Lỗi kết nối khi tạo món. Vui lòng thử lại.");
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
        ...Object.fromEntries(
          Object.entries(input.micros ?? {}).map(([k, v]) => [k, typeof v === "number" ? Math.round(v * factor * 100) / 100 : null])
        ),
        energy: input.calories != null ? Math.round(input.calories * factor) : null,
        protein: input.protein != null ? Math.round(input.protein * factor * 10) / 10 : null,
        carbs: input.carbs != null ? Math.round(input.carbs * factor * 10) / 10 : null,
        fat: input.fat != null ? Math.round(input.fat * factor * 10) / 10 : null,
      },
    };
    MOCK_FOODS.unshift(newFood);
    catalogChanged();
    return newFood;
  },

  async addEntry(payload: {
    foodId?: string;
    grams?: number;
    mealSlot: string;
    date?: string;
    id?: string;
    kind?: "food" | "quick";
    calories?: number;
    /** The portion as shown ("1 viên", "150 g"): stored by the server as the entry's portion label. */
    servingLabel?: string;
  }): Promise<{ success: boolean; id: string } & WriteResult> {
    const entryId = isUuid(payload.id) ? payload.id! : generateUuid();
    const date = payload.date || getTodayIsoVN();
    const kind = payload.kind || "food";
    const slot = payload.mealSlot === "preworkout" ? "pre_workout" : payload.mealSlot;

    if (isLiveMode()) {
      const isQuick = kind === "quick";
      // A food the server has no row for (a recipe made in the app) can never be saved there: it stays on this device
      if (!isQuick && !isUuid(payload.foodId)) return { success: false, id: entryId, state: "local" };
      const body: Record<string, unknown> = {
        id: entryId,
        kind,
        meal_slot: slot,
      };
      if (isQuick) {
        // A quick entry is kcal only; an unknown value is left out so the server stores NULL (migration 000011), never 0
        if (typeof payload.calories === "number") body.calories = payload.calories;
      } else {
        body.food_id = payload.foodId;
        body.grams = payload.grams ?? 100;
        body.serving_size_g = payload.grams ?? 100;
        if (payload.servingLabel) body.serving_label = payload.servingLabel;
      }

      // The id is the client's (idempotent on the server), so a write sent again never adds the entry twice
      const result = await withEngine((e) => e.diaryWrite({ id: entryId, date, payload: body }));
      return { success: result.state === "saved", id: entryId, ...result };
    }

    return { success: true, id: entryId, state: "saved" };
  },

  async getTrends(days = 7, offset = 0): Promise<Record<string, unknown>> {
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/trends?days=${days}&offset=${offset}`);
        if (res.ok) {
          const json = await res.json();
          return (json.data ?? json) as Record<string, unknown>;
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
          const json = await res.json();
          const payload = json.data ?? json;
          const items = payload.items ?? (Array.isArray(payload) ? payload : []);
          return items.map(mapApiFoodToFoodItem);
        }
      } catch {
        // Fallback
      }
    }
    return [];
  },

  /** A favourite on or off: through the outbox (S6), so an offline tap is sent later and the last one wins. */
  async setFavourite(foodId: string, on: boolean): Promise<WriteResult> {
    if (!isLiveMode() || !isUuid(foodId)) return { state: "saved" };
    return withEngine((e) => e.sideWrite({
      kind: "favourite",
      entity: `fav:${foodId}`,
      method: on ? "POST" : "DELETE",
      path: on ? "/favourites" : `/favourites/${encodeURIComponent(foodId)}`,
      payload: { food_id: foodId },
    }));
  },

  async addFavourite(foodId: string): Promise<boolean> {
    return (await apiClient.setFavourite(foodId, true)).state !== "held";
  },

  async removeFavourite(foodId: string): Promise<boolean> {
    return (await apiClient.setFavourite(foodId, false)).state !== "held";
  },

  async getRecents(): Promise<FoodItem[]> {
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/recents`);
        if (res.ok) {
          const json = await res.json();
          const payload = json.data ?? json;
          const items = payload.items ?? (Array.isArray(payload) ? payload : []);
          return items.map(mapApiFoodToFoodItem);
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
          const json = await res.json();
          const payload = json.data ?? json;
          return Array.isArray(payload) ? payload : (payload.items || []);
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
          const data = json.data ?? json;
          return { id: data.id || id };
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

  /** The weight of a day: through the outbox (S6), the newest value of the day wins. */
  async queueWeight(date: string, weightKg: number): Promise<WriteResult> {
    if (!isLiveMode()) return { state: "saved" };
    return withEngine((e) =>
      e.sideWrite({
        kind: "weight",
        entity: `weight:${date}`,
        method: "PUT",
        path: `/me/weight/${encodeURIComponent(date)}`,
        payload: { weight_kg: weightKg },
        day: date,
      })
    );
  },

  async updateWeight(date: string, weightKg: number): Promise<boolean> {
    return (await apiClient.queueWeight(date, weightKg)).state !== "held";
  },

  async getWeightLogs(from?: string, to?: string): Promise<Array<{ log_date: string; weight_kg: number }>> {
    if (isLiveMode()) {
      try {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const res = await apiFetch(`/me/weight?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          const payload = json.data ?? json;
          return Array.isArray(payload) ? payload : (payload.logs || []);
        }
      } catch {
        // Fallback
      }
    }
    return [];
  },

  /** A day's training minutes: through the outbox (S6), the newest value of the day wins. */
  async setTraining(date: string, minutes: number): Promise<boolean> {
    if (!isLiveMode()) return true;
    const result = await withEngine((e) => e.sideWrite({
      kind: "weight",
      entity: `training:${date}`,
      method: "PUT",
      path: `/days/${encodeURIComponent(date)}/training`,
      payload: { training_minutes: minutes },
      day: date,
    }));
    return result.state !== "held";
  },

  async copyYesterday(date: string, mealSlots?: string[]): Promise<boolean> {
    if (isLiveMode()) {
      try {
        const sourceDate = shiftIsoDate(date, -1);
        const res = await apiFetch(`/days/${encodeURIComponent(date)}/copy-yesterday`, {
          method: "POST",
          body: JSON.stringify({
            source_date: sourceDate,
            meal_slots: mealSlots || [],
          }),
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

  /** `day` is the entry's day, so a 409 for a day beyond the editable window is told from one the API does not allow yet. */
  async updateEntry(
    id: string,
    patch: {
      meal_slot?: string;
      grams?: number;
      serving_size_g?: number;
      serving_label?: string;
      calories?: number;
    },
    day?: string
  ): Promise<WriteResult> {
    // Only a uuid can be on the server (a sample entry of the demo is not)
    if (!isLiveMode() || !isUuid(id)) return { state: "saved" };
    const slot = patch.meal_slot === "preworkout" ? "pre_workout" : patch.meal_slot;
    return withEngine((e) =>
      e.diaryWrite({
        id,
        date: "",
        day,
        method: "PATCH",
        path: `/entries/${encodeURIComponent(id)}`,
        payload: {
          meal_slot: slot,
          grams: patch.grams,
          serving_size_g: patch.serving_size_g ?? patch.grams,
          serving_label: patch.serving_label,
          calories: patch.calories,
        },
      })
    );
  },

  async restoreEntry(id: string, day?: string): Promise<WriteResult> {
    if (!isLiveMode() || !isUuid(id)) return { state: "saved" };
    return withEngine((e) => e.restoreEntryWrite(id, day));
  },

  async deleteEntry(id: string, day?: string): Promise<WriteResult> {
    if (!isLiveMode() || !isUuid(id)) return { state: "saved" };
    return withEngine((e) => e.diaryWrite({ id, date: "", day, method: "DELETE", path: `/entries/${encodeURIComponent(id)}`, payload: {} }));
  },

  async requestMagicLink(email: string): Promise<{ ok: true }> {
    void email;
    return { ok: true };
  },

  async signInWithGoogle(): Promise<{ ok: true }> {
    return { ok: true };
  },

  /** Fetches user profile from backend database. Returns null if not completed or unauthorized. */
  async getProfile(): Promise<Profile | null> {
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/me`);
        if (res.ok) {
          const json = await res.json();
          const raw = json.data ?? json;
          if (raw && (raw.sex || raw.birth_year || raw.birthYear)) {
            return mapApiProfileToProfile(raw);
          }
        }
      } catch {
        // Fallback or unauthenticated
      }
      return null;
    }
    return readStoredProfile(new Date().getFullYear());
  },

  /** A profile change from Hồ sơ or a name edit: through the outbox (S6), the newest one wins. Setup uses saveSetup. */
  async queueProfile(profile: SetupProfile): Promise<WriteResult> {
    if (!isLiveMode()) return { state: "saved" };
    return withEngine((e) => e.sideWrite({ kind: "profile", entity: "profile", method: "PUT", path: `/me/profile`, payload: profileBody(profile) }));
  },

  /** Saves the profile (setup). Live mode throws when the API cannot be reached or says no: the person sees it and tries again. */
  async saveSetup(profile: SetupProfile): Promise<{ ok: true }> {
    if (isLiveMode()) {
      const res = await apiFetch(`/me/profile`, {
        method: "PUT",
        body: JSON.stringify(profileBody(profile)),
      });
      if (!res.ok) {
        let msg = `profile save failed (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) msg = errJson.error.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
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
          const payload = json.data ?? json;
          if (Array.isArray(payload)) return payload;
          if (Array.isArray(payload.items)) return payload.items;
        }
      } catch {
        // No answer
      }
      // Live mode never shows the sample coaches
      return [];
    }
    return filterCoachesBySpecialty(specialty || "Tất cả");
  },

  async getCoach(id: string): Promise<CoachProfile | null> {
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/coaches/${encodeURIComponent(id)}`);
        if (res.ok) {
          const json = await res.json();
          return json.data ?? json;
        }
      } catch {
        // No answer
      }
      return null;
    }
    return getCoachById(id);
  },

  async getLeaderboard(period: LeaderboardPeriod = "weekly"): Promise<LeaderboardResponse> {
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/leaderboard?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          return json.data ?? json;
        }
      } catch {
        // No answer
      }
      // Live mode never shows the sample ranking
      return { period, periodLabel: "", cycleEndDate: "", ranks: [], currentUserRank: null, optedIn: false };
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
};

