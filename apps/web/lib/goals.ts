import { pctOf } from "./home";
import { accountStorage, type KeyValueStore } from "./storage-keys";

/**
 * feat/sound-goals §3 (Hao 24/10): the goals a day can reach, which of them a local add just reached, once a day, and which one gets
 * the moment on Hôm nay. Pure, except the record's load/save and the onGoal listeners. The first layer of the gamification (AGENTS.md
 * › Product rules): later layers (XP, quests, badges) read the same goal keys through onGoal.
 */
export type MacroId = "carbs" | "protein" | "fat";
const MACRO_IDS: readonly MacroId[] = ["carbs", "protein", "fat"];

/** kcal, all three macros, one macro, Chất xơ, a nutrient of the Level's column (its catalogue id), the whole column, Ngày tập. */
export type GoalKey = "kcal" | "macros" | `macro:${MacroId}` | "fiber" | "column" | "training" | (string & {});
/** Not a daily goal: the first food ever logged on the account plays a T1 moment of its own (§5b). */
export const FIRST_FOOD = "first_food";

export interface Amount {
  value: number | null;
  target: number | null;
}

export interface GoalDay {
  /** Against the day's kcal target, as Hôm nay's hero */
  kcal: Amount;
  macros: Record<MacroId, Amount>;
  fiber: Amount;
  /** The Level's counted nutrients (lib/level-nutrients countedForLevel), in the column's order */
  column: Record<string, Amount>;
  /** Every item of the day's Ngày tập checklist ticked */
  training: boolean;
}

/** 100 % as the bars round it (lib/home pctOf); an unknown value or target never counts. */
function reached({ value, target }: Amount): boolean {
  return (pctOf(value, target) ?? 0) >= 100;
}

/** Every goal the day has reached, in the order Hôm nay shows them: the hero, Chất xơ, the column, then column and training. */
export function goalsMet(day: GoalDay): GoalKey[] {
  const macros = MACRO_IDS.filter((id) => reached(day.macros[id]));
  const column = Object.keys(day.column).filter((id) => reached(day.column[id]));
  const fiber = reached(day.fiber);
  const all = column.length === Object.keys(day.column).length && column.length > 0 && fiber;
  return [
    ...(reached(day.kcal) ? ["kcal"] : []),
    ...(macros.length === MACRO_IDS.length ? ["macros"] : []),
    ...macros.map((id) => `macro:${id}`),
    ...(fiber ? ["fiber"] : []),
    ...column,
    ...(all ? ["column"] : []),
    ...(day.training ? ["training"] : []),
  ];
}

/**
 * The goals this change just reached: only from a local add on this device, for today, and the first time today (`seen`, the
 * day's record). The first read (`before` null: opening the app), a refetch, pull to refresh, another device or another day: none.
 */
export function reachedGoals(before: GoalDay | null, after: GoalDay, ctx: { localAdd: boolean; isToday: boolean; seen: readonly string[] }): GoalKey[] {
  if (!before || !ctx.localAdd || !ctx.isToday) return [];
  const had = new Set(goalsMet(before));
  return goalsMet(after).filter((key) => !had.has(key) && !ctx.seen.includes(key));
}

export interface GoalRecord {
  date: string;
  goals: string[];
}

/** The goals already reached on `date`. */
export function seenToday(record: GoalRecord | null, date: string): string[] {
  return record?.date === date ? record.goals : [];
}

/** The record with `keys` added for `date` (a new day starts a new record). Every goal met today goes in, an add or not. */
export function withGoals(record: GoalRecord | null, date: string, keys: readonly string[]): GoalRecord {
  const seen = seenToday(record, date);
  return { date, goals: [...seen, ...keys.filter((key) => !seen.includes(key))] };
}

const GOALS_KEY = "h1t_goals_v1";
// lib/haptics kept the vitamins and minerals that vibrated today here, as { date, nutrients }; the ids are the same goal keys
const LEGACY_KEY = "h1t_goal100";

export function loadGoalRecord(storage: KeyValueStore | null = accountStorage()): GoalRecord | null {
  try {
    const saved = JSON.parse(storage?.getItem(GOALS_KEY) ?? "null");
    if (typeof saved?.date === "string" && Array.isArray(saved.goals)) return saved;
    const legacy = JSON.parse(storage?.getItem(LEGACY_KEY) ?? "null");
    if (typeof legacy?.date === "string" && Array.isArray(legacy.nutrients)) return { date: legacy.date, goals: legacy.nutrients };
  } catch {
    // Unreadable: start the day again
  }
  return null;
}

