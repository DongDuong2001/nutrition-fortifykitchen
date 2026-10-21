/**
 * The toast after an add. Every add offers Hoàn tác (the one undo path of lib/diary-store: `undoCopy` takes out `undoIds`, on the
 * server through the outbox like a delete). Adds into the same meal that follow one another while the toast is still up update that
 * toast in place ("Đã thêm 2 món vào Bữa trưa"), and its Hoàn tác takes out all of them: it removes what the toast says it added.
 */
import type { MealSlot } from "@/lib/meal-slot";
import type { ToastInfo } from "@/lib/diary-store";

/** How long the toast, and with it the chance to undo, stays. */
export const ADD_TOAST_MS = 8000;

export interface AddedFact {
  entryId: string;
  foodName: string;
  /** "150 g", "3 quả": the amount set. */
  amount: string;
  mealSlot: MealSlot;
  mealNameVi: string;
  /** "" for today, " hôm qua" and so on. */
  dayText: string;
}

/** The toast for one food just added, given the toast on screen (null when none). `nextGroupId` is used for a toast that starts a group. */
export function addedToast(prev: ToastInfo | null, fact: AddedFact, nextGroupId: () => number): ToastInfo {
  const more = prev?.kind === "undoable" && prev.groupId !== undefined && prev.mealSlot === fact.mealSlot && (prev.undoIds?.length ?? 0) > 0;
  const count = more ? (prev.count ?? 1) + 1 : 1;
  return {
    message: count > 1 ? `Đã thêm ${count} món vào ${fact.mealNameVi}${fact.dayText}` : `Đã thêm ${fact.foodName} ${fact.amount} vào ${fact.mealNameVi}${fact.dayText}`,
    kind: "undoable",
    mealSlot: fact.mealSlot,
    durationMs: ADD_TOAST_MS,
    count,
    groupId: more ? prev.groupId : nextGroupId(),
    undoIds: more ? [...(prev.undoIds ?? []), fact.entryId] : [fact.entryId],
  };
}

/**
 * What is on screen after a toast's action ran and the toast is to end. The action may have put another toast up (undoLastDelete's
 * follow-up, a retry's notice) or none: only the toast that was shown is ended, a newer one is left alone.
 */
export function toastAfterAction(current: ToastInfo | null, shown: ToastInfo): ToastInfo | null {
  return current === shown ? null : current;
}

/** The ids Hoàn tác takes out: those of the toast on screen, none when there is no such toast (it expired, or another kind is up). */
export function undoIdsOf(toast: ToastInfo | null | undefined): string[] {
  return toast?.kind === "undoable" && toast.undoIds ? toast.undoIds : [];
}
