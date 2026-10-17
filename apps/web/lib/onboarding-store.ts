import { onboardingSwitchHonoured } from "./demo";
import { loadSettings, saveSettings } from "./settings";
import {
  markSeenIn,
  markTourStartedIn,
  markUsedIn,
  setTipsOffIn,
  type OnboardingFlags,
} from "./onboarding-flags";

/**
 * The tour and tip flags of the signed-in account, in its settings (lib/settings, h1t_settings_v1). Per account and
 * per device for now: Dong to sync them through the API later (OPEN_QUESTIONS). Client only.
 */

/** A device-level switch (the probes' seed): "1" means no tour and no tips on this browser, whatever the account says. Demo builds only; production ignores it. */
export const ONBOARDING_OFF_KEY = "h1t_onboarding_off";

export function onboardingDisabled(): boolean {
  try {
    return onboardingSwitchHonoured(globalThis.localStorage?.getItem(ONBOARDING_OFF_KEY) ?? null, process.env.NODE_ENV, process.env.NEXT_PUBLIC_DEMO_BUILD);
  } catch {
    return false;
  }
}

/** The same kind of switch for "Có gì mới" alone (cc-46): the probes set it so the sheet stays away unless a probe tests it. */
export const WHATS_NEW_OFF_KEY = "h1t_whats_new_off";

export function whatsNewDisabled(): boolean {
  if (onboardingDisabled()) return true;
  try {
    return onboardingSwitchHonoured(globalThis.localStorage?.getItem(WHATS_NEW_OFF_KEY) ?? null, process.env.NODE_ENV, process.env.NEXT_PUBLIC_DEMO_BUILD);
  } catch {
    return false;
  }
}

export function loadFlags(): OnboardingFlags {
  return loadSettings().onboarding;
}

type Listener = () => void;
const listeners = new Set<Listener>();
/** Called after every change of the flags (the overlay and Cài đặt re-read). Returns the unsubscribe. */
export function subscribeFlags(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(change: (flags: OnboardingFlags) => OnboardingFlags): OnboardingFlags {
  const current = loadFlags();
  const next = change(current);
  if (JSON.stringify(next) === JSON.stringify(current)) return current;
  saveSettings({ onboarding: next });
  listeners.forEach((l) => l());
  return next;
}

export const markTipSeen = (id: string) => update((f) => markSeenIn(f, id));
/** A feature was used (long-press edit, meal + Thêm, tray add, compare, create food, 7/30 toggle …): its tip stops. */
export const markUsed = (event: string) => update((f) => markUsedIn(f, event));
export const setTipsOff = (off: boolean) => update((f) => setTipsOffIn(f, off));
export const finishTour = () => update((f) => ({ ...f, tourDone: true }));
export const openReplay = () => update((f) => ({ ...f, replayOpened: true }));
export const markTourStarted = (iso: string) => update((f) => markTourStartedIn(f, iso));
/** The "Có gì mới" sheet of this release was closed (or setup finished: a new account starts with the onboarding tour instead) */
export const markWhatsNewSeen = (id: string) => update((f) => ({ ...f, whatsNewSeen: id }));