export function saveGoalRecord(record: GoalRecord, storage: KeyValueStore | null = accountStorage()): void {
  try {
    storage?.setItem(GOALS_KEY, JSON.stringify(record));
    storage?.removeItem(LEGACY_KEY);
  } catch {
    // Storage full or blocked
  }
}

export interface Moment {
  /** 1 a target (or the first food), 2 kcal / the three macros / Ngày tập, 3 the whole column (Đủ chất) */
  tier: 1 | 2 | 3;
  /** The goal that plays in full */
  lead: string;
  /** The other goals of the same add: their numbers pop, no sheen, no sound of their own */
  pops: string[];
}

const TIER_2 = ["kcal", "macros", "training"];

function tierOf(key: string): Moment["tier"] {
  if (key === "column") return 3;
  return TIER_2.includes(key) ? 2 : 1;
}

/**
 * One moment per add: the highest tier leads. Within T2, kcal before the three macros before Ngày tập; within T1 the first food
 * ever (once per account) before a nutrient, then Hôm nay's order. Null when nothing was reached.
 */
export function momentFor(keys: readonly string[]): Moment | null {
  if (keys.length === 0) return null;
  const rank = (key: string) => tierOf(key) * 10 + (key === "kcal" || key === FIRST_FOOD ? 2 : key === "macros" ? 1 : 0);
  const lead = keys.reduce((best, key) => (rank(key) > rank(best) ? key : best));
  return { tier: tierOf(lead), lead, pops: keys.filter((key) => key !== lead && key !== FIRST_FOOD) };
}

/**
 * The first food ever logged on the account: not seen before, and the account had no entries and no Gần đây before this add (so a
 * returning user on a new phone gets nothing). Never in demo mode.
 */
export function firstFoodDue({ seen, hadEntries, hadRecents, demo }: { seen: boolean; hadEntries: boolean; hadRecents: boolean; demo: boolean }): boolean {
  return !seen && !hadEntries && !hadRecents && !demo;
}

const FIRST_FOOD_KEY = "h1t_first_food_v1";

/** Whether this account has had its first-food moment (kept per account, like the goal record). */
export function loadFirstFoodSeen(storage: KeyValueStore | null = accountStorage()): boolean {
  try {
    return storage?.getItem(FIRST_FOOD_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveFirstFoodSeen(storage: KeyValueStore | null = accountStorage()): void {
  try {
    storage?.setItem(FIRST_FOOD_KEY, "1");
  } catch {
    // Storage full or blocked: the moment may play once more
  }
}

export const MOMENT_AFTER_SHEET_MS = 150;

export interface GateState {
  /** The day the moment was queued */
  queuedFor: string;
  today: string;
  /** Hôm nay is in view and shows today */
  homeToday: boolean;
  /** Each makes the moment wait (like the Level-up celebration): it never interrupts and never covers anything */
  waitingOn: { addSheet: boolean; whatsNewOrTour: boolean; homeSheet: boolean; choosing: boolean; levelUp: boolean };
  /** When the + sheet's exit ended (performance.now()), or null */
  sheetExitEndedAt: number | null;
  now: number;
}

/** "drop" (queued on an earlier day), "wait", or the milliseconds until it plays: 150 ms after the + sheet's exit ends. */
export function momentGate(s: GateState): "drop" | "wait" | number {
  if (s.queuedFor !== s.today) return "drop";
  if (!s.homeToday || Object.values(s.waitingOn).some(Boolean)) return "wait";
  return s.sheetExitEndedAt === null ? 0 : Math.max(0, s.sheetExitEndedAt + MOMENT_AFTER_SHEET_MS - s.now);
}

export interface GoalEvent {
  date: string;
  /** Every goal the add reached, the lead included (the moment the goal is reached, queued or not: later layers read it here) */
  keys: string[];
  moment: Moment;
}

const listeners = new Set<(event: GoalEvent) => void>();

/** Hears every goal an add reaches, when it is reached; returns the unsubscribe. */
export function onGoal(listener: (event: GoalEvent) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function emitGoal(event: GoalEvent): void {
  for (const listener of listeners) listener(event);
}
