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
import { OFFLINE_OUTBOX_KEY, accountStorage, browserLocal, browserSession, keyedStorage, type KeyValueStore } from "./storage-keys";
import { isDemo } from "./demo";
import { type CoachProfile, filterCoachesBySpecialty, getCoachById } from "./coaches";
import { type LeaderboardPeriod, type LeaderboardResponse, getMockLeaderboard, setLeaderboardOptIn as setLeaderboardOptInState } from "./leaderboard";
import { readStoredProfile, type Profile } from "./profile";
import { shiftIsoDate } from "./day-history";
import { generateUuid, isUuid } from "./uuid";
import { refreshServerSession } from "./server-session";
import { reportClientError } from "./client-errors";
import { normaliseCoaching } from "./coaching-link";
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

/** Thrown by searchFoods in live mode when /foods did not answer. */
export const FOODS_UNAVAILABLE = "foods_unavailable";

// The whole catalogue, kept for a while so a repeat visit does not page /foods again
const FOODS_PAGE_LIMIT = 500;
const FOODS_MAX_PAGES = 30;
const FOODS_CACHE_KEY = "h1t_foods_cache_v1";
const FOODS_CACHE_MS = 10 * 60 * 1000;

function foodsCache(): KeyValueStore | null {
  const session = browserSession();
  return session ? keyedStorage(session, false, currentAccountId()) : null;
}

function readFoodsCache(cache: KeyValueStore | null): FoodItem[] | null {
  try {
    const parsed = JSON.parse(cache?.getItem(FOODS_CACHE_KEY) ?? "null");
    if (parsed && Date.now() - parsed.at < FOODS_CACHE_MS && Array.isArray(parsed.foods) && parsed.foods.length > 0) return parsed.foods;
  } catch {
    // Unreadable: load again
  }
  return null;
}

function writeFoodsCache(cache: KeyValueStore | null, foods: FoodItem[]): void {
  try {
    cache?.setItem(FOODS_CACHE_KEY, JSON.stringify({ at: Date.now(), foods }));
  } catch {
    // Storage full or blocked: the next visit loads again
  }
}

let foodsInFlight: Promise<FoodItem[]> | null = null;

async function fetchAllFoods(): Promise<FoodItem[]> {
  const cache = foodsCache();
  const cached = readFoodsCache(cache);
  if (cached) {
    setCatalogFoods(cached);
    setCatalogStatus("ready");
    return cached;
  }

  setCatalogStatus("loading");
  const collected = new Map<string, FoodItem>();
  let complete = false;
  try {
    for (let page = 1; page <= FOODS_MAX_PAGES; page++) {
      const res = await apiFetch(`/foods?limit=${FOODS_PAGE_LIMIT}&page=${page}`);
      if (!res.ok) break;
      const json = await res.json();
      const payload = json.data ?? json;
      const items = payload.items ?? (Array.isArray(payload) ? payload : null);
      if (!Array.isArray(items)) break;
      for (const raw of items) {
        const food = mapApiFoodToFoodItem(raw);
        collected.set(food.id, food);
      }
      const total = Number(payload.total);
      if (total > 0 ? collected.size >= total : items.length === 0) {
        complete = true;
        break;
      }
      if (items.length === 0) break;
    }
  } catch {
    // Keep what loaded
  }

  const foods = Array.from(collected.values());
  if (foods.length === 0) {
    setCatalogStatus("failed");
    throw new Error("Chưa tải được danh mục món ăn");
  }
  setCatalogFoods(foods);
  setCatalogStatus("ready");
  if (complete) writeFoodsCache(cache, foods);
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
 * sent once more. A second 401 is returned as it is.
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

  const res = await send();
  if (res.status !== 401 || typeof window === "undefined") return res;
  await refreshServerSession();
  return send();
}

// Diary writes and the outbox. A write that did not reach the server is never dropped: it waits in the outbox
// (localStorage, per account) and is sent again on the next sync. OFFLINE_OUTBOX_KEY is read inside the functions
// only: api-client, storage-keys and auth-actions import each other, so a module-level read of it can run before
// storage-keys has finished loading ("Cannot access 'x' before initialization", depending on which page loads first).

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
  /** Held for good (409 PAST_DAY_READ_ONLY): never sent again, not even by Thử lại. */
  final?: boolean;
}

