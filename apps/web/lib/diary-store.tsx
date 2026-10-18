"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { currentAccountId } from "./auth-actions";
import { SAMPLE_DAY, type MockDayData, type MockFoodItem } from "./mock/sample-day";
import { type FoodItem } from "./mock/foods";
import { type MealSlot, getMealSlotNameVi } from "./meal-slot";
import { formatAmount } from "./format";
import { sumKcal } from "./kcal";
import { getTodayIsoVN, withRuntimeDate } from "./date";
import { DAY_ARCHIVE_KEY, mergeArchive, msUntilNextDay, parseArchive, splitByDay, type DayArchive } from "./day-archive";
import { isDemo, setDemoActive } from "./demo";
import {
  ADDED_ENTRIES_KEY,
  RECENT_FOODS_KEY,
  SAMPLE_EDITS_KEY,
  adoptLegacyKeys,
  browserLocal,
  browserSession,
  keyedStorage,
  type KeyValueStore,
} from "./storage-keys";
import { blankDay, dayEntries, setDayArchive, statDisplay } from "./day-history";
import { totalsFromEntries } from "./day-totals";
import { microsSummaryFor } from "./lacking";
import { nutrientSourcesIn, type NutrientSource } from "./nutrient-sources";
import { DEFAULT_RECENT_FOODS, isRecentFood, pushRecent, type RecentFood } from "./recent-foods";
import { MOCK_FOODS, catalogVersion, subscribeCatalog } from "./mock/foods";
import { readRecipes, serverFoodIdOf, syncRecipeFoods, uploadPendingRecipes } from "./recipe-store";
import { withServerFoods } from "./recipe";
import { personaPatch } from "./demo-persona";
import { isLiveMode } from "./api-mode";
import {
  apiClient,
  getPendingOfflineEntryIds,
  pendingWriteIds,
  syncOfflineOutbox,
  writesInFlight,
  writtenSince,
  type SyncResult,
  type WriteResult,
} from "./api-client";
import { refreshServerSession } from "./server-session";
import { markUsed } from "./onboarding-store";
import { isLocalOnly, syncNotice } from "./sync-notice";
import { errorText, reportClientError } from "./client-errors";
import { firstGoalToday, goal100Reached, haptic } from "./haptics";
import { HOME_ROUTE } from "./nav";
import { generateUuid, isUuid } from "./uuid";
import {
  buildSavedMeal,
  defaultMealName,
  itemsFromEntries,
  readSavedMeals,
  removeSavedMeal,
  renameSavedMeal as renameSavedMealIn,
  savedMealEntries,
  savedMealSkipped,
  writeSavedMeals,
  type SavedMeal,
} from "./saved-meals";
import { quickDetail, quickEntryFrom, type QuickEntryInput, type QuickEntryResult } from "./quick-entry";
import { readFavouriteIds, toggleFavouriteId, writeFavouriteIds } from "./favourites";
import {
  SAMPLE_PROFILE,
  applyProfileTargets,
  loadProfile,
  normaliseProfile,
  targetsFor,
  writeStoredProfile,
  type Profile,
} from "./profile";
import type { CompleteTargets } from "./targets";
import { rememberServerTraining, subscribeTraining, trainingMinutesFor, trainingVersion } from "./training-minutes";
import {
  type AddedDiaryEntry,
  type Amounts,
  type DiaryEdits,
  type EntryPatch,
  type EntryView,
  type SampleEdits,
  addAmounts,
  amountsOfNumbers,
  deleteEntryIn,
  deleteMealIn,
  deleteEntriesIn,
  moveEntriesIn,
  restoreSlotsIn,
  slotsBeforeMove,
  type SlotMove,
  dismissUndoIn,
  canLog,
  entryNumbers,
  labelZeros,
  NO_ENERGY_MESSAGE,
  findEntry,
  mealEntryIds,
  mealPortions,
  mergeServerDay,
  parseAddedEntries,
  parseSampleEdits,
  removeAddedIn,
  resolveSampleItems,
  SAMPLE_ITEMS,
  SAMPLE_SLOT,
  sampleDelta,
  sampleEffect,
  undoDeleteIn,
  updateEntryIn,
} from "./diary-edits";

export type { AddedDiaryEntry, EntryView, EntryPatch } from "./diary-edits";

/**
 * The one toast of the app. "added" offers Xem (jump to the meal), "deleted" offers Hoàn tác,
 * "undoable" offers Hoàn tác for the entries one action added (undoIds: a copy, a recent, a Bữa ăn của tôi),
 * "saved" offers Xem (Bữa ăn của tôi in Khám phá), and "unsaved" offers Thử lại (the server refused a write).
 */
export interface ToastInfo {
  message: string;
  kind: "added" | "deleted" | "undoable" | "saved" | "moved" | "notice" | "unsaved";
  mealSlot: MealSlot | null;
  /** How long it stays. A delete or a copy stays 5 s, which is also the undo window. */
  durationMs: number;
  undoIds?: string[];
  /** "moved": where each moved entry was, for Hoàn tác. */
  undoMoves?: SlotMove[];
}

/** A "deleted" toast kept on screen under a newer one, until `expiresAt` (ms since epoch). */
export interface ParkedToast {
  toast: ToastInfo;
  expiresAt: number;
}

const ADDED_TOAST_MS = 4000;
const UNDO_TOAST_MS = 5000;
const NOTICE_TOAST_MS = 6000;

