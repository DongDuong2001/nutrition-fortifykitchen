"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { currentAccountId } from "./auth-actions";
import { SAMPLE_DAY, type MockDayData, type MockFoodItem } from "./mock/sample-day";
import { type FoodItem } from "./mock/foods";
import { type MealSlot, getMealSlotNameVi } from "./meal-slot";
import { formatAmount } from "./format";
import { portionAmountText } from "./portion";
import { sumKcal } from "./kcal";
import { getTodayIsoVN, withRuntimeDate } from "./date";
import { editableFrom, isEditableDay, pastDaysFor, yesterdayOf } from "./day-rules";
import { entriesOnDay, entryIso, isTodays, liftEditableDays, mergeArchive, msUntilNextDay, parseArchive, splitByDay, withEditableDays, type DayArchive } from "./day-archive";
import { isDemo, setDemoActive } from "./demo";
import {
  ADDED_ENTRIES_KEY,
  DAY_ARCHIVE_KEY,
  RECENT_FOODS_KEY,
  SAMPLE_EDITS_KEY,
  dropLegacyKeys,
  browserLocal,
  browserSession,
  keyedStorage,
  type KeyValueStore,
} from "./storage-keys";
import { blankDay, dayEntries, setDayArchive, statDisplay } from "./day-history";
import { useDocumentHidden } from "@/hooks/use-document-hidden";
import { whenIdle } from "./idle";
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
  hasPendingWrite,
  callEngine,
  outboxItems,
  outboxSummary,
  pendingFavouriteOps,
  pendingWriteIds,
  reportStorageFailure,
  reportStorageWorked,
  syncOfflineOutbox,
  watchAccountChange,
  watchOutbox,
  writesInFlight,
  type SyncResult,
  type WriteResult,
} from "./api-client";
import { refreshServerSession } from "./server-session";
import { openSyncList, registerSyncNow, setSyncSummary } from "./sync-ui";
import { isDiaryAdd, retryMessage, type RetryOutcome } from "./late-writes";
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
import { subscribeTraining, trainingMinutesFor, trainingVersion } from "./training-minutes";
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
  type DayFilter,
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
  kind: "added" | "deleted" | "undoable" | "saved" | "moved" | "notice" | "unsaved" | "left";
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
    options?: { undoable?: boolean; id?: string; day?: string }
  ) => Promise<boolean>;
  /**
   * The add tray: every item in one diary update and one toast whose Hoàn tác removes them all. False when an item has no
   * energy figure. An item's `id` is its entry's id when the caller keeps a link (the Ngày tập Red Bull + mật mía mix).
   */
  addFoodEntries: (items: Array<{ food: FoodItem; grams: number; label: string; id?: string }>, mealSlot: MealSlot, day?: string) => boolean;
  recentFoods: RecentFood[];
  addRecentFood: (food: FoodItem, servingLabel: string) => void;
  dismissToast: () => void;
  /** The pointer is on the toast, or focus is in it: its time stops until resumeToast. */
  pauseToast: () => void;
  resumeToast: () => void;
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
  /** Removes every entry of a meal of today (or of `dayIso`, when that day is editable), with one undo toast (Hoàn tác puts the whole meal back). */
  deleteMeal: (slot: MealSlot, dayIso?: string) => void;
  /**
   * Removes the chosen entries with ONE undo toast (Hoàn tác puts them all back). `dayIso` is the day the ids were picked
   * on: a day that can no longer be edited (older than yesterday) removes nothing.
   */
  deleteEntries: (ids: string[], dayIso: string) => void;
  /** Moves the chosen entries to a meal of their day. Like deleteEntries, a day that can no longer be edited does nothing. */
  moveEntries: (ids: string[], slot: MealSlot, dayIso: string) => void;
  /** Puts the entries of the last Chuyển bữa back. Only works while the "moved" toast is shown. */
  undoMove: () => void;
  /** Puts the last deleted entry back. Only works while the "deleted" toast is shown. */
  undoLastDelete: () => void;
  /** Hoàn tác of the parked delete. Leaves the toast on top alone. */
  undoParkedDelete: () => void;
  /** Adds copied entries to today (or to `day`, when that day is editable) in one step, with one undo toast. Existing entries are kept. */
  copyEntries: (entries: AddedDiaryEntry[], message: string, day?: string) => void;
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
  addSavedMeal: (meal: SavedMeal, slot: MealSlot, day?: string) => void;
  /** Chỉ ghi kcal: adds a quick entry with unknown micronutrients, with an undo toast. */
  addQuickEntry: (input: QuickEntryInput, slot: MealSlot, day?: string) => QuickEntryResult;
  /** Live mode: a diary write is being sent now (the header shows Đang lưu…, cc-51). */
  saving: boolean;
  /** Pull to refresh on Hôm nay (cc-51): the session is renewed, the outbox sent, and today read again. */
  refreshToday: () => Promise<void>;
  /** Live mode: today's entries the server has not saved yet. Each row shows Chưa lưu. */
  unsavedIds: ReadonlySet<string>;
  /** Live mode: today's entries whose food has no server row (a recipe made in the app): they stay on this device. */
  localOnlyIds: ReadonlySet<string>;
  /**
   * Thử lại (the "unsaved" toast, the Chưa lưu list): everything that has not reached the server is sent again, writes refused
   * for good included. It always says what happened (a toast), and resolves with the same numbers.
   */
  retryUnsaved: () => Promise<RetryOutcome>;
  /** Chuyển sang hôm nay: an add the server refuses for good is logged again on today, under the same entry. */
  moveUnsavedToToday: (key: string) => Promise<void>;
  /** Bỏ món này: the write leaves the outbox, and the entry it was for leaves this device. */
  discardUnsaved: (key: string) => Promise<void>;
  /** Today as YYYY-MM-DD (Asia/Ho_Chi_Minh). Null until mounted. */
  todayIso: string | null;
  /** Earlier days the user logged, by date (yesterday's entries included while it is editable); memo dependency for anything that calls dayEntries. */
  dayArchive: DayArchive;
  /**
   * Reads the days `isos` before the editable ones (S5: from the server, cached on this device) so history screens have
   * them: the calendar's month, Tổng quan's period, an older day on Hôm nay. Days already asked for are not asked again.
   */
  loadDays: (isos: readonly string[] | null) => void;
  /** Whether a day can be added to, edited and deleted from: today, and yesterday (lib/day-rules). False before mount and in demo for any earlier day. */
  isEditable: (iso: string) => boolean;
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

