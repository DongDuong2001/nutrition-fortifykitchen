/**
 * cc-52: the user's Ngày tập settings, per account and on this device until the profile has a field for them
 * (OPEN_QUESTIONS for Dong): the Bự / Bé size, whether the size question was asked, and the user's own items.
 */
import { accountStorage } from "./storage-keys";
import type { TrainingSize } from "./training";

export const TRAINING_PREFS_KEY = "h1t_training_prefs_v1";

export type TrainingPhaseId = "pre-workout" | "intra-workout";

export interface OwnTrainingItem {
  id: string;
  phase: TrainingPhaseId;
  foodId: string;
  /** The food's name when it was added, shown even before the catalogue loads */
  name: string;
  grams: number;
  /** The portion as picked ("250 g", "1 quả") */
  label: string;
}

export interface TrainingPrefs {
  size: TrainingSize | null;
  /** The first-open question was shown (answered or closed): it is not asked again */
  asked: boolean;
  own: OwnTrainingItem[];
}

type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };

const EMPTY: TrainingPrefs = { size: null, asked: false, own: [] };

const isOwnItem = (i: unknown): i is OwnTrainingItem => {
  const o = i as OwnTrainingItem;
  return (
    !!o &&
    typeof o.id === "string" &&
    (o.phase === "pre-workout" || o.phase === "intra-workout") &&
    typeof o.foodId === "string" &&
    typeof o.name === "string" &&
    typeof o.grams === "number" &&
    o.grams > 0 &&
    typeof o.label === "string"
  );
};

export function readPrefs(storage: Storage | null = accountStorage()): TrainingPrefs {
  try {
    const raw = storage?.getItem(TRAINING_PREFS_KEY);
    if (!raw) {
      const profileRaw = storage?.getItem("h1t_profile_v1");
      if (profileRaw) {
        const prof = JSON.parse(profileRaw);
        const p = prof?.trainingPrefs ?? prof?.training_prefs;
        if (p && typeof p === "object") {
          const synced: TrainingPrefs = {
            size: p.size === "be" || p.size === "bu" ? p.size : null,
            asked: p.asked === true,
            own: Array.isArray(p.own) ? p.own.filter(isOwnItem) : [],
          };
          if (synced.size || synced.asked || synced.own.length > 0) {
            writePrefs(synced, storage);
            return synced;
          }
        }
      }
      return EMPTY;
    }
    const p = JSON.parse(raw);
    return {
      size: p?.size === "be" || p?.size === "bu" ? p.size : null,
      asked: p?.asked === true,
      own: Array.isArray(p?.own) ? p.own.filter(isOwnItem) : [],
    };
  } catch {
    return EMPTY;
  }
}

/** Storage errors (quota, disabled) are ignored. */
export function writePrefs(prefs: TrainingPrefs, storage: Storage | null = accountStorage()): void {
  try {
    storage?.setItem(TRAINING_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

export const addOwnItem = (own: readonly OwnTrainingItem[], item: Omit<OwnTrainingItem, "id">, id: string): OwnTrainingItem[] => [
  ...own,
  { id, ...item },
];

export const removeOwnItem = (own: readonly OwnTrainingItem[], id: string): OwnTrainingItem[] => own.filter((i) => i.id !== id);