interface DiaryContextValue {
  data: MockDayData;
  addedEntries: AddedDiaryEntry[];
  /**
   * `undoable` is the one-tap add of a recent: the toast offers Hoàn tác for 5 s instead of Xem. `id` is the new entry's
   * id when the caller keeps a link to it (a Ngày tập tick, cc-52); a fresh one otherwise.
   */
  addFoodEntry: (
    food: FoodItem,
    grams: number,
    mealSlot: MealSlot,
    servingLabel?: string,
    options?: { undoable?: boolean; id?: string }
  ) => Promise<boolean>;
  /**
   * The add tray: every item in one diary update and one toast whose Hoàn tác removes them all. False when an item has no
   * energy figure. An item's `id` is its entry's id when the caller keeps a link (the Ngày tập Red Bull + mật mía mix).
   */
  addFoodEntries: (items: Array<{ food: FoodItem; grams: number; label: string; id?: string }>, mealSlot: MealSlot) => boolean;
  recentFoods: RecentFood[];
  addRecentFood: (food: FoodItem, servingLabel: string) => void;
  toast: ToastInfo | null;
  dismissToast: () => void;
  highlightedMeal: MealSlot | null;
  setHighlightedMeal: (meal: MealSlot | null) => void;
  /** Newest favourite first. Loaded after mount from localStorage (see lib/favourites.ts). */
  favouriteIds: string[];
  isFavourite: (foodId: string) => boolean;
  toggleFavourite: (food: FoodItem) => void;
  /** An added entry or a sample item, with its edits applied. Null if unknown or deleted. */
  getEntry: (id: string) => EntryView | null;
  /** Changes the meal, and the portion when the entry can change portion. */
  updateEntry: (id: string, patch: EntryPatch) => void;
  deleteEntry: (id: string) => void;
  /** Removes every entry of a meal of today, with one undo toast (Hoàn tác puts the whole meal back). */
  deleteMeal: (slot: MealSlot) => void;
  /**
   * Removes the chosen entries of today with ONE undo toast (Hoàn tác puts them all back). `dayIso` is the day the ids
   * were picked on: anything but today is a read-only past day and nothing is removed.
   */
  deleteEntries: (ids: string[], dayIso: string) => void;
  /** Moves the chosen entries of today to a meal of today. Like deleteEntries, a past `dayIso` does nothing. */
  moveEntries: (ids: string[], slot: MealSlot, dayIso: string) => void;
  /** Puts the entries of the last Chuyển bữa back. Only works while the "moved" toast is shown. */
  undoMove: () => void;
  /** Puts the last deleted entry back. Only works while the "deleted" toast is shown. */
  undoLastDelete: () => void;
  /** A delete's toast that a Chuyển bữa toast pushed aside: still shown under it with its own time left. */
  parkedDelete: ParkedToast | null;
  /** Hoàn tác of the parked delete. Leaves the toast on top alone. */
  undoParkedDelete: () => void;
  /** Adds copied entries to today in one step, with one undo toast. Existing entries are kept. */
  copyEntries: (entries: AddedDiaryEntry[], message: string) => void;
  /** Takes out the entries of the last add or copy. Only works while the "undoable" toast is shown. */
  undoCopy: () => void;
  /** Bữa ăn của tôi, newest first. Loaded after mount from localStorage (see lib/saved-meals.ts). */
  savedMeals: SavedMeal[];
  /**
   * Saves the foods of a meal (today or a past day) as a Bữa ăn của tôi. Returns false when the meal holds
   * no food to save (empty, or only quick kcal entries).
   */
  saveMealAs: (slot: MealSlot, iso: string, name: string) => boolean;
  /** The foods a meal of that day would save: none for an empty meal or one of only quick kcal entries. */
  mealFoods: (slot: MealSlot, iso: string) => { foodId: string; servingLabel: string; grams: number }[];
  renameSavedMeal: (id: string, name: string) => void;
  deleteSavedMeal: (id: string) => void;
  /** One tap: adds every food of the saved meal to a meal of today, with one undo toast for all of them. */
  addSavedMeal: (meal: SavedMeal, slot: MealSlot) => void;
  /** Chỉ ghi kcal: adds a quick entry with unknown micronutrients, with an undo toast. */
  addQuickEntry: (input: QuickEntryInput, slot: MealSlot) => QuickEntryResult;
  /** Live mode: a diary write is being sent now (the header shows Đang lưu…, cc-51). */
  saving: boolean;
  /** Pull to refresh on Hôm nay (cc-51): the session is renewed, the outbox sent, and today read again. */
  refreshToday: () => Promise<void>;
  /** Live mode: today's entries the server has not saved yet. Each row shows Chưa lưu. */
  unsavedIds: ReadonlySet<string>;
  /** Live mode: today's entries whose food has no server row (a recipe made in the app): they stay on this device. */
  localOnlyIds: ReadonlySet<string>;
  /** Thử lại of the "unsaved" toast: the writes the server refused are sent again. */
  retryUnsaved: () => void;
  /** Today as YYYY-MM-DD (Asia/Ho_Chi_Minh). Null until mounted. */
  todayIso: string | null;
  /** Earlier days the user logged, by date; memo dependency for anything that calls dayEntries. */
  dayArchive: DayArchive;
  hydrated: boolean;
  /** Demo mode (see lib/demo): the sample day, history and Gần đây are loaded. Off for a real account. */
  demo: boolean;
  /** The profile the targets come from. Loaded after mount (see lib/profile.ts). */
  profile: Profile;
  /** Daily targets for the profile. Today, Micros and the portion panels read these. */
  targets: CompleteTargets;
  /** Changes part of the profile and saves it. Targets and the day follow. */
  updateProfile: (patch: Partial<Profile>) => void;
  /** The foods of today that add to one nutrient, largest first. Read by the Vi chất detail. */
  nutrientSources: (key: string) => NutrientSource[];
}

const DiaryContext = createContext<DiaryContextValue | null>(null);


/**
 * Pure aggregation function for daily totals.
 * In production, Dong's backend API will compute and return real aggregated totals.
 */