/**
 * cc-58: the toast on screen, the delete toast parked under it and the meal to highlight. They change with every
 * toast, so they live in their own context: a toast no longer re-renders every useDiary() consumer (48 of them). Only
 * the toast host (components/diary-toast) reads them, with useDiaryToast().
 */
export interface DiaryToastState {
  toast: ToastInfo | null;
  /** A delete's toast that a Chuyển bữa toast pushed aside: still shown under it with its own time left. */
  parkedDelete: ParkedToast | null;
  highlightedMeal: MealSlot | null;
}

const DiaryContext = createContext<DiaryContextValue | null>(null);
const DiaryToastContext = createContext<DiaryToastState | null>(null);


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
    ? { id: entry.id, kind: "quick", calories: entry.calories ?? undefined, mealSlot: entry.mealSlot, date, label: entry.foodName }
    : { id: entry.id, foodId: entry.foodId, grams: entry.grams, mealSlot: entry.mealSlot, date, servingLabel: entry.displayQty, label: entry.foodName };
}

/**
 * Copied entries get new uuids: the server keys an entry by its id, and a copy is a new entry. A recipe's entry
 * names its server food once it has one. The copy belongs to `day`, whatever day it was copied from.
 */
function withNewIds(entries: AddedDiaryEntry[], day: string): AddedDiaryEntry[] {
  return withServerFoods(entries.map((e) => ({ ...e, id: generateUuid(), synced: undefined, day })), readRecipes());
}

/** " hôm qua" after a message about an entry added to yesterday; nothing for today. */
function onDayText(day: string, todayIso: string): string {
  return day === todayIso ? "" : " hôm qua";
}