/** The server's code for a write to a day that has passed: sending it again can never work. */
const PAST_DAY_READ_ONLY = "PAST_DAY_READ_ONLY";

/** What a diary write's answer means. 0 = no answer (offline, or the request failed). */
export function writeOutcome(status: number, method: string): "saved" | "retry" | "held" {
  if (status === 0 || status === 401 || status === 408 || status === 429 || status >= 500) return "retry";
  if (status >= 200 && status < 300) return "saved";
  // Deleted already (here or on another device)
  if (status === 404 && method === "DELETE") return "saved";
  return "held";
}

interface OutboxItem {
  /** The entry the write is about. */
  id: string;
  date: string;
  payload: Record<string, unknown>;
  /** Absent on an add queued before cc-49: POST /days/{date}/entries. */
  method?: "POST" | "PATCH" | "DELETE";
  path?: string;
  /** This one write (an entry can have several queued). Absent before cc-49: `${id}:${createdAt}`. */
  key?: string;
  createdAt: number;
  retries?: number;
  /**
   * The server refused it with a 4xx: not sent again until Thử lại or the next app open (syncOfflineOutbox({ retryHeld:
   * true })). `final`: refused for good (a past day), never sent again.
   */
  held?: { status: number; message: string; final?: boolean };
}

type DiaryWrite = Pick<OutboxItem, "id" | "date" | "payload" | "method" | "path">;

const itemKey = (item: OutboxItem) => item.key ?? `${item.id}:${item.createdAt}`;
const itemMethod = (item: DiaryWrite) => item.method ?? "POST";
const itemPath = (item: DiaryWrite) => item.path ?? `/days/${item.date}/entries`;
const isAdd = (item: DiaryWrite) => itemMethod(item) === "POST" && itemPath(item) === `/days/${item.date}/entries`;

/** The storage of one account's outbox: the signed-in one, or `account` when a write or a run belongs to it. */
function outboxStorage(account?: string | null): KeyValueStore | null {
  if (account === undefined) return accountStorage();
  const local = browserLocal();
  return local ? keyedStorage(local, isDemo(), account) : null;
}