export function computeCompositeDayData(
  baseDay: MockDayData,
  loggedEntries: AddedDiaryEntry[],
  sampleEdits: SampleEdits = {}
): MockDayData {
  // A supplement whose label states no energy counts as 0 kcal and 0 g of macros, so it never makes the day unknown
  const addedEntries = loggedEntries.map((e) => labelZeros(e));
  const samples = resolveSampleItems(baseDay);
  const effects = samples.map((info) => ({ info, effect: sampleEffect(info, sampleEdits[info.item.id]) }));
  if (addedEntries.length === 0 && Object.keys(sampleEdits).length === 0) {
    // Untouched sample day: its items still carry their macros for the meta line
    const meals = baseDay.meals.map((meal) => ({
      ...meal,
      items: meal.items.map((it) => {
        const n = effects.find((e) => e.info.item.id === it.id)?.effect.numbers;
        return n ? { ...it, macros: { protein: n.protein, carbs: n.carbs, fat: n.fat } } : it;
      }),
    }));
    return { ...baseDay, meals, microsSummary: microsSummaryFor(baseDay) };
  }

  // What the added entries and the edited sample items add on top of the sample day
  let extra: Amounts = { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, nutrients: {} };
  for (const entry of addedEntries) {
    extra = addAmounts(extra, amountsOfNumbers(entry));
  }
  const addedOnly = extra;
  for (const { info, effect } of effects) {
    extra = addAmounts(extra, sampleDelta(info, effect));
  }
  // Every sample item deleted: the hand-set sample totals no longer stand for anything, so macros and nutrients
  // are the added entries alone (kcal stays base minus what the deleted items held, as before).
  const sampleGone = effects.length > 0 && effects.every((e) => e.effect.deleted);
  if (sampleGone) extra = { ...addedOnly, calories: extra.calories };
  const extraCals = extra.calories;
  const extraCarbs = extra.carbs;
  const extraProtein = extra.protein;
  const extraFat = extra.fat;
  const extraFiber = extra.fiber;
  const extraNutrients = extra.nutrients;

  // The sample day's totals are hand-set, not the sum of its items, so subtracting an item can overshoot. Two rules
  // keep every amount honest: nothing goes below 0, and once no sample item is left, a macro or nutrient that no
  // added entry carries is unknown (null, shown as a dash), not 0 and not a leftover of the hand-set total.
  const remaining = [
    ...effects.filter((e) => !e.effect.deleted).map((e) => e.effect.numbers),
    ...addedEntries,
  ];
  const hasMacro = (key: "protein" | "carbs" | "fat" | "fiber") =>
    !sampleGone || remaining.some((n) => n !== null && typeof n[key] === "number");
  const hasNutrient = (key: string) =>
    !sampleGone || remaining.some((n) => n !== null && typeof n.nutrients[key] === "number");
  const unknown = <S extends MockDayData["macros"][number] | MockDayData["minerals"][number]>(stat: S): S => ({
    ...stat,
    consumed: null,
    percentage: null,
    displayValue: statDisplay(0, stat).replace(/^0/, "—"),
  });

  // 1. Calories
  // Unknown kcal (an entry the server stored with NULL) adds nothing; when every food of the day is unknown the
  // total is unknown too (null, shown as a dash), not 0
  const keptKcals = [...effects.filter((e) => !e.effect.deleted).map((e) => e.effect.kcal), ...addedEntries.map((e) => e.calories)];
  const kcalUnknown = keptKcals.length > 0 && keptKcals.every((k) => k === null);
  const totalConsumedCals = kcalUnknown ? null : Math.max(0, (baseDay.calories.consumed ?? 0) + extraCals);
  const remainingCals = Math.max(0, baseDay.calories.targetMin - (totalConsumedCals ?? 0));
  const calPercentage = totalConsumedCals === null ? 0 : Math.round((totalConsumedCals / baseDay.calories.targetMin) * 100);

  // 2. Macros
  const updatedMacros = baseDay.macros.map((m) => {
    let extra = 0;
    if (m.key === "protein") extra = extraProtein;
    else if (m.key === "carbs") extra = extraCarbs;
    else if (m.key === "fat") extra = extraFat;
    else if (m.key === "fiber") extra = extraFiber;
    // Unknown stays unknown until an entry carries a value for it (a kcal-only entry adds no protein)
    if (m.consumed === null && extra === 0) return m;
    if (m.key === "protein" || m.key === "carbs" || m.key === "fat" || m.key === "fiber") {
      if (!hasMacro(m.key)) return unknown(m);
    }

    const baseConsumed = sampleGone ? 0 : m.consumed ?? 0;
    const newConsumed = Math.max(0, Math.round(baseConsumed + extra));
    const targetMin = m.targetMin ?? 0;
    const percentage = targetMin > 0 ? Math.round((newConsumed / targetMin) * 100) : 0;
    const displayValue = statDisplay(newConsumed, m);

    return {
      ...m,
      consumed: newConsumed,
      percentage,
      displayValue,
    };
  });

  // 3. Meals: sample items that stay (in sample order, with their edited meal, amount and kcal), then added entries
  const itemsBySlot = new Map<MealSlot, MockFoodItem[]>();
  const addItem = (slot: MealSlot, item: MockFoodItem) => {
    const list = itemsBySlot.get(slot);
    if (list) {
      list.push(item);
    } else {
      itemsBySlot.set(slot, [item]);
    }
  };
  for (const { info, effect } of effects) {
    if (!effect.deleted) {
      addItem(effect.mealSlot, {
        id: info.item.id,
        name: info.item.name,
        qty: effect.qty,
        kcal: effect.kcal,
        ...(effect.numbers ? { macros: { protein: effect.numbers.protein, carbs: effect.numbers.carbs, fat: effect.numbers.fat } } : {}),
      });
    }
  }
  for (const e of addedEntries) {
    addItem(e.mealSlot, {
      id: e.id,
      name: e.foodName,
      qty: e.displayQty,
      kcal: e.calories,
      macros: { protein: e.protein, carbs: e.carbs, fat: e.fat },
      ...(e.kind === "quick" ? { detail: quickDetail(e) } : {}),
    });
  }

  const updatedMeals = baseDay.meals.map((meal) => {
    const items = itemsBySlot.get(SAMPLE_SLOT[meal.slot]) ?? [];
    return {
      ...meal,
      items,
      kcal: items.length === 0 ? 0 : sumKcal(items.map((it) => it.kcal)),
    };
  });

  // 4. Nutrients record (for Micros page)
  const compositeNutrients: Record<string, number | null> = { ...(baseDay.nutrients || {}) };
  if (sampleGone) for (const key of Object.keys(compositeNutrients)) compositeNutrients[key] = null;
  for (const [key, extraVal] of Object.entries(extraNutrients)) {
    const current = compositeNutrients[key];
    if (current !== null && current !== undefined) {
      compositeNutrients[key] = Math.max(0, current + extraVal);
    } else if (extraVal > 0) {
      compositeNutrients[key] = extraVal;
    }
  }
  for (const key of Object.keys(compositeNutrients)) {
    if (!hasNutrient(key)) compositeNutrients[key] = null;
  }

  // 5. Update Minerals & Vitamins arrays (e.g. Kali, Vitamin B6)
  const updatedMinerals = baseDay.minerals.map((m) => {
    if (!hasNutrient(m.key)) return m.consumed === null ? m : unknown(m);
    const extra = extraNutrients[m.key] ?? 0;
    if (extra === 0) return m;

    const baseConsumed = sampleGone ? 0 : m.consumed ?? 0;
    const newConsumed = Math.max(0, Math.round(baseConsumed + extra));
    const targetMin = m.targetMin ?? 0;
    const percentage = targetMin > 0 ? Math.round((newConsumed / targetMin) * 100) : 0;
    const displayValue = statDisplay(newConsumed, m);

    return {
      ...m,
      consumed: newConsumed,
      percentage,
      displayValue,
    };
  });

  const updatedVitamins = baseDay.vitamins.map((v) => {
    if (!hasNutrient(v.key)) return v.consumed === null ? v : unknown(v);
    const extra = extraNutrients[v.key] ?? 0;
    if (extra === 0) return v;

    const baseConsumed = sampleGone ? 0 : v.consumed ?? 0;
    const newConsumed = Math.max(0, Math.round((baseConsumed + extra) * 100) / 100);
    const targetMin = v.targetMin ?? 0;
    const percentage = targetMin > 0 ? Math.round((newConsumed / targetMin) * 100) : 0;
    const displayValue =
      v.targetMin !== null
        ? `${formatAmount(newConsumed, v.unit)} / ${formatAmount(v.targetMin, v.unit)} ${v.unit}`
        : `${formatAmount(newConsumed, v.unit)} ${v.unit}`;

    return {
      ...v,
      consumed: newConsumed,
      percentage,
      displayValue,
    };
  });

  return {
    ...baseDay,
    calories: {
      ...baseDay.calories,
      consumed: totalConsumedCals,
      remaining: remainingCals,
      percentage: calPercentage,
    },
    macros: updatedMacros,
    meals: updatedMeals,
    minerals: updatedMinerals,
    vitamins: updatedVitamins,
    nutrients: compositeNutrients,
    microsSummary: microsSummaryFor({ minerals: updatedMinerals, vitamins: updatedVitamins }),
  };
}

/**
 * A past day as the Today screen shows it: nothing logged except the mock entries of that day (see day-history).
 * Targets follow the profile, the same as today, with that day's training minutes (lib/training-minutes).
 */
export function pastDayData(iso: string, todayIso: string, profile: Profile): MockDayData {
  const minutes = trainingMinutesFor(iso, profile);
  const base = blankDay(applyProfileTargets(SAMPLE_DAY, profile, targetsFor(profile, minutes), minutes));
  const entries = dayEntries(iso, todayIso);
  const day = computeCompositeDayData(base, entries, {});
  // Vitamins and minerals take the day's totals (lib/day-totals), so Nhật ký and Tổng quan show one number per day;
  // a nutrient no food of the day carries is unknown (null), not 0.
  const totals = totalsFromEntries(iso, entries);
  const fromTotals = <S extends MockDayData["minerals"][number]>(stat: S): S => {
    const consumed = totals.nutrients[stat.key] ?? null;
    const percentage =
      consumed !== null && stat.targetMin !== null && stat.targetMin > 0 ? Math.round((consumed / stat.targetMin) * 100) : null;
    return { ...stat, consumed, percentage, displayValue: consumed === null ? "—" : statDisplay(consumed, stat) };
  };
  const minerals = day.minerals.map(fromTotals);
  const vitamins = day.vitamins.map(fromTotals);
  return { ...day, minerals, vitamins, microsSummary: microsSummaryFor({ minerals, vitamins }), date: iso };
}

/** Hôm nay refetches the day this often while in front and online, so a food added on another device shows up. */
const DAY_POLL_MS = 60 * 1000;
/** The session cookie lives about 1 h; it is renewed this often while the app is in front. */
const SESSION_REFRESH_MS = 10 * 60 * 1000;
/** A refetch running longer than this (diary requests time out at 20 s) no longer blocks the next one. */
const REFRESH_STALE_MS = 45 * 1000;

/** What addEntry sends for an entry of the diary. */
function addPayload(entry: AddedDiaryEntry, date: string): Parameters<typeof apiClient.addEntry>[0] {
  return entry.kind === "quick"
    ? { id: entry.id, kind: "quick", calories: entry.calories ?? undefined, mealSlot: entry.mealSlot, date }
    : { id: entry.id, foodId: entry.foodId, grams: entry.grams, mealSlot: entry.mealSlot, date, servingLabel: entry.displayQty };
}

/**
 * Copied entries get new uuids: the server keys an entry by its id, and a copy is a new entry. A recipe's entry
 * names its server food once it has one.
 */
function withNewIds(entries: AddedDiaryEntry[]): AddedDiaryEntry[] {
  return withServerFoods(entries.map((e) => ({ ...e, id: generateUuid(), synced: undefined })), readRecipes());
}


