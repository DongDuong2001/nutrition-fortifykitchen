"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { currentAccountId } from "./auth-actions";
import { SAMPLE_DAY, type MockDayData, type MockFoodItem } from "./mock/sample-day";
import { type FoodItem } from "./mock/foods";
import { type MealSlot, getMealSlotNameVi } from "./meal-slot";
import { formatAmount } from "./format";
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
import { MOCK_FOODS } from "./mock/foods";
import {
  buildSavedMeal,
  defaultMealName,
  itemsFromEntries,
  readSavedMeals,
  removeSavedMeal,
  renameSavedMeal as renameSavedMealIn,
  savedMealEntries,
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
  dismissUndoIn,
  entryNumbers,
  findEntry,
  mealEntryIds,
  mealPortions,
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
 * and "saved" offers Xem (Bữa ăn của tôi in Khám phá).
 */
export interface ToastInfo {
  message: string;
  kind: "added" | "deleted" | "undoable" | "saved";
  mealSlot: MealSlot | null;
  /** How long it stays. A delete or a copy stays 5 s, which is also the undo window. */
  durationMs: number;
  undoIds?: string[];
}

const ADDED_TOAST_MS = 4000;
const UNDO_TOAST_MS = 5000;

interface DiaryContextValue {
  data: MockDayData;
  addedEntries: AddedDiaryEntry[];
  /** `undoable` is the one-tap add of a recent: the toast offers Hoàn tác for 5 s instead of Xem. */
  addFoodEntry: (
    food: FoodItem,
    grams: number,
    mealSlot: MealSlot,
    servingLabel?: string,
    options?: { undoable?: boolean }
  ) => Promise<void>;
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
  /** Puts the last deleted entry back. Only works while the "deleted" toast is shown. */
  undoLastDelete: () => void;
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
  addedEntries: AddedDiaryEntry[],
  sampleEdits: SampleEdits = {}
): MockDayData {
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
  const totalConsumedCals = Math.max(0, baseDay.calories.consumed + extraCals);
  const remainingCals = Math.max(0, baseDay.calories.targetMin - totalConsumedCals);
  const calPercentage = Math.round((totalConsumedCals / baseDay.calories.targetMin) * 100);

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
      kcal: items.reduce((acc, it) => acc + it.kcal, 0),
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
 * Targets follow the profile, the same as today.
 */
export function pastDayData(iso: string, todayIso: string, profile: Profile, targets: CompleteTargets): MockDayData {
  const base = blankDay(applyProfileTargets(SAMPLE_DAY, profile, targets));
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
  const pathname = usePathname();

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
    const split = splitByDay(added, iso);
    setEdits({ added: split.today, sample, undo: null });
    setArchive(mergeArchive(parseArchive(own?.getItem(DAY_ARCHIVE_KEY) ?? null), split.past));
    setRecentFoods(recents);
    setFavouriteIds(readFavouriteIds(own));
    setSavedMeals(readSavedMeals(own));
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
      setProfile(loadProfile(new Date().getFullYear()));
      setHydrated(true);
    }
  }, [loadData]);

  // Another account signed in, or this one signed out (Đăng xuất keeps the data under its account): the
  // state of the account before is dropped and the new one's is read. The persist effects below then write to
  // the new keys, never the old data to the new account.
  useEffect(() => {
    if (!hydrated || demo) return;
    const now = currentAccountId();
    if (now === accountId) return;
    setAccountId(now);
    loadData(now, false, todayIso ?? getTodayIsoVN());
    // The profile is per account too: without this, account B would keep A's targets until a reload
    setProfile(loadProfile(new Date().getFullYear()));
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

  // Auto-dismiss the toast. When a "deleted" toast goes, the undo goes with it.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
      setEdits((prev) => dismissUndoIn(prev));
    }, toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast]);

  // Remember a food with the serving it was logged with
  const addRecentFood = useCallback((food: FoodItem, servingLabel: string) => {
    setRecentFoods((prev) => pushRecent(prev, { foodId: food.id, servingLabel }));
  }, []);

  // Add a food entry
  const addFoodEntry = useCallback(
    async (food: FoodItem, grams: number, mealSlot: MealSlot, servingLabel?: string, options?: { undoable?: boolean }) => {
      const numbers = entryNumbers(food, grams);
      const qty = servingLabel || `${formatAmount(grams, "g")} g`;

      const newEntry: AddedDiaryEntry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        foodId: food.id,
        foodName: food.nameVi,
        grams,
        displayQty: qty,
        mealSlot,
        ...numbers,
        addedAt: new Date().toISOString(),
      };

      setEdits((prev) => ({ ...prev, added: [...prev.added, newEntry] }));

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
    },
    [addRecentFood]
  );

  const dismissToast = useCallback(() => {
    setToast(null);
    setEdits((prev) => dismissUndoIn(prev));
  }, []);

  const isFavourite = useCallback((foodId: string) => favouriteIds.includes(foodId), [favouriteIds]);

  const toggleFavourite = useCallback((food: FoodItem) => {
    setFavouriteIds((prev) => toggleFavouriteId(prev, food.id));
  }, []);

  const getEntry = useCallback((id: string) => findEntry(edits, id, samples), [edits, samples]);

  const updateEntry = useCallback((id: string, patch: EntryPatch) => {
    setEdits((prev) => updateEntryIn(prev, id, patch, samples));
  }, [samples]);

  const deleteEntry = useCallback(
    (id: string) => {
      const view = findEntry(edits, id, samples);
      if (!view) return;
      setEdits((prev) => deleteEntryIn(prev, id, samples));
      setToast({ message: `Đã xóa ${view.name}`, kind: "deleted", mealSlot: null, durationMs: UNDO_TOAST_MS });
    },
    [edits, samples]
  );

  const deleteMeal = useCallback(
    (slot: MealSlot) => {
      const count = mealEntryIds(edits, slot, samples).length;
      if (count === 0) return;
      setEdits((prev) => deleteMealIn(prev, slot, samples));
      setToast({
        message: `Đã xóa ${getMealSlotNameVi(slot)} · ${count} món`,
        kind: "deleted",
        mealSlot: null,
        durationMs: UNDO_TOAST_MS,
      });
    },
    [edits, samples]
  );

  const undoLastDelete = useCallback(() => {
    setEdits((prev) => undoDeleteIn(prev));
    setToast(null);
  }, []);

  const copyEntries = useCallback((entries: AddedDiaryEntry[], message: string) => {
    if (entries.length === 0) return;
    setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, ...entries] }));
    setToast({
      message,
      kind: "undoable",
      mealSlot: null,
      durationMs: UNDO_TOAST_MS,
      undoIds: entries.map((e) => e.id),
    });
  }, []);

  const undoCopy = useCallback(() => {
    const ids = toast?.undoIds;
    if (!ids) return;
    setEdits((prev) => removeAddedIn(prev, ids));
    setToast(null);
  }, [toast]);

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
      const entries = savedMealEntries(meal, MOCK_FOODS, slot, `sm-${stamp}`, new Date(stamp).toISOString());
      if (entries.length === 0) return;
      // The recents remember each food with the portion the meal used
      setRecentFoods((prev) =>
        [...entries].reverse().reduce((list, e) => pushRecent(list, { foodId: e.foodId, servingLabel: e.displayQty }), prev)
      );
      setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, ...entries] }));
      setToast({
        message: `Đã thêm ${meal.name} · ${entries.length} món vào ${getMealSlotNameVi(slot)}`,
        kind: "undoable",
        mealSlot: slot,
        durationMs: UNDO_TOAST_MS,
        undoIds: entries.map((e) => e.id),
      });
    },
    []
  );

  const addQuickEntry = useCallback((input: QuickEntryInput, slot: MealSlot): QuickEntryResult => {
    const now = Date.now();
    const result = quickEntryFrom(input, slot, `quick-${now}-${Math.random().toString(36).slice(2, 7)}`, new Date(now).toISOString());
    if (!result.ok) return result;
    const { entry } = result;
    setEdits((prev) => dismissUndoIn({ ...prev, added: [...prev.added, entry] }));
    setToast({
      message: `Đã thêm ${entry.foodName} · ${formatAmount(entry.calories, "kcal")} kcal vào ${getMealSlotNameVi(slot)}`,
      kind: "undoable",
      mealSlot: slot,
      durationMs: UNDO_TOAST_MS,
      undoIds: [entry.id],
    });
    return result;
  }, []);

  const targets = useMemo(() => targetsFor(profile), [profile]);
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
    },
    [profile]
  );

  const compositeData = useMemo<MockDayData>(() => {
    // A real account starts from an empty day; only demo mode starts from the sample day
    const start = demo ? SAMPLE_DAY : blankDay(SAMPLE_DAY);
    const base = applyProfileTargets(start, profile, targets);
    const day = computeCompositeDayData(base, edits.added, demo ? edits.sample : {});
    return todayIso ? withRuntimeDate(day, todayIso) : day;
  }, [edits.added, edits.sample, todayIso, profile, targets, demo]);

  // Memoised so a toast or highlight change does not re-render every useDiary() consumer
  const contextValue = useMemo(
    () => ({
      data: compositeData,
      addedEntries,
      addFoodEntry,
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
      undoLastDelete,
      copyEntries,
      undoCopy,
      savedMeals,
      saveMealAs,
      mealFoods,
      renameSavedMeal,
      deleteSavedMeal,
      addSavedMeal,
      addQuickEntry,
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
      undoLastDelete,
      copyEntries,
      undoCopy,
      savedMeals,
      saveMealAs,
      mealFoods,
      renameSavedMeal,
      deleteSavedMeal,
      addSavedMeal,
      addQuickEntry,
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