function readOutbox(account?: string | null): OutboxItem[] {
  try {
    const items: unknown = JSON.parse(outboxStorage(account)?.getItem(OFFLINE_OUTBOX_KEY) || "[]");
    return Array.isArray(items) ? (items as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(items: OutboxItem[], account?: string | null): void {
  try {
    outboxStorage(account)?.setItem(OFFLINE_OUTBOX_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable
  }
}

/** Queues a write in the outbox of `account` (default: the signed-in one), never another account's. */
function queueWrite(write: DiaryWrite, held?: OutboxItem["held"], account?: string | null): void {
  const createdAt = Date.now();
  writeOutbox([...readOutbox(account), { ...write, key: `${write.id}:${createdAt}:${generateUuid()}`, createdAt, retries: 0, held }], account);
}

/** Queues an add to send later (kept for callers from before cc-49; diary writes queue themselves). */
export function enqueueOfflineEntry(date: string, payload: Record<string, unknown>): void {
  queueWrite({ id: (payload.id as string) || `offline-${Date.now()}`, date, payload });
}

/** Removes every queued write of an entry (an entry that never reached the server, deleted or undone). */
export function dropOfflineEntry(id: string): void {
  const items = readOutbox();
  const kept = items.filter((item) => item.id !== id);
  if (kept.length !== items.length) writeOutbox(kept);
}

/** Entry ids with a write in the outbox for the active account. */
export function getPendingOfflineEntryIds(): string[] {
  return readOutbox().map((item) => item.id);
}

// Writes being sent now, by entry: the next write of the same entry waits for it, so the server sees them in order
const inFlight = new Map<string, Promise<WriteResult>>();
// When each entry's last write started: a refetch that started before it must not overwrite it (diary-store)
const writeStartedAt = new Map<string, number>();

/** Entry ids a refetch must leave as they are on the device: a write is queued or being sent. */
export function pendingWriteIds(): Set<string> {
  return new Set([...getPendingOfflineEntryIds(), ...inFlight.keys()]);
}

/** Entry ids whose last write started at or after `time` (ms). */
export function writtenSince(time: number): string[] {
  return [...writeStartedAt].filter(([, at]) => at >= time).map(([id]) => id);
}

/** How many diary writes are being sent now. */
export function writesInFlight(): number {
  return inFlight.size;
}

async function serverAnswer(res: Response): Promise<{ message: string; code: string }> {
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
const DIARY_REQUEST_MS = 20 * 1000;
const diaryTimeout = (): AbortSignal | undefined =>
  typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(DIARY_REQUEST_MS) : undefined;

async function sendWrite(write: DiaryWrite): Promise<{ outcome: "saved" | "retry" | "held"; status: number; message: string; final: boolean }> {
  const method = itemMethod(write);
  let status = 0;
  let answer = { message: "", code: "" };
  try {
    const res = await apiFetch(itemPath(write), {
      method,
      body: method === "DELETE" ? undefined : JSON.stringify(write.payload),
      signal: diaryTimeout(),
    });
    status = res.status;
    if (status >= 300) answer = await serverAnswer(res);
  } catch {
    // No answer: sent again from the outbox
  }
  const outcome = writeOutcome(status, method);
  if (outcome === "held") console.warn(`Diary write not saved: ${method} ${itemPath(write)} → ${status} ${answer.message}`);
  // Any non-2xx answer (not a 404 on a delete, which means done) is reported once
  if (status >= 300 && outcome !== "saved") reportClientError({ kind: "write", method, path: itemPath(write), status, message: answer.message });
  return { outcome, status, message: answer.message, final: outcome === "held" && status === 409 && answer.code === PAST_DAY_READ_ONLY };
}

/**
 * Sends one diary write, after any write of the same entry that is still being sent or still queued. What does not
 * reach the server goes to the outbox: no answer, 401 after the session refresh, 408, 429 and 5xx to be sent again,
 * any other 4xx held for Thử lại (with the server's message).
 */
function diaryWrite(write: DiaryWrite): Promise<WriteResult> {
  writeStartedAt.set(write.id, Date.now());
  const account = currentAccountId();
  const before = inFlight.get(write.id) ?? Promise.resolve<WriteResult>({ state: "saved" });
  const run = before.then(async (): Promise<WriteResult> => {
    const queued = readOutbox().filter((item) => item.id === write.id);
    if (itemMethod(write) === "DELETE" && queued.some(isAdd)) {
      // The server never had this entry: nothing to delete, and its queued writes go too
      dropOfflineEntry(write.id);
      return { state: "saved" };
    }
    if (queued.length > 0) {
      // Earlier writes of this entry wait in the outbox: this one goes after them
      queueWrite(write);
      void syncOfflineOutbox();
      return { state: "queued" };
    }
    const { outcome, status, message, final } = await sendWrite(write);
    if (outcome === "saved") return { state: "saved" };
    // Into the outbox of the account the write belongs to, even when another one signed in meanwhile
    queueWrite(write, outcome === "held" ? { status, message, final } : undefined, account);
    return outcome === "held" ? { state: "held", status, message, final } : { state: "queued", status };
  });
  inFlight.set(write.id, run);
  void run.finally(() => {
    if (inFlight.get(write.id) === run) inFlight.delete(write.id);
  });
  return run;
}

export interface SyncResult {
  /** Entries whose add or edit the server has now (a delete is not listed). */
  saved: string[];
  /** Writes the server refused in this run, with its answer (`final`: refused for good, now and never sent again). */
  held: Array<{ id: string; status: number; message: string; date: string; final: boolean }>;
}

let syncQueue: Promise<SyncResult> = Promise.resolve({ saved: [], held: [] });

/**
 * Sends the outbox in order, one run at a time (a call during a run starts after it). A write that fails again stays,
 * and the later writes of its entry wait behind it; no answer at all ends the run (offline). Held writes are sent
 * only with `retryHeld` (Thử lại). Writes queued while a run is going are kept.
 */
export function syncOfflineOutbox(options: { retryHeld?: boolean } = {}): Promise<SyncResult> {
  syncQueue = syncQueue.catch(() => ({ saved: [], held: [] })).then(() => runOutbox(options.retryHeld === true));
  return syncQueue;
}

async function runOutbox(retryHeld: boolean): Promise<SyncResult> {
  const result: SyncResult = { saved: [], held: [] };
  // The run belongs to the account signed in when it starts: its writes never go out with another account's session
  const account = currentAccountId();
  const items = readOutbox(account);
  if (!items.length) return result;
  const blocked = new Set<string>();
  const sent = new Set<string>();
  const changed = new Map<string, Partial<OutboxItem>>();
  for (const item of items) {
    if (blocked.has(item.id) || item.held?.final || (item.held && !retryHeld)) {
      blocked.add(item.id);
      continue;
    }
    if (currentAccountId() !== account) break;
    const { outcome, status, message, final } = await sendWrite(item);
    if (outcome === "saved") {
      sent.add(itemKey(item));
      if (itemMethod(item) !== "DELETE") result.saved.push(item.id);
      continue;
    }
    blocked.add(item.id);
    const retries = (item.retries ?? 0) + 1;
    if (outcome === "held") {
      changed.set(itemKey(item), { retries, held: { status, message, final } });
      result.held.push({ id: item.id, status, message, date: item.date, final });
    } else {
      changed.set(itemKey(item), { retries, held: undefined });
      if (status === 0) break;
    }
  }
  writeOutbox(
    readOutbox(account)
      .filter((item) => !sent.has(itemKey(item)))
      .map((item) => (changed.has(itemKey(item)) ? { ...item, ...changed.get(itemKey(item)) } : item)),
    account
  );
  return result;
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
          const raw = json.data ?? json;
          const mapped = mapApiFoodToFoodItem(raw);
          addCatalogFood(mapped);
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
      }

      // The id is the client's (idempotent on the server), so a write sent again never adds the entry twice
      const result = await diaryWrite({ id: entryId, date, payload: body });
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

  async setTraining(date: string, minutes: number): Promise<boolean> {
    if (isLiveMode()) {
      try {
        const res = await apiFetch(`/days/${encodeURIComponent(date)}/training`, {
          method: "PUT",
          body: JSON.stringify({ training_minutes: minutes }),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
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

  async updateEntry(
    id: string,
    patch: {
      meal_slot?: string;
      grams?: number;
      serving_size_g?: number;
      serving_label?: string;
      calories?: number;
    }
  ): Promise<WriteResult> {
    // Only a uuid can be on the server (a sample entry of the demo is not)
    if (!isLiveMode() || !isUuid(id)) return { state: "saved" };
    const slot = patch.meal_slot === "preworkout" ? "pre_workout" : patch.meal_slot;
    return diaryWrite({
      id,
      date: "",
      method: "PATCH",
      path: `/entries/${encodeURIComponent(id)}`,
      payload: {
        meal_slot: slot,
        grams: patch.grams,
        serving_size_g: patch.serving_size_g ?? patch.grams,
        serving_label: patch.serving_label,
        calories: patch.calories,
      },
    });
  },

  async restoreEntry(id: string): Promise<WriteResult> {
    if (!isLiveMode() || !isUuid(id)) return { state: "saved" };
    // Undo of a delete that is still queued: the delete is taken back, the server never saw it
    const queuedDelete = readOutbox().find((item) => item.id === id && item.method === "DELETE");
    if (queuedDelete) {
      writeOutbox(readOutbox().filter((item) => itemKey(item) !== itemKey(queuedDelete)));
      return { state: "saved" };
    }
    return diaryWrite({ id, date: "", method: "POST", path: `/entries/${encodeURIComponent(id)}/restore`, payload: {} });
  },

  async deleteEntry(id: string): Promise<WriteResult> {
    if (!isLiveMode() || !isUuid(id)) return { state: "saved" };
    return diaryWrite({ id, date: "", method: "DELETE", path: `/entries/${encodeURIComponent(id)}`, payload: {} });
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

  /** Saves the profile (setup, and later name changes). Live mode throws when the API cannot be reached or says no. */
  async saveSetup(profile: SetupProfile): Promise<{ ok: true }> {
    if (isLiveMode()) {
      const res = await apiFetch(`/me/profile`, {
        method: "PUT",
        body: JSON.stringify({
          sex: profile.sex,
          birth_year: profile.birthYear,
          weight_kg: profile.weightKg,
          goal: profile.goal,
          ...(profile.nearPeriod !== undefined || profile.periodMode !== undefined
            ? { near_period: Boolean(profile.nearPeriod ?? profile.periodMode) }
            : {}),
          ...(profile.trainingMinutesDefault !== undefined
            ? { training_minutes_default: profile.trainingMinutesDefault }
            : {}),
          // The display name travels with the profile save
          ...(profile.displayName ? { display_name: profile.displayName } : {}),
        }),
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