export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [demo, setDemo] = useState(false);
  const [edits, setEdits] = useState<DiaryEdits>({ added: [], sample: {}, undo: null });
  const addedEntries = edits.added;
  // The sample day exists only in demo mode: without it no sample item can be found, edited or counted
  const samples = useMemo(() => (demo ? SAMPLE_ITEMS : []), [demo]);
  // Empty until mount; the sample recents are seeded only in demo mode
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [parkedDelete, setParkedDelete] = useState<ParkedToast | null>(null);
  // When the toast on screen was set, so a delete's toast can keep its remaining time when it is parked
  const toastStartedAt = useRef(0);
  const [highlightedMeal, setHighlightedMeal] = useState<MealSlot | null>(null);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  // Today's date, read after mount so the server and first client render agree
  const [todayIso, setTodayIso] = useState<string | null>(null);
  // Earlier days the user logged, filed by date (lib/day-archive); read by dayEntries for the history and Tổng quan
  const [archive, setArchive] = useState<DayArchive>({});
  // Same rule for the profile: the sample user until the saved one is read after mount
  const [profile, setProfile] = useState<Profile>(SAMPLE_PROFILE);
  // The Hồ sơ training default when the server's day answers (lib/training-minutes)
  const trainingDefaultRef = useRef(profile.trainingMinutesDefault);
  useEffect(() => {
    trainingDefaultRef.current = profile.trainingMinutesDefault;
  }, [profile.trainingMinutesDefault]);

  // The signed-in account the data below belongs to; null when nobody is signed in (then nothing is read or
  // written). Demo mode ignores it: demo has its own keys.
  const [accountId, setAccountId] = useState<string | null>(null);
  // goal100 (lib/haptics): the vitamins and minerals over 100 % at the last look (null: not looked yet), and whether
  // the next change of the day comes from a local add. Only a local add vibrates, never a refetch.
  const overTarget = useRef<Set<string> | null>(null);
  const pendingGoalCheck = useRef(false);
  const pathname = usePathname();
  // Bumped when a write or a sync answers: the outbox changed, so the Chưa lưu markers are worked out again
  const [syncVersion, setSyncVersion] = useState(0);
  // The server's day was read since this account loaded: only then is an unconfirmed entry sent again
  const [serverDayRead, setServerDayRead] = useState(false);
  // The refetch running (its account and start): focus and visibilitychange fire together, one refetch is enough.
  // One older than REFRESH_STALE_MS no longer blocks (a request frozen while a phone had the tab in the background).
  const refreshing = useRef<{ account: string; at: number } | null>(null);

  const markSynced = useCallback((ids: readonly string[]) => {
    if (ids.length === 0) return;
    const saved = new Set(ids);
    setEdits((prev) =>
      prev.added.some((e) => saved.has(e.id) && !e.synced)
        ? { ...prev, added: prev.added.map((e) => (saved.has(e.id) && !e.synced ? { ...e, synced: true } : e)) }
        : prev
    );
  }, []);

  // Review 05:30 M1: one "unsaved" toast per app open from syncs (each write the user just made still says so)
  const unsavedShown = useRef(false);
  const showNotice = useCallback((notice: ReturnType<typeof syncNotice>) => {
    if (!notice) return;
    if (notice.kind === "unsaved") unsavedShown.current = true;
    setToast({ message: notice.message, kind: notice.kind, mealSlot: null, durationMs: NOTICE_TOAST_MS });
  }, []);

  const onSync = useCallback(
    (result: SyncResult) => {
      setSyncVersion((v) => v + 1);
      markSynced(result.saved);
      showNotice(syncNotice(result.held, unsavedShown.current));
    },
    [markSynced, showNotice]
  );

  // The answer to one diary write of entry `id` (the bump on start shows Đang lưu… in the header)
  const track = useCallback(
    (id: string, write: Promise<WriteResult>, date?: string) => {
      setSyncVersion((v) => v + 1);
      write
        .then((result) => {
          setSyncVersion((v) => v + 1);
          if (result.state === "saved") markSynced([id]);
          if (result.state === "held") {
            haptic("error");
            const day = date ?? getTodayIsoVN();
            showNotice(syncNotice([{ id, status: result.status ?? 0, message: result.message ?? "", date: day, final: result.final === true }], false));
          }
        })
        .catch(() => {});
    },
    [markSynced, showNotice]
  );

  // A food without a server row (a recipe made in the app) is never sent: it stays on this device (Chỉ trên máy này)
  const sendAdd = useCallback(
    (entry: AddedDiaryEntry, date: string) => {
      if (!isLocalOnly(entry)) track(entry.id, apiClient.addEntry(addPayload(entry, date)), date);
    },
    [track]
  );

  const refreshRemoteDay = useCallback((iso: string, options: { retryHeld?: boolean } = {}): Promise<void> => {
    const account = currentAccountId();
    if (!isLiveMode() || demo || !account) return Promise.resolve();
    const startedAt = Date.now();
    const running = refreshing.current;
    if (running?.account === account && startedAt - running.at < REFRESH_STALE_MS) return Promise.resolve();
    const mine = { account, at: startedAt };
    refreshing.current = mine;
    const pendingAtStart = pendingWriteIds();

    return syncOfflineOutbox(options)
      .then((result) => {
        onSync(result);
        return apiClient.getDay(iso);
      })
      .then((daySummary) => {
        // Not read (offline, 401 after the session refresh, 5xx): the device keeps what it has. Another account signed
        // in meanwhile: this day is not theirs
        if (!daySummary || !Array.isArray(daySummary.meals) || currentAccountId() !== account) return;
        rememberServerTraining(account, iso, daySummary.training_minutes, trainingDefaultRef.current);
        const serverEntries: AddedDiaryEntry[] = [];
        for (const meal of daySummary.meals) {
          for (const e of meal.entries || []) {
            serverEntries.push({
              id: e.id,
              foodId: e.food_id || "",
              foodName: e.food_name || "Món ăn",
              grams: e.grams,
              displayQty: e.serving_label || `${e.grams} g`,
              mealSlot: (e.meal_slot === "preworkout" ? "pre_workout" : e.meal_slot) as MealSlot,
              // A NULL kcal (unknown, migration 000011) stays null: it adds nothing to a total and is not shown as a measured 0
              calories: typeof e.calories === "number" ? e.calories : null,
              protein: (e.nutrients?.protein as number | null) ?? null,
              carbs: (e.nutrients?.carbs as number | null) ?? null,
              fat: (e.nutrients?.fat as number | null) ?? null,
              fiber: (e.nutrients?.fiber as number | null) ?? null,
              nutrients: (e.nutrients as Record<string, number | null>) ?? {},
              addedAt: e.created_at || new Date().toISOString(),
              synced: true,
            });
          }
        }
        setEdits((prev) => {
          // A write queued, being sent, or started since the refetch did: the device's version of that entry stays
          const keep = new Set([...pendingAtStart, ...pendingWriteIds(), ...writtenSince(startedAt)]);
          return { ...prev, added: mergeServerDay(prev.added, serverEntries, { keep, startedAt }) };
        });
        setServerDayRead(true);
      })
      .catch((error: unknown) => reportClientError({ kind: "sync", message: errorText(error) }))
      .finally(() => {
        if (refreshing.current === mine) refreshing.current = null;
      });
  }, [demo, onSync]);

  // Reads one account's (or demo's) data into state. Everything is in localStorage under the account's keys; the
  // old unscoped keys and an old sessionStorage copy move to the first account that loads, once.
  const loadData = useCallback((account: string | null, demoNow: boolean, iso: string) => {
    const local = browserLocal();
    if (!demoNow && account) adoptLegacyKeys(local, browserSession(), account);
    const own = local ? keyedStorage(local, demoNow, account) : null;
    let added: AddedDiaryEntry[] = [];
    let sample: SampleEdits = {};
    let recents: RecentFood[] = demoNow ? DEFAULT_RECENT_FOODS : [];
    try {
      added = parseAddedEntries(own?.getItem(ADDED_ENTRIES_KEY) ?? null);
      sample = parseSampleEdits(own?.getItem(SAMPLE_EDITS_KEY) ?? null);
      const storedRecents = own?.getItem(RECENT_FOODS_KEY) ?? null;
      if (storedRecents) {
        const parsed: unknown = JSON.parse(storedRecents);
        if (Array.isArray(parsed) && parsed.length > 0) recents = parsed.filter(isRecentFood);
      }
    } catch {
      // Ignore storage access errors
    }
    // Entries of earlier days are filed by date in the same step, so today starts with today's entries only
    // Entries of a recipe that has since reached the server name its server food, so they are sent
    const split = splitByDay(withServerFoods(added, readRecipes()), iso);
    setEdits({ added: split.today, sample, undo: null });
    setArchive(mergeArchive(parseArchive(own?.getItem(DAY_ARCHIVE_KEY) ?? null), split.past));
    setRecentFoods(recents);
    setFavouriteIds(readFavouriteIds(own));
    setSavedMeals(readSavedMeals(own));
    // This account's recipes (cc-27b) become foods of the catalogue, so search and entries find them
    syncRecipeFoods();

    setServerDayRead(false);
    unsavedShown.current = false;
    if (isLiveMode() && account && !demoNow) {
      refreshRemoteDay(iso, { retryHeld: true });

      apiClient.getFavourites().then((favs) => {
        if (Array.isArray(favs) && favs.length > 0) {
          setFavouriteIds(favs.map((f: any) => (typeof f === "string" ? f : f.food_id || f.id)));
        }
      }).catch(() => {});

      apiClient.getRecents().then((rcnts) => {
        if (Array.isArray(rcnts) && rcnts.length > 0) {
          setRecentFoods(rcnts.map((f: any) => ({
            foodId: f.foodId || f.food_id || f.id,
            servingLabel: f.servingLabel || f.serving_label || f.servings?.[0]?.label || "100 g",
          })));
        }
      }).catch(() => {});

      // Recipes made before they were saved on the server get their server food, once the ingredients are known
      apiClient.loadAllFoods().then(() => uploadPendingRecipes(account)).catch(() => {});
    }
  }, [refreshRemoteDay]);

  // Load on mount (client-only)
  useEffect(() => {
    // Before anything that depends on today renders, so history and weights are in place with it
    const demoNow = isDemo();
    setDemoActive(demoNow);
    setDemo(demoNow);
    const account = currentAccountId();
    setAccountId(account);
    const iso = getTodayIsoVN();
    try {
      loadData(account, demoNow, iso);
    } finally {
      setTodayIso(iso);
      const loaded = loadProfile(new Date().getFullYear());
      // Demo mode only: ?as= and ?level= pick a mock account (lib/demo-persona). Applied before anything renders
      // from the role, so a gated page never flashes its 404 for the wrong account.
      const persona = demoNow ? personaPatch(window.location.search, isLiveMode()) : null;
      const seeded = persona ? { ...loaded, ...persona } : loaded;
      if (persona) writeStoredProfile(seeded);
      setProfile(seeded);
      if (isLiveMode() && account && !demoNow) {
        apiClient.getProfile().then((serverProfile) => {
          if (serverProfile) {
            writeStoredProfile(serverProfile);
            setProfile(serverProfile);
          }
        }).catch(() => {});
      }
      setHydrated(true);
    }
  }, [loadData]);

  // Sync when the app comes back: reconnect, window focus, the tab shown again (a phone switching back to the
  // browser), or the page restored from the back-forward cache. The session cookie is renewed first.
  useEffect(() => {
    if (!isLiveMode() || demo) return;
    const handleSync = () => {
      const iso = todayIsoRef.current || getTodayIsoVN();
      refreshServerSession().then(() => refreshRemoteDay(iso)).catch(() => {});
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleSync();
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) handleSync();
    };
    window.addEventListener("online", handleSync);
    window.addEventListener("focus", handleSync);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", handleSync);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [demo, refreshRemoteDay]);

  // Hôm nay refetches the day every minute while in front and online (never while a write is being sent), so a food
  // added on another device shows up. The session cookie is renewed every 10 min while the app is in front.
  useEffect(() => {
    if (!isLiveMode() || demo || !accountId) return;
    const inFront = () => document.visibilityState === "visible";
    const poll = setInterval(() => {
      if (pathname !== HOME_ROUTE || !inFront() || !navigator.onLine || writesInFlight() > 0) return;
      refreshRemoteDay(todayIsoRef.current || getTodayIsoVN());
    }, DAY_POLL_MS);
    const keepAlive = setInterval(() => {
      if (inFront()) void refreshServerSession();
    }, SESSION_REFRESH_MS);
    return () => {
      clearInterval(poll);
      clearInterval(keepAlive);
    };
  }, [demo, accountId, pathname, refreshRemoteDay]);

  // An entry of today the server never confirmed and nothing is sending (an add refused before cc-49, or one whose
  // write was dropped) is sent again. Only after the server's day was read, which confirms the entries it has.
  useEffect(() => {
    if (!isLiveMode() || demo || !accountId || !serverDayRead || !todayIso) return;
    const pending = pendingWriteIds();
    for (const e of edits.added) {
      if (!e.synced && isUuid(e.id) && !isLocalOnly(e) && !pending.has(e.id)) sendAdd(e, todayIso);
    }
  }, [edits.added, serverDayRead, demo, accountId, todayIso, sendAdd, syncVersion]);

  // A recipe got its server food (lib/recipe-store, which refreshes the catalogue): today's entries that name its
  // local id (Chỉ trên máy này) name the server food, and the effect above sends them
  useEffect(() => {
    if (!hydrated) return;
    return subscribeCatalog(() => {
      setEdits((prev) => {
        const added = withServerFoods(prev.added, readRecipes());
        return added === prev.added ? prev : { ...prev, added };
      });
    });
  }, [hydrated]);

  // Another account signed in, or this one signed out (Đăng xuất keeps the data under its account): the
  // state of the account before is dropped and the new one's is read. The persist effects below then write to
  // the new keys, never the old data to the new account.
  useEffect(() => {
    if (!hydrated || demo) return;
    const now = currentAccountId();
    if (now === accountId) return;
    setAccountId(now);
    // The new account's day is a first look: what is over 100 % there does not vibrate
    overTarget.current = null;
    pendingGoalCheck.current = false;
    loadData(now, false, todayIso ?? getTodayIsoVN());
    // The profile is per account too: without this, account B would keep A's targets until a reload
    setProfile(loadProfile(new Date().getFullYear()));
    if (isLiveMode() && now) {
      apiClient.getProfile().then((serverProfile) => {
        if (serverProfile) {
          writeStoredProfile(serverProfile);
          setProfile(serverProfile);
        }
      }).catch(() => {});
    }
  }, [pathname, hydrated, demo, accountId, loadData, todayIso]);

  // The storage this account (or demo) writes to; without an account it reads and writes nothing
  const ownStorage = useCallback((): KeyValueStore | null => {
    const local = browserLocal();
    return local ? keyedStorage(local, demo, accountId) : null;
  }, [demo, accountId]);

  // Persist favourites only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    writeFavouriteIds(favouriteIds, ownStorage());
  }, [favouriteIds, hydrated, ownStorage]);

  // Persist saved meals only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    writeSavedMeals(savedMeals, ownStorage());
  }, [savedMeals, hydrated, ownStorage]);

  // Persist added entries and sample edits only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    try {
      const own = ownStorage();
      own?.setItem(ADDED_ENTRIES_KEY, JSON.stringify(edits.added));
      own?.setItem(SAMPLE_EDITS_KEY, JSON.stringify(edits.sample));
    } catch {
      // Ignore quota/access errors
    }
  }, [edits.added, edits.sample, hydrated, ownStorage]);

  // The latest list and date, for the midnight timer (it must not restart on every added entry)
  const addedRef = useRef(edits.added);
  const todayIsoRef = useRef(todayIso);
  useEffect(() => {
    addedRef.current = edits.added;
    todayIsoRef.current = todayIso;
  }, [edits.added, todayIso]);

  // The date moved on (the app was open at midnight, or closed overnight): yesterday's entries leave today's list
  // and are filed by date, so the new day starts empty and the old one shows in the history
  useEffect(() => {
    if (!hydrated || !todayIso) return;
    const { today, past } = splitByDay(edits.added, todayIso);
    if (today === edits.added) return;
    setEdits((prev) => ({ ...prev, added: splitByDay(prev.added, todayIso).today }));
    setArchive((prev) => mergeArchive(prev, past));
  }, [hydrated, todayIso, edits.added]);

  // Persist the archive only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    try {
      ownStorage()?.setItem(DAY_ARCHIVE_KEY, JSON.stringify(archive));
    } catch {
      // Ignore quota/access errors
    }
  }, [archive, hydrated, ownStorage]);

  // The clock reaches midnight while the app is open, or the tab comes back to the foreground on another day
  useEffect(() => {
    if (!hydrated) return;
    // Filing the earlier days and moving the date are one batch, so no screen sees the new date with old entries
    const refresh = () => {
      const now = getTodayIsoVN();
      if (now === todayIsoRef.current) return;
      const { today, past } = splitByDay(addedRef.current, now);
      if (today !== addedRef.current) {
        setEdits((prev) => ({ ...prev, added: splitByDay(prev.added, now).today }));
        setArchive((prev) => mergeArchive(prev, past));
      }
      setTodayIso(now);
    };
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      // One second after midnight, then again for the next one
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, msUntilNextDay(new Date()) + 1000);
    };
    schedule();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [hydrated]);

  // Persist recent foods only after hydrated
  useEffect(() => {
    if (!hydrated) return;
    // The sample recents are never saved: a real account must not inherit them when demo mode goes off
    if (recentFoods === DEFAULT_RECENT_FOODS) return;
    try {
      ownStorage()?.setItem(RECENT_FOODS_KEY, JSON.stringify(recentFoods));
    } catch {
      // Ignore
    }
  }, [recentFoods, hydrated, ownStorage]);

  useEffect(() => {
    toastStartedAt.current = Date.now();
  }, [toast]);

  // A parked delete lives until its time is up, or until its undo record is gone (another action dismissed it)
  useEffect(() => {
    if (!parkedDelete) return;
    if (!edits.undo) {
      setParkedDelete(null);
      return;
    }
    const timer = setTimeout(() => {
      setParkedDelete(null);
      setEdits((prev) => dismissUndoIn(prev));
    }, Math.max(0, parkedDelete.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [parkedDelete, edits.undo]);

  // Auto-dismiss the toast. When a "deleted" toast goes, the undo goes with it; a "moved" toast has its own undo
  // (in the toast) and leaves a delete's record alone.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
      if (toast.kind !== "moved") setEdits((prev) => dismissUndoIn(prev));
    }, toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast]);

  // Remember a food with the serving it was logged with
  const addRecentFood = useCallback((food: FoodItem, servingLabel: string) => {
    setRecentFoods((prev) => pushRecent(prev, { foodId: food.id, servingLabel }));
  }, []);

  // Add a food entry
  const addFoodEntry = useCallback(
    async (food: FoodItem, grams: number, mealSlot: MealSlot, servingLabel?: string, options?: { undoable?: boolean; id?: string }) => {
      // Unknown energy is not 0: nothing is logged, and the caller shows NO_ENERGY_MESSAGE (a label supplement can, canLog)
      if (!canLog(food)) return false;
      const numbers = entryNumbers(food, grams);
      const qty = servingLabel || `${formatAmount(grams, "g")} g`;

      const newEntry: AddedDiaryEntry = {
        id: options?.id ?? generateUuid(),
        foodId: serverFoodIdOf(food.id),
        foodName: food.nameVi,
        grams,
        displayQty: qty,
        mealSlot,
        ...numbers,
        addedAt: new Date().toISOString(),
      };

      setEdits((prev) => ({ ...prev, added: [...prev.added, newEntry] }));
      pendingGoalCheck.current = true;
      haptic("saved");

      const mealNameVi = getMealSlotNameVi(mealSlot);
      setEdits((prev) => dismissUndoIn(prev));
      setToast(
        options?.undoable
          ? {
              message: `Đã thêm ${food.nameVi} ${qty} vào ${mealNameVi}`,
              kind: "undoable",
              mealSlot,
              durationMs: UNDO_TOAST_MS,
              undoIds: [newEntry.id],
            }
          : {
              message: `Đã thêm ${food.nameVi} ${qty} vào ${mealNameVi}`,
              kind: "added",
              mealSlot,
              durationMs: ADDED_TOAST_MS,
            }
      );

      addRecentFood(food, qty);

      if (isLiveMode()) sendAdd(newEntry, todayIso || getTodayIsoVN());

      return true;
    },
    [addRecentFood, todayIso, sendAdd]
  );

  const addFoodEntries = useCallback(
    (items: Array<{ food: FoodItem; grams: number; label: string; id?: string }>, mealSlot: MealSlot) => {
      if (items.length === 0 || !items.every((i) => canLog(i.food))) return false;
      const addedAt = new Date().toISOString();
      const entries: AddedDiaryEntry[] = items.map(({ food, grams, label, id }) => ({
        id: id ?? generateUuid(),
        foodId: serverFoodIdOf(food.id),
        foodName: food.nameVi,
        grams,
        displayQty: label || `${formatAmount(grams, "g")} g`,
        mealSlot,
        ...entryNumbers(food, grams),
        addedAt,
      }));
      setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, ...entries] }));
      pendingGoalCheck.current = true;
      haptic("saved");
      setToast({
        message: `Đã thêm ${entries.length} món vào ${getMealSlotNameVi(mealSlot)}`,
        kind: "undoable",
        mealSlot,
        durationMs: UNDO_TOAST_MS,
        undoIds: entries.map((e) => e.id),
      });
      items.forEach(({ food, label }) => addRecentFood(food, label));
      if (isLiveMode()) entries.forEach((e) => sendAdd(e, todayIso || getTodayIsoVN()));
      return true;
    },
    [addRecentFood, todayIso, sendAdd]
  );

  const dismissToast = useCallback(() => {
    setToast(null);
    setEdits((prev) => dismissUndoIn(prev));
  }, []);

  const isFavourite = useCallback((foodId: string) => favouriteIds.includes(foodId), [favouriteIds]);

  const toggleFavourite = useCallback((food: FoodItem) => {
    const willBeFavourite = !favouriteIds.includes(food.id);
    setFavouriteIds((prev) => toggleFavouriteId(prev, food.id));
    if (isLiveMode()) {
      if (willBeFavourite) {
        apiClient.addFavourite(food.id).catch(() => {});
      } else {
        apiClient.removeFavourite(food.id).catch(() => {});
      }
    }
  }, [favouriteIds]);

  const getEntry = useCallback((id: string) => findEntry(edits, id, samples), [edits, samples]);

  const updateEntry = useCallback((id: string, patch: EntryPatch) => {
    setEdits((prev) => updateEntryIn(prev, id, patch, samples));
    if (isLiveMode()) {
      track(
        id,
        apiClient.updateEntry(id, {
          meal_slot: patch.mealSlot,
          grams: patch.grams,
          serving_size_g: patch.grams,
          serving_label: patch.servingLabel,
          calories: patch.quick?.calories,
        })
      );
    }
  }, [samples, track]);

  const deleteEntry = useCallback(
    (id: string) => {
      const view = findEntry(edits, id, samples);
      if (!view) return;
      setEdits((prev) => deleteEntryIn(prev, id, samples));
      haptic("delete");
      setParkedDelete(null);
      setToast({ message: `Đã xóa ${view.name}`, kind: "deleted", mealSlot: null, durationMs: UNDO_TOAST_MS });
      if (isLiveMode()) track(id, apiClient.deleteEntry(id));
    },
    [edits, samples, track]
  );

  const deleteMeal = useCallback(
    (slot: MealSlot) => {
      const ids = mealEntryIds(edits, slot, samples);
      const count = ids.length;
      if (count === 0) return;
      setEdits((prev) => deleteMealIn(prev, slot, samples));
      haptic("delete");
      setParkedDelete(null);
      setToast({
        message: `Đã xóa ${getMealSlotNameVi(slot)} · ${count} món`,
        kind: "deleted",
        mealSlot: null,
        durationMs: UNDO_TOAST_MS,
      });
      if (isLiveMode()) ids.forEach((id) => track(id, apiClient.deleteEntry(id)));
    },
    [edits, samples, track]
  );

  const deleteEntries = useCallback(
    (ids: string[], dayIso: string) => {
      // A past day is read-only: its entries are not in the edits, and nothing here may touch today's
      if (!todayIso || dayIso !== todayIso) return;
      const count = ids.filter((id) => findEntry(edits, id, samples) !== null).length;
      if (count === 0) return;
      setEdits((prev) => deleteEntriesIn(prev, ids, samples));
      haptic("delete");
      setParkedDelete(null);
      setToast({ message: `Đã xóa ${count} món`, kind: "deleted", mealSlot: null, durationMs: UNDO_TOAST_MS });
      if (isLiveMode()) ids.forEach((id) => track(id, apiClient.deleteEntry(id)));
    },
    [edits, samples, todayIso, track]
  );

  const moveEntries = useCallback(
    (ids: string[], slot: MealSlot, dayIso: string) => {
      if (!todayIso || dayIso !== todayIso) return;
      const count = ids.filter((id) => findEntry(edits, id, samples) !== null).length;
      if (count === 0) return;
      // A move has its own undo (the toast carries it). A delete's toast it replaces is parked under it, so both
      // Hoàn tác stay reachable.
      const undoMoves = slotsBeforeMove(edits, ids, slot, samples);
      if (toast?.kind === "deleted" && edits.undo) {
        const expiresAt = toastStartedAt.current + toast.durationMs;
        if (expiresAt > Date.now()) setParkedDelete({ toast, expiresAt });
      }
      setEdits((prev) => moveEntriesIn(prev, ids, slot, samples));
      haptic("moveDrop");
      setToast({
        message: `Đã chuyển ${count} món sang ${getMealSlotNameVi(slot)}`,
        kind: undoMoves.length > 0 ? "moved" : "added",
        mealSlot: slot,
        durationMs: UNDO_TOAST_MS,
        undoMoves,
      });
      if (isLiveMode()) ids.forEach((id) => track(id, apiClient.updateEntry(id, { meal_slot: slot })));
    },
    [edits, samples, todayIso, toast, track]
  );

  const undoMove = useCallback(() => {
    const moves = toast?.undoMoves;
    if (!moves) return;
    setEdits((prev) => restoreSlotsIn(prev, moves, samples));
    haptic("undo");
    if (isLiveMode()) moves.forEach((m) => track(m.id, apiClient.updateEntry(m.id, { meal_slot: m.slot })));
    setToast(null);
  }, [toast, samples, track]);

  const undoLastDelete = useCallback(() => {
    const lastUndo = edits.undo;
    setEdits((prev) => undoDeleteIn(prev));
    haptic("undo");
    if (isLiveMode() && lastUndo) {
      if (lastUndo.kind === "added") {
        if (lastUndo.entry.synced) track(lastUndo.entry.id, apiClient.restoreEntry(lastUndo.entry.id));
        else sendAdd(lastUndo.entry, todayIso || getTodayIsoVN());
      } else if (lastUndo.kind === "sample") {
        track(lastUndo.id, apiClient.restoreEntry(lastUndo.id));
      }
    }
    setToast(null);
  }, [edits.undo, track, sendAdd, todayIso]);

  const undoParkedDelete = useCallback(() => {
    setEdits((prev) => undoDeleteIn(prev));
    haptic("undo");
    setParkedDelete(null);
  }, []);

  const copyEntries = useCallback((copied: AddedDiaryEntry[], message: string) => {
    if (copied.length === 0) return;
    const entries = withNewIds(copied);
    setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, ...entries] }));
    pendingGoalCheck.current = true;
    haptic("saved");
    setToast({
      message,
      kind: "undoable",
      mealSlot: null,
      durationMs: UNDO_TOAST_MS,
      undoIds: entries.map((e) => e.id),
    });
    if (isLiveMode()) entries.forEach((e) => sendAdd(e, todayIso || getTodayIsoVN()));
  }, [todayIso, sendAdd]);

  const undoCopy = useCallback(() => {
    const ids = toast?.undoIds;
    if (!ids) return;
    setEdits((prev) => removeAddedIn(prev, ids));
    haptic("undo");
    setToast(null);
    // The entries were already sent: undo removes them on the server too, or they come back on the next load
    if (isLiveMode()) ids.forEach((id) => track(id, apiClient.deleteEntry(id)));
  }, [toast, track]);

  const mealFoods = useCallback(
    (slot: MealSlot, iso: string) => {
      const today = todayIso ?? getTodayIsoVN();
      const items =
        iso === today
          ? mealPortions(edits, slot, samples)
          : itemsFromEntries(dayEntries(iso, today).filter((e) => e.mealSlot === slot));
      // Only foods the catalogue has: what is saved is what one tap can add back
      return items.filter((item) => MOCK_FOODS.some((f) => f.id === item.foodId));
    },
    [edits, samples, todayIso, archive]
  );

  const saveMealAs = useCallback(
    (slot: MealSlot, iso: string, name: string) => {
      const items = mealFoods(slot, iso);
      const meal = buildSavedMeal({
        id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        fallbackName: defaultMealName(slot, iso),
        items,
        createdAt: new Date().toISOString(),
      });
      if (!meal) return false;
      setSavedMeals((prev) => [meal, ...prev]);
      setEdits((prev) => dismissUndoIn(prev));
      setToast({
        message: `Đã lưu ${meal.name} vào Bữa ăn của tôi · ${meal.items.length} món`,
        kind: "saved",
        mealSlot: null,
        durationMs: ADDED_TOAST_MS,
      });
      return true;
    },
    [mealFoods]
  );

  const renameSavedMeal = useCallback((id: string, name: string) => {
    setSavedMeals((prev) => renameSavedMealIn(prev, id, name));
  }, []);

  const deleteSavedMeal = useCallback((id: string) => {
    setSavedMeals((prev) => removeSavedMeal(prev, id));
  }, []);

  const addSavedMeal = useCallback(
    (meal: SavedMeal, slot: MealSlot) => {
      const stamp = Date.now();
      const entries = withNewIds(savedMealEntries(meal, MOCK_FOODS, slot, `sm-${stamp}`, new Date(stamp).toISOString()));
      const skipped = savedMealSkipped(meal, MOCK_FOODS);
      if (entries.length === 0) {
        // Nothing can be added: say why instead of doing nothing
        if (skipped > 0) setToast({ message: NO_ENERGY_MESSAGE, kind: "notice", mealSlot: null, durationMs: NOTICE_TOAST_MS });
        return;
      }
      // The recents remember each food with the portion the meal used
      setRecentFoods((prev) =>
        [...entries].reverse().reduce((list, e) => pushRecent(list, { foodId: e.foodId, servingLabel: e.displayQty }), prev)
      );
      setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, ...entries] }));
      pendingGoalCheck.current = true;
      haptic("saved");
      setToast({
        message: `Đã thêm ${meal.name} · ${entries.length} món vào ${getMealSlotNameVi(slot)}${
          skipped > 0 ? `. ${skipped} món chưa có kcal nên chưa thêm` : ""
        }`,
        kind: "undoable",
        mealSlot: slot,
        durationMs: UNDO_TOAST_MS,
        undoIds: entries.map((e) => e.id),
      });
      if (isLiveMode()) entries.forEach((e) => sendAdd(e, todayIso || getTodayIsoVN()));
    },
    [todayIso, sendAdd]
  );

  const addQuickEntry = useCallback(
    (input: QuickEntryInput, slot: MealSlot): QuickEntryResult => {
      const now = Date.now();
      const entryId = generateUuid();
      const result = quickEntryFrom(input, slot, entryId, new Date(now).toISOString());
      if (!result.ok) return result;
      const { entry } = result;
      setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, entry] }));
      pendingGoalCheck.current = true;
      haptic("saved");
      setToast({
        message: `Đã thêm ${entry.foodName} · ${formatAmount(entry.calories, "kcal")} kcal vào ${getMealSlotNameVi(slot)}`,
        kind: "undoable",
        mealSlot: slot,
        durationMs: UNDO_TOAST_MS,
        undoIds: [entry.id],
      });
      if (isLiveMode()) sendAdd(entry, todayIso || getTodayIsoVN());
      return result;
    },
    [todayIso, sendAdd]
  );

  // Chưa lưu: a write of the entry is queued (or refused), or the server never confirmed it and nothing is sending it.
  // The second part waits for the first read of the server's day, which confirms the entries it already has.
  const unsavedIds = useMemo(() => {
    if (!isLiveMode() || demo || !hydrated) return new Set<string>();
    const queued = new Set(getPendingOfflineEntryIds());
    const pending = pendingWriteIds();
    return new Set(
      edits.added
        .filter((e) => !isLocalOnly(e) && (queued.has(e.id) || (serverDayRead && !e.synced && !pending.has(e.id))))
        .map((e) => e.id)
    );
    // syncVersion: the outbox changed
  }, [edits.added, syncVersion, demo, hydrated, serverDayRead]);
  // Entries that can never reach the server: the row says Chỉ trên máy này (review 05:30 M1)
  const localOnlyIds = useMemo(
    () => (isLiveMode() && !demo ? new Set(edits.added.filter(isLocalOnly).map((e) => e.id)) : new Set<string>()),
    [edits.added, demo]
  );

  const refreshToday = useCallback(
    () => refreshServerSession().then(() => refreshRemoteDay(todayIsoRef.current || getTodayIsoVN())),
    [refreshRemoteDay]
  );

  // syncVersion: bumped when a write starts and when it answers
  const saving = useMemo(() => isLiveMode() && !demo && writesInFlight() > 0, [syncVersion, demo]);

  const retryUnsaved = useCallback(() => {
    markUsed("retry-unsaved");
    unsavedShown.current = false;
    setToast(null);
    syncOfflineOutbox({ retryHeld: true }).then(onSync).catch(() => {});
  }, [onSync]);

  // Today's training minutes (lib/training-minutes): chosen on Ngày tập, else the server's, else Hồ sơ. Read after
  // mount, and again whenever a day's minutes change, so Hôm nay's pill and targets follow without a reload.
  const trainingV = useSyncExternalStore(subscribeTraining, trainingVersion, trainingVersion);
  const todayMinutes = useMemo(
    () => (hydrated && todayIso ? trainingMinutesFor(todayIso, profile) : profile.trainingMinutesDefault),
    // accountId: the saved days are per account; trainingV: a day's minutes changed
    [hydrated, todayIso, profile, accountId, trainingV]
  );
  const targets = useMemo(() => targetsFor(profile, todayMinutes), [profile, todayMinutes]);
  useMemo(() => setDayArchive(archive), [archive]);

  const nutrientSources = useCallback(
    (key: string) => nutrientSourcesIn(edits.added, edits.sample, key, samples),
    [edits, samples]
  );

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      const next = normaliseProfile({ ...profile, ...patch });
      setProfile(next);
      writeStoredProfile(next);
      if (isLiveMode()) {
        apiClient
          .saveSetup({
            sex: next.sex,
            birthYear: next.birthYear,
            weightKg: next.weightKg,
            goal: next.goal,
            periodMode: next.periodMode,
            trainingMinutesDefault: next.trainingMinutesDefault,
            displayName: next.displayName,
          })
          .catch(() => {});
        if (patch.weightKg !== undefined) {
          apiClient.updateWeight(todayIso || getTodayIsoVN(), patch.weightKg).catch(() => {});
        }
      }
    },
    [profile, todayIso]
  );

  // The catalogue version: a label supplement's entry counts as 0 kcal once its food is in the catalogue (labelZeros)
  const catalogV = useSyncExternalStore(subscribeCatalog, catalogVersion, catalogVersion);
  const compositeData = useMemo<MockDayData>(() => {
    // A real account starts from an empty day; only demo mode starts from the sample day
    const start = demo ? SAMPLE_DAY : blankDay(SAMPLE_DAY);
    const base = applyProfileTargets(start, profile, targets, todayMinutes);
    const day = computeCompositeDayData(base, edits.added, demo ? edits.sample : {});
    return todayIso ? withRuntimeDate(day, todayIso) : day;
  }, [edits.added, edits.sample, todayIso, profile, targets, todayMinutes, demo, catalogV]);

  // A vitamin or mineral that a local add brings to 100 % of its target today vibrates once that day (lib/haptics).
  // The ones over 100 % when the app opens, or after a refetch, are recorded without vibrating.
  useEffect(() => {
    if (!hydrated || !todayIso) return;
    const over = new Set([...compositeData.minerals, ...compositeData.vitamins].filter((n) => (n.percentage ?? 0) >= 100).map((n) => n.key));
    const before = overTarget.current;
    const localAdd = pendingGoalCheck.current;
    overTarget.current = over;
    pendingGoalCheck.current = false;
    if (goal100Reached(over, before, localAdd, (key) => firstGoalToday(key, todayIso))) haptic("goal100");
  }, [compositeData, hydrated, todayIso]);

  // Memoised so a toast or highlight change does not re-render every useDiary() consumer
  const contextValue = useMemo(
    () => ({
      data: compositeData,
      addedEntries,
      addFoodEntry,
      addFoodEntries,
      recentFoods,
      addRecentFood,
      toast,
      dismissToast,
      highlightedMeal,
      setHighlightedMeal,
      favouriteIds,
      isFavourite,
      toggleFavourite,
      getEntry,
      updateEntry,
      deleteEntry,
      deleteMeal,
      deleteEntries,
      moveEntries,
      undoMove,
      undoLastDelete,
      parkedDelete,
      undoParkedDelete,
      copyEntries,
      undoCopy,
      savedMeals,
      saveMealAs,
      mealFoods,
      renameSavedMeal,
      deleteSavedMeal,
      addSavedMeal,
      addQuickEntry,
      unsavedIds,
      localOnlyIds,
      retryUnsaved,
      refreshToday,
      saving,
      todayIso,
      dayArchive: archive,
      hydrated,
      demo,
      profile,
      targets,
      updateProfile,
      nutrientSources,
    }),
    [
      compositeData,
      addedEntries,
      addFoodEntry,
      addFoodEntries,
      recentFoods,
      addRecentFood,
      toast,
      dismissToast,
      highlightedMeal,
      setHighlightedMeal,
      favouriteIds,
      isFavourite,
      toggleFavourite,
      getEntry,
      updateEntry,
      deleteEntry,
      deleteMeal,
      deleteEntries,
      moveEntries,
      undoMove,
      undoLastDelete,
      parkedDelete,
      undoParkedDelete,
      copyEntries,
      undoCopy,
      savedMeals,
      saveMealAs,
      mealFoods,
      renameSavedMeal,
      deleteSavedMeal,
      addSavedMeal,
      addQuickEntry,
      unsavedIds,
      localOnlyIds,
      retryUnsaved,
      refreshToday,
      saving,
      todayIso,
      archive,
      hydrated,
      demo,
      profile,
      targets,
      updateProfile,
      nutrientSources,
    ]
  );

  return <DiaryContext.Provider value={contextValue}>{children}</DiaryContext.Provider>;
}

export function useDiary() {
  const ctx = useContext(DiaryContext);
  if (!ctx) {
    throw new Error("useDiary must be used within a DiaryProvider");
  }
  return ctx;
}
