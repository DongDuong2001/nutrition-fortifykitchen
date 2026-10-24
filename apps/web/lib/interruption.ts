/**
 * One interruption per app open (fix/polish-1020). Three things open over the screen by themselves: "Có gì mới" (a new
 * release), the install pop-up and a first-time tip. They used to wait for each other in a loop of their own, so one app open
 * could show all three one after another. Now there is one order and one allowance:
 *   Có gì mới > the install pop-up > a first-time tip, and at most ONE of them opens per app open (per page load).
 * Each host says whether it has something to show (setInterruptionDue) and asks before it opens (claimInterruption): it may
 * only if nothing has opened yet and nothing of a higher rank is due. A tip also waits while a field has focus or a sheet is moving
 * (see interruptionBlockedByUi). Pure module state, no React; the hosts subscribe to be told when to look again.
 * One exception (share-spotlight, Hao 22/10): once "Có gì mới" has opened and closed, one tip that is made to follow it (the share tip)
 * may open right after it, in the same app open (followWhatsNew).
 * The Level-up celebration (feat/level-ui) ranks after Có gì mới and before the install pop-up: it plays first, or in the place of
 * that tip right after Có gì mới (claimLevelUp).
 */
import { HOME_ROUTE } from "@/lib/nav";

export type Interruption = "whats-new" | "level-up" | "install" | "tip";

const RANK: Record<Interruption, number> = { "whats-new": 0, "level-up": 1, install: 2, tip: 3 };

let shown: Interruption | null = null;
let followed = false;
let version = 0;
// Which hosts have said, at least once, whether they are due. Có gì mới is lazy and may come late: on Hôm nay the others wait for its
// report (up to REPORT_GRACE_MS after the page loaded) so a slow start cannot give its place to the install pop-up or a tip.
const reported = new Set<Interruption>();
const OPENED_AT = typeof performance !== "undefined" ? performance.now() : 0;
export const REPORT_GRACE_MS = 6000;
const due = new Set<Interruption>();
const listeners = new Set<() => void>();
const notify = () => {
  version += 1;
  listeners.forEach((l) => l());
};

/** The host has something it wants to show now (or no longer does). A higher-ranked one that is due holds the others back. */
export function setInterruptionDue(kind: Interruption, isDue: boolean): void {
  const firstReport = !reported.has(kind);
  reported.add(kind);
  if (isDue === due.has(kind) && !firstReport) return;
  if (isDue === due.has(kind)) {
    notify();
    return;
  }
  if (isDue) due.add(kind);
  else due.delete(kind);
  notify();
}

/** Nothing has opened yet this app open, and no kind of a higher rank is due. */
export function mayInterrupt(kind: Interruption): boolean {
  if (shown !== null) return false;
  if (kind !== "whats-new" && waitingForWhatsNew()) return false;
  return !([...due] as Interruption[]).some((other) => RANK[other] < RANK[kind]);
}

/** On Hôm nay, before Có gì mới has said whether it is due, and while the grace period lasts. */
function waitingForWhatsNew(): boolean {
  if (reported.has("whats-new") || typeof location === "undefined" || location.pathname !== HOME_ROUTE) return false;
  return typeof performance !== "undefined" && performance.now() - OPENED_AT < REPORT_GRACE_MS;
}
if (typeof window !== "undefined") {
  // The grace period ends without anything else changing: the hosts that waited look again
  window.setTimeout(notify, REPORT_GRACE_MS + 50);
}

/** The host is about to open: true when it may (and then nothing else opens this app open). */
export function claimInterruption(kind: Interruption): boolean {
  if (!mayInterrupt(kind)) return false;
  shown = kind;
  due.delete(kind);
  notify();
  return true;
}

/** "Có gì mới" opened this app open and nothing has followed it yet: the one tip that may follow it can open now. */
export function mayFollowWhatsNew(): boolean {
  return shown === "whats-new" && !followed && !due.has("level-up");
}

/** That tip is about to open: true when it may (and then nothing else follows). */
export function claimFollowWhatsNew(): boolean {
  if (!mayFollowWhatsNew()) return false;
  followed = true;
  notify();
  return true;
}

/** The Level-up celebration is about to play: first this app open, or right after Có gì mới (then nothing else follows). */
export function claimLevelUp(): boolean {
  if (claimInterruption("level-up")) return true;
  if (shown !== "whats-new" || followed) return false;
  followed = true;
  due.delete("level-up");
  notify();
  return true;
}

/** What opened this app open, if anything. */
export function interruptionShown(): Interruption | null {
  return shown;
}

/** Changes whenever the state does: a host reads it (useSyncExternalStore) to look again. */
export function interruptionVersion(): number {
  return version;
}

export function subscribeInterruption(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** For tests: a new app open. */
export function resetInterruptions(): void {
  reported.clear();
  shown = null;
  followed = false;
  version = 0;
  due.clear();
  listeners.clear();
}

/** The small part of the document a tip needs to look at before it opens. */
export interface UiProbe {
  activeElement: { tagName: string; isContentEditable?: boolean } | null;
  /** The focused field was focused by the screen itself (the add sheet's search field) and is still empty: nobody is typing in it. */
  autofocusedEmpty?: boolean;
  /** A sheet is sliding in or out (a transition or animation of an .m-sheet is running). */
  sheetMoving: boolean;
}

const FIELD_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * A tip never opens over a field that has focus (it would take the keyboard's place on a phone and steal the person's typing)
 * or while a sheet is mid-motion (it would point at something that is still moving). A field the screen focused itself and
 * nobody has typed in (the add sheet's search field, which is where the add tips belong) does not count: the person is not typing.
 */
export function interruptionBlockedByUi({ activeElement, sheetMoving, autofocusedEmpty }: UiProbe): boolean {
  if (sheetMoving) return true;
  if (autofocusedEmpty) return false;
  return !!activeElement && (FIELD_TAGS.has(activeElement.tagName) || activeElement.isContentEditable === true);
}

/** Reads the real document (client only). */
export function probeUi(doc: Document = document): UiProbe {
  const sheetMoving = Array.from(doc.querySelectorAll<HTMLElement>(".m-sheet")).some((el) => el.getAnimations().some((a) => a.playState === "running"));
  const field = doc.activeElement as HTMLInputElement | null;
  const autofocusedEmpty = !!field && field.dataset?.autofocused !== undefined && (field.value ?? "") === "";
  return { activeElement: field, sheetMoving, autofocusedEmpty };
}
