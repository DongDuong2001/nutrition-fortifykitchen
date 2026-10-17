// The install event and the device facts the install sheet needs. Client only (window); the pure rules are in lib/pwa.
// Chrome fires beforeinstallprompt once, early, so the capture starts in the root layout (PwaRegister) and the
// event is held here until a screen asks for it.

import { useSyncExternalStore } from "react";
import { completeInstallPrompt, detectInAppBrowser, dismissInstallPrompt, isIosSafari, isTouchPhone, phoneKind, type InAppBrowser } from "./pwa";
import { loadInstallPrompt, saveInstallPrompt } from "./settings";

/** Chrome's install event; not in the DOM lib. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let held: BeforeInstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Listens for beforeinstallprompt once. Safe to call again. */
export function startInstallCapture(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    held = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    held = null;
    markInstallDone();
    emit();
  });
}

/** The event can be used once. */
export function clearInstallEvent(): void {
  held = null;
  emit();
}

function subscribe(listener: () => void) {
  startInstallCapture();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The held install event, or null (also on the server and where the browser never offers one). */
export function useInstallEvent(): BeforeInstallPromptEvent | null {
  return useSyncExternalStore(subscribe, () => held, () => null);
}

export interface InstallDevice {
  standalone: boolean;
  phone: "ios" | "android" | null;
  inApp: InAppBrowser | null;
  touchPhone: boolean;
  safari: boolean;
}

export function readStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/** What this device is. Read after mount so the server and first paint agree. */
export function readInstallDevice(): InstallDevice {
  const { userAgent, maxTouchPoints } = window.navigator;
  return {
    standalone: readStandalone(),
    phone: phoneKind(userAgent, maxTouchPoints),
    inApp: detectInAppBrowser(userAgent),
    touchPhone: isTouchPhone(window.matchMedia("(pointer: coarse)").matches, window.innerWidth),
    safari: isIosSafari(userAgent, maxTouchPoints),
  };
}

/** "Tôi đã cài xong" or the appinstalled event: the pop-up never opens by itself again for this account. */
export function markInstallDone(): void {
  saveInstallPrompt(completeInstallPrompt(loadInstallPrompt()));
}

/** "Để sau", the close button or Esc on the pop-up that opened by itself: one more dismissal, 3 days of quiet. */
export function snoozeInstall(now: number = Date.now()): void {
  saveInstallPrompt(dismissInstallPrompt(loadInstallPrompt(), now));
}

const SHOWN_KEY = "h1t_install_shown";
let shownInMemory = false;

/** Whether the pop-up already opened by itself in this browser session (a reload keeps it; a new session resets it). */
export function installShownThisSession(): boolean {
  if (shownInMemory) return true;
  try {
    return window.sessionStorage.getItem(SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markInstallShown(): void {
  shownInMemory = true;
  try {
    window.sessionStorage.setItem(SHOWN_KEY, "1");
  } catch {
    // Storage blocked: the in-memory flag still holds until the page is reloaded
  }
}
