/**
 * What the person has in hand that a reload would lose: a tray of foods not yet added, a portion sheet that is open, a form with
 * something typed in it. The update ("Có bản mới", components/pwa/update-offer.tsx and pwa-register.tsx) reloads the page only when
 * this is empty, besides the outbox being empty. One small registry:
 *  - a screen that holds state marks it by id (`useUnsavedWork("add-tray", tray.length > 0)`);
 *  - any form field the person edits is noticed by `installFormWatch()` (one listener on the document): it counts until its form is
 *    submitted or the page changes, so no form has to be wired one by one.
 */
import { useEffect, useSyncExternalStore } from "react";

const marks = new Set<string>();
const dirtyFields = new Set<Element>();
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((l) => l());
};

/** Marks (or clears) a piece of unsaved state by id. */
export function setUnsavedWork(id: string, active: boolean): void {
  if (active === marks.has(id)) return;
  if (active) marks.add(id);
  else marks.delete(id);
  emit();
}

/** True while anything is marked or an edited field is still on the page. */
export function hasUnsavedWork(): boolean {
  for (const el of dirtyFields) if (!el.isConnected) dirtyFields.delete(el);
  return marks.size > 0 || dirtyFields.size > 0;
}

export function subscribeUnsavedWork(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** The screen holds unsaved state while `active`. */
export function useUnsavedWork(id: string, active: boolean): void {
  useEffect(() => {
    setUnsavedWork(id, active);
    return () => setUnsavedWork(id, false);
  }, [id, active]);
}

/** Re-renders on every change; reads whether there is unsaved work. */
export function useHasUnsavedWork(): boolean {
  return useSyncExternalStore(subscribeUnsavedWork, hasUnsavedWork, () => false);
}

const TEXT_TYPES = new Set(["text", "number", "tel", "email", "password", "date", "time", "datetime-local", "url", "month", "week"]);

/** A field that holds something the person typed for a form, not a search or filter box. */
export function isFormField(el: Element | null): boolean {
  if (!el || el.closest("[data-no-unsaved]")) return false;
  if (el.matches("textarea")) return true;
  if (el.matches("select")) return true;
  if (!el.matches("input")) return false;
  const input = el as HTMLInputElement;
  if (input.type === "search" || input.getAttribute("role") === "searchbox" || input.getAttribute("inputmode") === "search") return false;
  if (input.dataset.testid === "food-search" || el.getAttribute("data-testid") === "food-search") return false;
  return TEXT_TYPES.has(input.type);
}

let watching = false;

/** The address changed (the screen with the form is gone): its fields no longer count. */
export function clearDirtyFields(): void {
  if (dirtyFields.size === 0) return;
  dirtyFields.clear();
  emit();
}

/** One listener for every form of the app: an edited field counts until its form is submitted or the page changes (clearDirtyFields). Idempotent. */
export function installFormWatch(): () => void {
  if (watching || typeof document === "undefined") return () => {};
  watching = true;
  const onInput = (e: Event) => {
    const el = e.target as Element | null;
    if (!e.isTrusted || !isFormField(el) || dirtyFields.has(el as Element)) return;
    dirtyFields.add(el as Element);
    emit();
  };
  const onSubmit = (e: Event) => {
    const form = e.target as HTMLFormElement | null;
    let changed = false;
    for (const el of [...dirtyFields]) {
      if (form?.contains?.(el)) {
        dirtyFields.delete(el);
        changed = true;
      }
    }
    if (changed) emit();
  };
  document.addEventListener("input", onInput, true);
  document.addEventListener("submit", onSubmit, true);
  return () => {
    watching = false;
    document.removeEventListener("input", onInput, true);
    document.removeEventListener("submit", onSubmit, true);
  };
}

/** Tests only. */
export function resetUnsavedWork(): void {
  marks.clear();
  dirtyFields.clear();
}
