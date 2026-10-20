/**
 * One interruption per app open (fix/polish-1020). Three things open over the screen by themselves: "Có gì mới" (a new
 * release), the install pop-up and a first-time tip. They used to wait for each other in a loop of their own, so one app open
 * could show all three one after another. Now there is one order and one allowance:
 *   Có gì mới > the install pop-up > a first-time tip, and at most ONE of them opens per app open (per page load).
 * Each host says whether it has something to show (setInterruptionDue) and asks before it opens (claimInterruption): it may
 * only if nothing has opened yet and nothing of a higher rank is due. A tip also waits while a field has focus or a sheet is moving
 * (see interruptionBlockedByUi). Pure module state, no React; the hosts subscribe to be told when to look again.
 */
export type Interruption = "whats-new" | "install" | "tip";

const RANK: Record<Interruption, number> = { "whats-new": 0, install: 1, tip: 2 };

let shown: Interruption | null = null;
let version = 0;
const due = new Set<Interruption>();
const listeners = new Set<() => void>();
const notify = () => {
  version += 1;
  listeners.forEach((l) => l());
};

/** The host has something it wants to show now (or no longer does). A higher-ranked one that is due holds the others back. */
export function setInterruptionDue(kind: Interruption, isDue: boolean): void {
  if (isDue === due.has(kind)) return;
  if (isDue) due.add(kind);
  else due.delete(kind);
  notify();
}

/** Nothing has opened yet this app open, and no kind of a higher rank is due. */
export function mayInterrupt(kind: Interruption): boolean {
  if (shown !== null) return false;
  return !([...due] as Interruption[]).some((other) => RANK[other] < RANK[kind]);
}

/** The host is about to open: true when it may (and then nothing else opens this app open). */
export function claimInterruption(kind: Interruption): boolean {
  if (!mayInterrupt(kind)) return false;
  shown = kind;
  due.delete(kind);
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
  shown = null;
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
