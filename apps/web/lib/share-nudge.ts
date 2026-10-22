import type { OnboardingFlags } from "./onboarding-flags";
import { pctOf } from "./home";

/**
 * share-spotlight (Hao 22/10): a light nudge to share a good day. When today first reaches 80 % of its kcal target with five vitamins
 * or minerals at Gần đủ or Đạt (80 % or more), Hôm nay shows a 4 s toast with Chia sẻ: at most once a day, never on the day the share
 * tip showed, never with tips off. Pure.
 */
export const SHARE_NUDGE_TEXT = "Hôm nay ăn khá đủ chất — chia sẻ nhé?";
export const SHARE_NUDGE_MS = 4000;
const KCAL_PCT = 80;
const LEVEL_PCT = 80;
const MIN_NUTRIENTS = 5;

/** 80 % of the kcal target and five counted nutrients at Gần đủ or Đạt (the percent as the bars round it). */
export function dayWellFed({
  kcal,
  kcalTarget,
  values,
  targets,
  ids,
}: {
  kcal: number | null;
  kcalTarget: number | null;
  values: Readonly<Record<string, number | null | undefined>>;
  targets: Readonly<Record<string, number | null | undefined>>;
  ids: readonly string[];
}): boolean {
  const kcalPct = pctOf(kcal, kcalTarget);
  if (kcalPct === null || kcalPct < KCAL_PCT) return false;
  const near = ids.filter((id) => (pctOf(values[id] ?? null, targets[id] ?? null) ?? 0) >= LEVEL_PCT).length;
  return near >= MIN_NUTRIENTS;
}

/** The day just got there (`was` false, `now` true; `was` null: not known yet, as on the first look) and the toast may show today. */
export function shareNudgeDue({ flags, todayIso, was, now }: { flags: OnboardingFlags; todayIso: string; was: boolean | null; now: boolean }): boolean {
  if (flags.tipsOff || !now || was !== false) return false;
  return flags.shareNudgeIso !== todayIso && flags.shareTipIso !== todayIso;
}
