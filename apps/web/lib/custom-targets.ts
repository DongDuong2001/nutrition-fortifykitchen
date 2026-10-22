/**
 * cc-73b: a custom daily target for one vitamin or mineral (Cronometer lets users change any target). A custom value
 * replaces the DRI amount for that nutrient and is marked "tự đặt" wherever the target shows.
 *
 * Behind a flag that stays off. The API stores the value with the profile since migration 000015 (customTargets, synced like the
 * macro split), but its own targets (trends, the day summary) do not read it yet, so switching it on would make Hôm nay and the
 * trends disagree (docs/pr/cc-73b-custom-targets.md, step 4). Pure.
 */
import { DRI } from "./rda";
import type { CompleteTargets } from "./targets";

/** Off until the API's targets use it (docs/pr/cc-73b-custom-targets.md). While off, no row can be tapped and none is read. */
export const CUSTOM_TARGETS_ENABLED = false;

/** Nutrient id to the daily amount the user set, in the nutrient's own unit. */
export type CustomTargets = Record<string, number>;

/** The nutrients whose target can be set: the 21 DRI ones. Sodium keeps the salt formula, macros have their own screen. */
export const CUSTOM_TARGET_IDS: readonly string[] = DRI.map((row) => row.id);

/** The largest amount that is accepted, in any unit (the biggest default is potassium, 3.400 mg). */
export const CUSTOM_TARGET_MAX = 100000;

/** Reads a saved value: the known nutrients with a positive finite number, nothing else. Undefined when none is left. */
export function parseCustomTargets(value: unknown): CustomTargets | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const kept: CustomTargets = {};
  for (const [id, amount] of Object.entries(value as Record<string, unknown>)) {
    if (CUSTOM_TARGET_IDS.includes(id) && typeof amount === "number" && Number.isFinite(amount) && amount > 0 && amount <= CUSTOM_TARGET_MAX) kept[id] = amount;
  }
  return Object.keys(kept).length > 0 ? kept : undefined;
}

/** What was typed ("1,5" or "1.5") as an amount, or the reason it is not one, in the app's words. */
export function parseCustomAmount(text: string): { value: number } | { error: string } {
  const normalised = text.trim().replace(",", ".");
  if (normalised === "") return { error: "Nhập một số lớn hơn 0" };
  const value = Number(normalised);
  if (!Number.isFinite(value) || value <= 0) return { error: "Nhập một số lớn hơn 0" };
  if (value > CUSTOM_TARGET_MAX) return { error: "Số này quá lớn" };
  return { value: Math.round(value * 1000) / 1000 };
}

/** The set with one nutrient set to `amount`, or back to the default when `amount` is null. Undefined when it ends up empty. */
export function withCustomTarget(custom: CustomTargets | undefined, id: string, amount: number | null): CustomTargets | undefined {
  if (!CUSTOM_TARGET_IDS.includes(id)) return custom;
  const next = { ...custom };
  if (amount === null) delete next[id];
  else next[id] = amount;
  return Object.keys(next).length > 0 ? next : undefined;
}

/** The targets with the custom amounts in place of the DRI ones (one value each). Targets without a custom amount are the same objects. */
export function applyCustomTargets(targets: CompleteTargets, custom: CustomTargets | undefined): CompleteTargets {
  if (!custom) return targets;
  const next: CompleteTargets = { ...targets };
  for (const [id, amount] of Object.entries(custom)) {
    if (CUSTOM_TARGET_IDS.includes(id)) next[id] = { min: amount, max: amount };
  }
  return next;
}

export const isCustom = (custom: CustomTargets | undefined, id: string): boolean => custom?.[id] !== undefined;