export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [demo, setDemo] = useState(false);
  // cc-68: `edits.added` holds the entries of every day that can be edited (today, and yesterday); `addedEntries` below is
  // today's alone, which is what the screens that know nothing of yesterday expect
  const [edits, setEdits] = useState<DiaryEdits>({ added: [], sample: {}, undo: null });
  // The sample day exists only in demo mode: without it no sample item can be found, edited or counted
  const samples = useMemo(() => (demo ? SAMPLE_ITEMS : []), [demo]);
  // Empty until mount; the sample recents are seeded only in demo mode
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [parkedDelete, setParkedDelete] = useState<ParkedToast | null>(null);
  // When the toast on screen was set, so a delete's toast can keep its remaining time when it is parked
  const toastStartedAt = useRef(0);
  // The undo actions read the toast through this ref, so they keep one identity while toasts come and go
  const toastRef = useRef<ToastInfo | null>(null);
  toastRef.current = toast;
  const [highlightedMeal, setHighlightedMeal] = useState<MealSlot | null>(null);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  // Today's date, read after mount so the server and first client render agree
  const [todayIso, setTodayIso] = useState<string | null>(null);
  // Earlier days the user logged, filed by date (lib/day-archive); read by dayEntries for the history and Tổng quan
  const [archive, setArchive] = useState<DayArchive>({});
  // Same rule for the profile: the sample user until the saved one is read after mount
  const [profile, setProfile] = useState<Profile>(SAMPLE_PROFILE);

  // The signed-in account the data below belongs to; null when nobody is signed in (then nothing is read or
  // written). Demo mode ignores it: demo has its own keys.
  const [accountId, setAccountId] = useState<string | null>(null);
  // goal100 (lib/haptics): the vitamins and minerals over 100 % at the last look (null: not looked yet), and whether
  // the next change of the day comes from a local add. Only a local add vibrates, never a refetch.
  const overTarget = useRef<Set<string> | null>(null);
  const pendingGoalCheck = useRef(false);
  const pathname = usePathname();
  // How many days before today can be edited: 1 in a real account (lib/day-rules), 0 in demo and the mock
  const pastDays = pastDaysFor(isLiveMode(), demo);
  const pastDaysRef = useRef(pastDays);
  pastDaysRef.current = pastDays;
  const isEditable = useCallback((iso: string) => isEditableDay(iso, getTodayIsoVN(), pastDays), [pastDays]);
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
    (result: SyncResult, options: { quiet?: boolean } = {}) => {
      // A sync that sent nothing (the 60 s poll) changes nothing on screen
      if (result.saved.length > 0 || result.held.length > 0) setSyncVersion((v) => v + 1);
      markSynced(result.saved);
      if (!options.quiet) showNotice(syncNotice(result.held, unsavedShown.current));
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
            showNotice(syncNotice([{ id, status: result.status ?? 0, date: day, final: result.final === true }], false));
          }
        })
        .catch(() => {});
    },
    [markSynced, showNotice]
  );

  // A food without a server row (a recipe made in the app) is never sent: it stays on this device (Chỉ trên máy này).
  // S14: the day is the entry's own, worked out when the write is made (not the date the screen last showed, which is
  // wrong after the phone slept past midnight)
  const sendAdd = useCallback(
    (entry: AddedDiaryEntry) => {
      if (isLocalOnly(entry)) return;
      const date = entryIso(entry) ?? getTodayIsoVN();
      track(entry.id, apiClient.addEntry(addPayload(entry, date)), date);
    },
    [track]
  );

  // S5: days older than the editable ones are the server's; this device keeps a cache. The days already asked for are not asked again.
  const requestedDays = useRef(new Set<string>());
  const loadDays = useCallback(
    (isos: readonly string[] | null) => {
      const account = currentAccountId();
      if (isLiveMode() && !demo && account) void callEngine("requestDays", account, isos, pastDaysRef.current, requestedDays.current, (days) => setArchive((prev) => ({ ...prev, ...days })));
    },
    [demo]
  );

  // Days that left the editable list (the date moved on): kept in the history, the writes the server never confirmed sent again
  const fileDays = useCallback((past: DayArchive) => {
    setArchive((prev) => mergeArchive(prev, past));
    const account = currentAccountId();
    if (!isLiveMode() || !account) return;
    // Entries of those days the server never confirmed are sent again; a day beyond the window refuses them (lasting marker)
    void callEngine("saveHistoryDays", account, past).then((unsent) => unsent.forEach((e) => sendAdd(e)));
  }, [sendAdd]);

  /**
   * Sends the outbox, then reads the server's day: `iso` (today), and with `earlier` the days before it that can still be
   * edited (yesterday), each merged into the list by its own day.
   */
  const refreshRemoteDay = useCallback((iso: string, options: { retryHeld?: boolean; earlier?: boolean; force?: boolean } = {}): Promise<void> => {
    const account = currentAccountId();
    if (!isLiveMode() || demo || !account) return Promise.resolve();
    const startedAt = Date.now();
    const running = refreshing.current;
    if (running?.account === account && startedAt - running.at < REFRESH_STALE_MS) return Promise.resolve();
    const mine = { account, at: startedAt };
    refreshing.current = mine;
    const pendingAtStart = pendingWriteIds();

    const readDay = async (day: string) => {
      const apply = await callEngine("readServerDay", account, day, pendingAtStart, startedAt);
      if (!apply) return false;
      setEdits((prev) => {
        const added = apply(prev.added);
        return added === prev.added ? prev : { ...prev, added };
      });
      return true;
    };

    return syncOfflineOutbox(options)
      .then(async (result) => {
        onSync(result);
        // Today did not come (offline, a server error): the earlier days would not either, so they wait for the next refresh
        if (!(await readDay(iso))) return;
        setServerDayRead(true);
        if (options.earlier) {
          for (let back = Math.min(pastDaysRef.current, 7); back >= 1; back--) {
            if (currentAccountId() !== account) return;
            await readDay(editableFrom(iso, back));
          }
        }
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
    if (!demoNow && account) dropLegacyKeys(local, browserSession());
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
    // cc-68: yesterday stays in the list while it can be edited, and a day that was filed but can be edited again comes back
    const days = pastDaysFor(isLiveMode(), demoNow);
    const split = splitByDay(withServerFoods(added, readRecipes()), iso, editableFrom(iso, days));
    const filed = liftEditableDays(mergeArchive(parseArchive(own?.getItem(DAY_ARCHIVE_KEY) ?? null), split.past), iso, days);
    setEdits({ added: [...filed.lifted, ...split.today], sample, undo: null });
    setArchive(filed.archive);
    setRecentFoods(recents);
    setFavouriteIds(readFavouriteIds(own));
    setSavedMeals(readSavedMeals(own));
    // This account's recipes (cc-27b) become foods of the catalogue, so search and entries find them
    syncRecipeFoods();

    setServerDayRead(false);
    unsavedShown.current = false;
    if (isLiveMode() && account && !demoNow) {
      refreshRemoteDay(iso, { retryHeld: true, earlier: true });
      // S5: the days before the editable ones come from this device's cache at once (the old localStorage archive is moved into
      // it first, nothing lost) and from the server in the background once today is read
      requestedDays.current.clear();
      void (async () => {
        const { days: found, unsent } = await callEngine("initHistory", account, filed.archive, iso, days);
        // Entries of those days the server never confirmed are sent again; a day beyond the window refuses them (lasting marker)
        unsent.forEach((e) => sendAdd(e));
        if (currentAccountId() === account && Object.keys(found).length > 0) setArchive((prev) => ({ ...prev, ...found }));
      })();

      apiClient.getFavourites().then((favs) => {
        if (Array.isArray(favs) && favs.length > 0) {
          // S6: a favourite changed here and not sent yet is applied on top of the server's list
          const ids = favs.map((f: any) => (typeof f === "string" ? f : f.food_id || f.id));
          setFavouriteIds(pendingFavouriteOps().reduce((list, [foodId, on]) => (on ? (list.includes(foodId) ? list : [foodId, ...list]) : list.filter((id) => id !== foodId)), ids));
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
      // cc-58: when the browser is idle, not during the first paint (/add asks for it at once when it opens first)
      whenIdle(() => {
        apiClient.loadAllFoods().then(() => uploadPendingRecipes(account)).catch(() => {});
      });
    }
  }, [refreshRemoteDay]);

  // S6: the server's profile on load never overwrites a change made on this device that has not been sent yet (a profile
  // write waiting in the outbox is newer than what the server has). Once it is sent, the next load takes the server's.
  const adoptServerProfile = useCallback(() => {
    apiClient
      .getProfile()
      .then((serverProfile) => {
        if (!serverProfile || hasPendingWrite("profile")) return;
        writeStoredProfile(serverProfile);
        setProfile(serverProfile);
      })
      .catch(() => {});
  }, []);

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
        adoptServerProfile();
      }
      setHydrated(true);
    }
  }, [loadData, adoptServerProfile]);

  // cc-68: the outbox is read from disk once an account is there (the old localStorage array is moved over), and the
  // screens follow it: a write committed here or by another tab bumps syncVersion. The banner for "no room to save" is
  // wired once. Persistent storage is asked for after sign-in (Safari clears a site's data after 7 days otherwise).
  useEffect(() => {
    if (!isLiveMode() || demo || !accountId) return;
    const bump = () => setSyncVersion((v) => v + 1);
    const stop = watchOutbox(bump, () => void refreshRemoteDay(getTodayIsoVN(), { earlier: true }));
    // X1: another tab signed in as someone else (or out): this page's diary is not that account's. It drops everything and
    // reloads to the gate; nothing is merged and nothing is written meanwhile.
    const stopGuard = watchAccountChange(accountId, () => window.location.reload());
    void callEngine("loadOfflineOutbox").then(bump);
    return () => {
      stop();
      stopGuard();
    };
  }, [demo, accountId, refreshRemoteDay]);

  // Sync when the app comes back: reconnect, window focus, the tab shown again (a phone switching back to the
  // browser), or the page restored from the back-forward cache. The session cookie is renewed first.
  useEffect(() => {
    if (!isLiveMode() || demo) return;
    // The app is back (network, focus, tab shown): writes waiting out a backoff go now. Only the 60 s poll respects it.
    const handleSync = () => {
      const iso = todayIsoRef.current || getTodayIsoVN();
      refreshServerSession().then(() => refreshRemoteDay(iso, { earlier: true, force: true })).catch(() => {});
    };
    const onOnline = handleSync;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleSync();
      }
    };
    const onFocus = handleSync;
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) handleSync();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
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
      if (!inFront() || !navigator.onLine || writesInFlight() > 0) return;
      // Off Hôm nay only the outbox is sent (writes that waited out a backoff); the day is read again on Hôm nay
      if (pathname !== HOME_ROUTE) {
        void syncOfflineOutbox().then(onSync);
        return;
      }
      const today = todayIsoRef.current || getTodayIsoVN();
      // Yesterday is read again only while it is the day on screen (?date=)
      const onYesterday = new URLSearchParams(window.location.search).get("date") === yesterdayOf(today);
      refreshRemoteDay(today, { earlier: onYesterday });
    }, DAY_POLL_MS);
    const keepAlive = setInterval(() => {
      if (inFront()) void refreshServerSession();
    }, SESSION_REFRESH_MS);
    return () => {
      clearInterval(poll);
      clearInterval(keepAlive);
    };
  }, [demo, accountId, pathname, refreshRemoteDay, onSync]);

  // An entry of today the server never confirmed and nothing is sending (an add refused before cc-49, or one whose
  // write was dropped) is sent again. Only after the server's day was read, which confirms the entries it has.
  useEffect(() => {
    if (!isLiveMode() || demo || !accountId || !serverDayRead || !todayIso) return;
    const pending = pendingWriteIds();
    for (const e of edits.added) {
      if (!e.synced && isUuid(e.id) && !isLocalOnly(e) && !pending.has(e.id)) sendAdd(e);
    }
  }, [edits.added, serverDayRead, demo, accountId, todayIso, sendAdd, syncVersion]);

  // S5: once today's server day is read, the closed days of the last weeks are read too (cache first; the server for what the cache lacks)
  useEffect(() => {
    if (!isLiveMode() || demo || !accountId || !serverDayRead || !todayIso) return;
    loadDays(null);
  }, [demo, accountId, serverDayRead, todayIso, loadDays]);

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
    if (isLiveMode() && now) adoptServerProfile();
  }, [pathname, hydrated, demo, accountId, loadData, todayIso, adoptServerProfile]);

  // The storage this account (or demo) writes to; without an account it reads and writes nothing
  // One object per account, so the callbacks that read it stay the same until the account changes
  const ownStorageRef = useRef<{ local: KeyValueStore; demo: boolean; accountId: string | null; own: KeyValueStore } | null>(null);
  const ownStorage = useCallback((): KeyValueStore | null => {
    const local = browserLocal();
    if (!local) return null;
    const cached = ownStorageRef.current;
    if (cached && cached.local === local && cached.demo === demo && cached.accountId === accountId) return cached.own;
    const own = keyedStorage(local, demo, accountId);
    ownStorageRef.current = { local, demo, accountId, own };
    return own;
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

  // Everything the diary keeps in localStorage is written at once, in the effect that follows the change (cc-68, S3: a crash in
  // an idle window must not lose it), and a write that fails is told to the person: a lasting notice, not a swallowed error
  // ("Đã lưu" that was not). A "no room" banner is up until a write works again.
  const storageAlertUp = useRef(false);
  const persist = useCallback(
    (key: string, value: unknown) => {
      const own = ownStorage();
      if (!hydrated || !own) return;
      try {
        own.setItem(key, JSON.stringify(value));
        if (storageAlertUp.current) {
          storageAlertUp.current = false;
          reportStorageWorked();
        }
      } catch (error) {
        storageAlertUp.current = true;
        reportStorageFailure(error);
      }
    },
    [hydrated, ownStorage]
  );
  useEffect(() => persist(ADDED_ENTRIES_KEY, edits.added), [edits.added, persist]);
  useEffect(() => persist(SAMPLE_EDITS_KEY, edits.sample), [edits.sample, persist]);

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
    const keepFrom = editableFrom(todayIso, pastDays);
    const { today, past } = splitByDay(edits.added, todayIso, keepFrom);
    if (today === edits.added) return;
    setEdits((prev) => ({ ...prev, added: splitByDay(prev.added, todayIso, keepFrom).today }));
    fileDays(past);
  }, [hydrated, todayIso, edits.added, pastDays, fileDays]);

  // The archive: a real account keeps it in IndexedDB (lib/day-cache), not here (S4); demo and the mock keep their sample history here
  useEffect(() => {
    if (!isLiveMode() || demo) persist(DAY_ARCHIVE_KEY, archive);
  }, [archive, demo, persist]);

  // The clock reaches midnight while the app is open, or the tab comes back to the foreground on another day
  useEffect(() => {
    if (!hydrated) return;
    // Filing the earlier days and moving the date are one batch, so no screen sees the new date with old entries
    const refresh = () => {
      const now = getTodayIsoVN();
      if (now === todayIsoRef.current) return;
      const keepFrom = editableFrom(now, pastDaysRef.current);
      const { today, past } = splitByDay(addedRef.current, now, keepFrom);
      if (today !== addedRef.current) {
        setEdits((prev) => ({ ...prev, added: splitByDay(prev.added, now, keepFrom).today }));
        fileDays(past);
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
  }, [hydrated, fileDays]);

  // Recent foods. The sample recents are never saved: a real account must not inherit them when demo mode goes off
  useEffect(() => {
    if (recentFoods !== DEFAULT_RECENT_FOODS) persist(RECENT_FOODS_KEY, recentFoods);
  }, [recentFoods, persist]);

  useEffect(() => {
    toastStartedAt.current = Date.now();
  }, [toast]);

  // cc-63: while the app is hidden (another app in front) no toast clock runs, so a Hoàn tác cannot expire where nobody
  // sees it. The toast's own clock is frozen below; a parked delete keeps its time left by moving its end later.
  const docHidden = useDocumentHidden();
  const hiddenAt = useRef(0);

  // A parked delete lives until its time is up, or until its undo record is gone (another action dismissed it)
  useEffect(() => {
    if (!parkedDelete) return;
    if (!edits.undo) {
      setParkedDelete(null);
      return;
    }
    if (docHidden) return;
    const timer = setTimeout(() => {
      setParkedDelete(null);
      setEdits((prev) => dismissUndoIn(prev));
    }, Math.max(0, parkedDelete.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [parkedDelete, edits.undo, docHidden]);

  // Auto-dismiss the toast. When a "deleted" toast goes, the undo goes with it; a "moved" toast has its own undo
  // (in the toast) and leaves a delete's record alone.
  // cc-58: while the pointer is on the toast or focus is in it, its time stops (WCAG 2.2.1: a Hoàn tác that leaves while
  // you read or reach for it). `toastClock` keeps the time left for the toast that is on screen.
  const [pausedToast, setPausedToast] = useState<ToastInfo | null>(null);
  const toastClock = useRef<{ toast: ToastInfo | null; left: number; since: number }>({ toast: null, left: 0, since: 0 });
  const toastPaused = (toast !== null && pausedToast === toast) || docHidden;
  useEffect(() => {
    if (!toast || toastPaused) return;
    const clock = toastClock.current;
    if (clock.toast !== toast) {
      clock.toast = toast;
      clock.left = toast.durationMs;
    }
    clock.since = Date.now();
    const timer = setTimeout(() => {
      setToast(null);
      if (toast.kind !== "moved") setEdits((prev) => dismissUndoIn(prev));
    }, clock.left);
    return () => clearTimeout(timer);
  }, [toast, toastPaused]);
  // Takes the time that has run off the clock, once: a pause by hover and one by the page hiding never count it twice
  const freezeToastClock = useCallback(() => {
    const clock = toastClock.current;
    if (clock.since === 0) return;
    clock.left = Math.max(0, clock.left - (Date.now() - clock.since));
    clock.since = 0;
  }, []);
  const pauseToast = useCallback(() => {
    const shown = toastRef.current;
    if (!shown || toastClock.current.toast !== shown) return;
    freezeToastClock();
    setPausedToast(shown);
  }, [freezeToastClock]);
  useEffect(() => {
    if (docHidden) {
      hiddenAt.current = Date.now();
      freezeToastClock();
      return;
    }
    if (hiddenAt.current === 0) return;
    const away = Date.now() - hiddenAt.current;
    hiddenAt.current = 0;
    setParkedDelete((prev) => (prev ? { ...prev, expiresAt: prev.expiresAt + away } : prev));
  }, [docHidden, freezeToastClock]);
  const resumeToast = useCallback(() => setPausedToast(null), []);

  // Today's entries alone (the same array while the list holds nothing else), and the history the screens read for other days
  const addedEntries = useMemo(() => (todayIso ? entriesOnDay(edits.added, todayIso, todayIso) : edits.added), [edits.added, todayIso]);
  const history = useMemo(() => (todayIso ? withEditableDays(archive, edits.added, todayIso, pastDays) : archive), [archive, edits.added, todayIso, pastDays]);

  /** The day a new entry goes to: today, or `day` when that day can be edited. Null when it cannot. */
  const targetDay = useCallback(
    (day?: string): string | null => {
      const today = getTodayIsoVN();
      if (!day || day === today) return today;
      return isEditableDay(day, today, pastDays) ? day : null;
    },
    [pastDays]
  );
  /** The day an entry of the list belongs to (today's when it names none). */
  const dayOf = useCallback((id: string): string | undefined => {
    const entry = edits.added.find((e) => e.id === id);
    return entry ? entryIso(entry) ?? undefined : undefined;
  }, [edits.added]);
  /** Picks the entries of `day` out of the list, for the slot-wide edits. */
  const onlyDay = useCallback((day: string): DayFilter => (e) => (day === getTodayIsoVN() ? isTodays(e, day) : entryIso(e) === day), []);

  // Remember a food with the serving it was logged with
  const addRecentFood = useCallback((food: FoodItem, servingLabel: string) => {
    setRecentFoods((prev) => pushRecent(prev, { foodId: food.id, servingLabel }));
  }, []);

  // Add a food entry
  const addFoodEntry = useCallback(
    async (food: FoodItem, grams: number, mealSlot: MealSlot, servingLabel?: string, options?: { undoable?: boolean; id?: string; day?: string }) => {
      // Unknown energy is not 0: nothing is logged, and the caller shows NO_ENERGY_MESSAGE (a label supplement can, canLog)
      if (!canLog(food)) return false;
      // The day is worked out now (S14); a day that cannot be edited takes nothing
      const day = targetDay(options?.day);
      if (!day) return false;
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
        day,
      };

      setEdits((prev) => ({ ...prev, added: [...prev.added, newEntry] }));
      pendingGoalCheck.current = true;
      haptic("saved");

      const mealNameVi = getMealSlotNameVi(mealSlot);
      // cc-53b: the amount set ("150 g", "3 quả"), not the label's state words
      const amount = portionAmountText(qty) ?? qty;
      setEdits((prev) => dismissUndoIn(prev));
      setToast(
        options?.undoable
          ? {
              message: `Đã thêm ${food.nameVi} ${amount} vào ${mealNameVi}${onDayText(day, getTodayIsoVN())}`,
              kind: "undoable",
              mealSlot,
              durationMs: UNDO_TOAST_MS,
              undoIds: [newEntry.id],
            }
          : {
              message: `Đã thêm ${food.nameVi} ${amount} vào ${mealNameVi}${onDayText(day, getTodayIsoVN())}`,
              kind: "added",
              mealSlot,
              durationMs: ADDED_TOAST_MS,
            }
      );

      addRecentFood(food, qty);

      if (isLiveMode()) sendAdd(newEntry);

      return true;
    },
    [addRecentFood, targetDay, sendAdd]
  );

  const addFoodEntries = useCallback(
    (items: Array<{ food: FoodItem; grams: number; label: string; id?: string }>, mealSlot: MealSlot, dayOpt?: string) => {
      if (items.length === 0 || !items.every((i) => canLog(i.food))) return false;
      const day = targetDay(dayOpt);
      if (!day) return false;
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
        day,
      }));
      setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, ...entries] }));
      pendingGoalCheck.current = true;
      haptic("saved");
      setToast({
        message: `Đã thêm ${entries.length} món vào ${getMealSlotNameVi(mealSlot)}${onDayText(day, getTodayIsoVN())}`,
        kind: "undoable",
        mealSlot,
        durationMs: UNDO_TOAST_MS,
        undoIds: entries.map((e) => e.id),
      });
      items.forEach(({ food, label }) => addRecentFood(food, label));
      if (isLiveMode()) entries.forEach((e) => sendAdd(e));
      return true;
    },
    [addRecentFood, targetDay, sendAdd]
  );

  const dismissToast = useCallback(() => {
    setToast(null);
    setEdits((prev) => dismissUndoIn(prev));
  }, []);

  const isFavourite = useCallback((foodId: string) => favouriteIds.includes(foodId), [favouriteIds]);

  const toggleFavourite = useCallback((food: FoodItem) => {
    const willBeFavourite = !favouriteIds.includes(food.id);
    setFavouriteIds((prev) => toggleFavouriteId(prev, food.id));
    if (isLiveMode()) track("side", apiClient.setFavourite(food.id, willBeFavourite));
  }, [favouriteIds, track]);

  const getEntry = useCallback((id: string) => findEntry(edits, id, samples), [edits, samples]);

  const updateEntry = useCallback((id: string, patch: EntryPatch) => {
    setEdits((prev) => updateEntryIn(prev, id, patch, samples));
    if (isLiveMode()) {
      const day = dayOf(id);
      track(
        id,
        apiClient.updateEntry(
          id,
          {
            meal_slot: patch.mealSlot,
            grams: patch.grams,
            serving_size_g: patch.grams,
            serving_label: patch.servingLabel,
            calories: patch.quick?.calories,
          },
          day
        ),
        day
      );
    }
  }, [samples, track, dayOf]);

  const deleteEntry = useCallback(
    (id: string) => {
      const view = findEntry(edits, id, samples);
      if (!view) return;
      setEdits((prev) => deleteEntryIn(prev, id, samples));
      haptic("delete");
      setParkedDelete(null);
      setToast({ message: `Đã xóa ${view.name}`, kind: "deleted", mealSlot: null, durationMs: UNDO_TOAST_MS });
      if (isLiveMode()) track(id, apiClient.deleteEntry(id, dayOf(id)), dayOf(id));
    },
    [edits, samples, track, dayOf]
  );

  const deleteMeal = useCallback(
    (slot: MealSlot, dayIso?: string) => {
      const day = targetDay(dayIso);
      if (!day) return;
      // The sample items belong to today; an earlier day has none
      const sampled = day === getTodayIsoVN() ? samples : [];
      const ids = mealEntryIds(edits, slot, sampled, onlyDay(day));
      const count = ids.length;
      if (count === 0) return;
      setEdits((prev) => deleteMealIn(prev, slot, sampled, onlyDay(day)));
      haptic("delete");
      setParkedDelete(null);
      setToast({
        message: `Đã xóa ${getMealSlotNameVi(slot)} · ${count} món`,
        kind: "deleted",
        mealSlot: null,
        durationMs: UNDO_TOAST_MS,
      });
      if (isLiveMode()) ids.forEach((id) => track(id, apiClient.deleteEntry(id, day), day));
    },
    [edits, samples, track, targetDay, onlyDay]
  );

  const deleteEntries = useCallback(
    (ids: string[], dayIso: string) => {
      // A day older than yesterday is read-only: its entries are not in the edits, and nothing here may touch the others
      if (!todayIso || !isEditableDay(dayIso, todayIso, pastDays)) return;
      const count = ids.filter((id) => findEntry(edits, id, samples) !== null).length;
      if (count === 0) return;
      setEdits((prev) => deleteEntriesIn(prev, ids, samples));
      haptic("delete");
      setParkedDelete(null);
      setToast({ message: `Đã xóa ${count} món`, kind: "deleted", mealSlot: null, durationMs: UNDO_TOAST_MS });
      if (isLiveMode()) ids.forEach((id) => track(id, apiClient.deleteEntry(id, dayIso), dayIso));
    },
    [edits, samples, todayIso, track, pastDays]
  );

  const moveEntries = useCallback(
    (ids: string[], slot: MealSlot, dayIso: string) => {
      if (!todayIso || !isEditableDay(dayIso, todayIso, pastDays)) return;
      const count = ids.filter((id) => findEntry(edits, id, samples) !== null).length;
      if (count === 0) return;
      // A move has its own undo (the toast carries it). A delete's toast it replaces is parked under it, so both
      // Hoàn tác stay reachable.
      const undoMoves = slotsBeforeMove(edits, ids, slot, samples);
      const shown = toastRef.current;
      if (shown?.kind === "deleted" && edits.undo) {
        const expiresAt = toastStartedAt.current + shown.durationMs;
        if (expiresAt > Date.now()) setParkedDelete({ toast: shown, expiresAt });
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
      if (isLiveMode()) ids.forEach((id) => track(id, apiClient.updateEntry(id, { meal_slot: slot }, dayIso), dayIso));
    },
    [edits, samples, todayIso, track, pastDays]
  );

  const undoMove = useCallback(() => {
    const moves = toastRef.current?.undoMoves;
    if (!moves) return;
    setEdits((prev) => restoreSlotsIn(prev, moves, samples));
    haptic("undo");
    if (isLiveMode()) moves.forEach((m) => track(m.id, apiClient.updateEntry(m.id, { meal_slot: m.slot }, dayOf(m.id)), dayOf(m.id)));
    setToast(null);
  }, [samples, track, dayOf]);

  const undoLastDelete = useCallback(() => {
    const lastUndo = edits.undo;
    setEdits((prev) => undoDeleteIn(prev));
    haptic("undo");
    if (isLiveMode() && lastUndo) {
      if (lastUndo.kind === "sample") {
        track(lastUndo.id, apiClient.restoreEntry(lastUndo.id));
      } else {
        // One entry, or every entry of a meal or a selection: each is put back on the server, or sent again when it never got there
        const entries = lastUndo.kind === "added" ? [lastUndo.entry] : lastUndo.added.map((a) => a.entry);
        entries.forEach((e) => (e.synced ? track(e.id, apiClient.restoreEntry(e.id, entryIso(e) ?? undefined)) : sendAdd(e)));
      }
    }
    setToast(null);
  }, [edits.undo, track, sendAdd, todayIso]);

  const undoParkedDelete = useCallback(() => {
    // The same put-back as undoLastDelete (the parked toast is a delete's), without touching the toast on top
    const lastUndo = edits.undo;
    setEdits((prev) => undoDeleteIn(prev));
    haptic("undo");
    if (isLiveMode() && lastUndo && lastUndo.kind !== "sample") {
      const entries = lastUndo.kind === "added" ? [lastUndo.entry] : lastUndo.added.map((a) => a.entry);
      entries.forEach((e) => (e.synced ? track(e.id, apiClient.restoreEntry(e.id, entryIso(e) ?? undefined)) : sendAdd(e)));
    }
    setParkedDelete(null);
  }, [edits.undo, track, sendAdd]);

  const copyEntries = useCallback((copied: AddedDiaryEntry[], message: string, dayOpt?: string) => {
    if (copied.length === 0) return;
    const day = targetDay(dayOpt);
    if (!day) return;
    const entries = withNewIds(copied, day);
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
    if (isLiveMode()) entries.forEach((e) => sendAdd(e));
  }, [targetDay, sendAdd]);

  const undoCopy = useCallback(() => {
    const ids = toastRef.current?.undoIds;
    if (!ids) return;
    setEdits((prev) => removeAddedIn(prev, ids));
    haptic("undo");
    setToast(null);
    // The entries were already sent: undo removes them on the server too, or they come back on the next load
    if (isLiveMode()) ids.forEach((id) => track(id, apiClient.deleteEntry(id, dayOf(id)), dayOf(id)));
  }, [track, dayOf]);

  const mealFoods = useCallback(
    (slot: MealSlot, iso: string) => {
      const today = todayIso ?? getTodayIsoVN();
      const items =
        iso === today
          ? mealPortions(edits, slot, samples, onlyDay(today))
          : itemsFromEntries(dayEntries(iso, today).filter((e) => e.mealSlot === slot));
      // Only foods the catalogue has: what is saved is what one tap can add back
      return items.filter((item) => MOCK_FOODS.some((f) => f.id === item.foodId));
    },
    [edits, samples, todayIso, history, onlyDay]
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
    (meal: SavedMeal, slot: MealSlot, dayOpt?: string) => {
      const day = targetDay(dayOpt);
      if (!day) return;
      const stamp = Date.now();
      const entries = withNewIds(savedMealEntries(meal, MOCK_FOODS, slot, `sm-${stamp}`, new Date(stamp).toISOString()), day);
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
        message: `Đã thêm ${meal.name} · ${entries.length} món vào ${getMealSlotNameVi(slot)}${onDayText(day, getTodayIsoVN())}${
          skipped > 0 ? `. ${skipped} món chưa có kcal nên chưa thêm` : ""
        }`,
        kind: "undoable",
        mealSlot: slot,
        durationMs: UNDO_TOAST_MS,
        undoIds: entries.map((e) => e.id),
      });
      if (isLiveMode()) entries.forEach((e) => sendAdd(e));
    },
    [targetDay, sendAdd]
  );

  const addQuickEntry = useCallback(
    (input: QuickEntryInput, slot: MealSlot, dayOpt?: string): QuickEntryResult => {
      const day = targetDay(dayOpt);
      if (!day) return { ok: false, field: "kcal", message: "Ngày này chỉ xem" };
      const now = Date.now();
      const entryId = generateUuid();
      const result = quickEntryFrom(input, slot, entryId, new Date(now).toISOString());
      if (!result.ok) return result;
      const entry = { ...result.entry, day };
      setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, entry] }));
      pendingGoalCheck.current = true;
      haptic("saved");
      setToast({
        message: `Đã thêm ${entry.foodName} · ${formatAmount(entry.calories, "kcal")} kcal vào ${getMealSlotNameVi(slot)}${onDayText(day, getTodayIsoVN())}`,
        kind: "undoable",
        mealSlot: slot,
        durationMs: UNDO_TOAST_MS,
        undoIds: [entry.id],
      });
      if (isLiveMode()) sendAdd(entry);
      return { ...result, entry };
    },
    [targetDay, sendAdd]
  );

  // Chưa lưu: a write of the entry is queued (or refused), or the server never confirmed it and nothing is sending it.
  // The second part waits for the first read of the server's day, which confirms the entries it already has.
  // The same Set comes back while its members do not change, so an outbox commit that changes nothing here re-renders no one.
  const unsavedRef = useRef<ReadonlySet<string>>(new Set());
  const unsavedIds = useMemo(() => {
    const queued = new Set(getPendingOfflineEntryIds());
    const pending = pendingWriteIds();
    const live = isLiveMode() && !demo && hydrated;
    const next = new Set(
      live ? edits.added.filter((e) => !isLocalOnly(e) && (queued.has(e.id) || (serverDayRead && !e.synced && !pending.has(e.id)))).map((e) => e.id) : []
    );
    const prev = unsavedRef.current;
    return next.size === prev.size && [...next].every((id) => prev.has(id)) ? prev : (unsavedRef.current = next);
    // syncVersion: the outbox changed
  }, [edits.added, syncVersion, demo, hydrated, serverDayRead]);
  // Entries that can never reach the server: the row says Chỉ trên máy này (review 05:30 M1)
  const localOnlyIds = useMemo(
    () => (isLiveMode() && !demo ? new Set(edits.added.filter(isLocalOnly).map((e) => e.id)) : new Set<string>()),
    [edits.added, demo]
  );

  const refreshToday = useCallback(
    () => refreshServerSession().then(() => refreshRemoteDay(todayIsoRef.current || getTodayIsoVN(), { earlier: true, force: true })),
    [refreshRemoteDay]
  );

  // syncVersion: bumped when a write starts and when it answers
  const saving = useMemo(() => isLiveMode() && !demo && writesInFlight() > 0, [syncVersion, demo]);

  // S13: what the sync status in every header shows comes from the outbox, kept up to date here (and read by the update toast)
  useEffect(() => {
    const counts = isLiveMode() && !demo && accountId ? outboxSummary() : null;
    setSyncSummary({ pending: counts?.pending ?? 0, failed: counts?.failed ?? 0, final: counts?.final ?? 0, parked: counts?.parked ?? 0, saving });
  }, [syncVersion, saving, demo, accountId]);

  const retryUnsaved = useCallback(async (): Promise<RetryOutcome> => {
    markUsed("retry-unsaved");
    unsavedShown.current = false;
    setToast(null);
    const before = outboxItems().length;
    // Hotfix 20/10: Thử lại is never silent. Whatever the run did, the person is told: how many were saved, how many are left
    let outcome: RetryOutcome;
    try {
      onSync(await syncOfflineOutbox({ retryHeld: true }), { quiet: true });
      const left = outboxItems().length;
      outcome = { saved: Math.max(0, before - left), left };
    } catch {
      outcome = { saved: 0, left: Math.max(1, outboxItems().length) };
    }
    setSyncVersion((v) => v + 1);
    setToast({ message: retryMessage(outcome), kind: outcome.left > 0 ? "left" : "notice", mealSlot: null, durationMs: NOTICE_TOAST_MS });
    return outcome;
  }, [onSync]);

  // Chuyển sang hôm nay: the stuck add is made again for today (the outbox) and the entry moves to today's list
  const moveUnsavedToToday = useCallback(async (key: string) => {
    const id = await callEngine("moveAddToToday", key);
    if (!id) return;
    const found = Object.values(archive).flat().find((e) => e.id === id);
    setArchive((prev) => Object.fromEntries(Object.entries(prev).map(([day, list]) => [day, list.filter((e) => e.id !== id)])));
    setEdits((prev) => {
      const here = prev.added.find((e) => e.id === id);
      const entry = here ?? found;
      if (!entry) return prev;
      const moved = { ...entry, addedAt: new Date().toISOString(), day: undefined, synced: false };
      return { ...prev, added: [...prev.added.filter((e) => e.id !== id), moved] };
    });
    setSyncVersion((v) => v + 1);
  }, [archive]);

  const discardUnsaved = useCallback(async (key: string) => {
    const item = outboxItems().find((i) => i.key === key);
    if (!item) return;
    // An add takes the entry's other writes with it (an edit or a delete of an entry the server never had is meaningless)
    const keys = isDiaryAdd(item) ? outboxItems().filter((i) => i.id === item.id).map((i) => i.key) : [key];
    await callEngine("discardOutboxItems", keys);
    if (isDiaryAdd(item)) {
      setEdits((prev) => removeAddedIn(prev, [item.id]));
      setArchive((prev) => Object.fromEntries(Object.entries(prev).map(([day, list]) => [day, list.filter((e) => e.id !== item.id)])));
    }
    setSyncVersion((v) => v + 1);
  }, []);

  // The update toast (components/pwa) waits for the outbox: it asks for a send, with nothing held back
  useEffect(() => {
    registerSyncNow(() => syncOfflineOutbox({ retryHeld: true }).then(onSync));
    return () => registerSyncNow(null);
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
  useMemo(() => setDayArchive(history), [history]);

  const nutrientSources = useCallback(
    (key: string) => nutrientSourcesIn(addedEntries, edits.sample, key, samples),
    [addedEntries, edits.sample, samples]
  );

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      const next = normaliseProfile({ ...profile, ...patch });
      setProfile(next);
      writeStoredProfile(next);
      if (isLiveMode()) {
        // S6: through the outbox (an offline change is sent later, the newest wins), not fire-and-forget
        track(
          "side",
          apiClient.queueProfile({
            sex: next.sex,
            birthYear: next.birthYear,
            weightKg: next.weightKg,
            goal: next.goal,
            periodMode: next.periodMode,
            trainingMinutesDefault: next.trainingMinutesDefault,
            displayName: next.displayName,
          })
        );
        // S14: the day of the weight is worked out now, not the date the screen last showed
        if (patch.weightKg !== undefined) track("side", apiClient.queueWeight(getTodayIsoVN(), patch.weightKg));
      }
    },
    [profile, track]
  );

  // The catalogue version: a label supplement's entry counts as 0 kcal once its food is in the catalogue (labelZeros)
  const catalogV = useSyncExternalStore(subscribeCatalog, catalogVersion, catalogVersion);
  const compositeData = useMemo<MockDayData>(() => {
    // A real account starts from an empty day; only demo mode starts from the sample day
    const start = demo ? SAMPLE_DAY : blankDay(SAMPLE_DAY);
    const base = applyProfileTargets(start, profile, targets, todayMinutes);
    const day = computeCompositeDayData(base, addedEntries, demo ? edits.sample : {});
    return todayIso ? withRuntimeDate(day, todayIso) : day;
  }, [addedEntries, edits.sample, todayIso, profile, targets, todayMinutes, demo, catalogV]);

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

  // Memoised, and without the toast state (DiaryToastState): a toast does not re-render every useDiary() consumer
  const contextValue = useMemo(
    () => ({
      data: compositeData,
      addedEntries,
      addFoodEntry,
      addFoodEntries,
      recentFoods,
      addRecentFood,
      dismissToast,
      pauseToast,
      resumeToast,
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
      moveUnsavedToToday,
      discardUnsaved,
      refreshToday,
      saving,
      todayIso,
      dayArchive: history,
      loadDays,
      isEditable,
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
      dismissToast,
      pauseToast,
      resumeToast,
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
      moveUnsavedToToday,
      discardUnsaved,
      refreshToday,
      saving,
      todayIso,
      history,
      loadDays,
      isEditable,
      hydrated,
      demo,
      profile,
      targets,
      updateProfile,
      nutrientSources,
    ]
  );

  const toastValue = useMemo(() => ({ toast, parkedDelete, highlightedMeal }), [toast, parkedDelete, highlightedMeal]);

  return (
    <DiaryContext.Provider value={contextValue}>
      <DiaryToastContext.Provider value={toastValue}>{children}</DiaryToastContext.Provider>
    </DiaryContext.Provider>
  );
}

export function useDiaryToast(): DiaryToastState {
  const ctx = useContext(DiaryToastContext);
  if (!ctx) throw new Error("useDiaryToast must be used within a DiaryProvider");
  return ctx;
}

export function useDiary() {
  const ctx = useContext(DiaryContext);
  if (!ctx) {
    throw new Error("useDiary must be used within a DiaryProvider");
  }
  return ctx;
}
