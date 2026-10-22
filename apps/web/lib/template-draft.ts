import { addTemplateItems, templateItemCount, type DayTemplate, type DayTemplateItem, type DayTemplateMeal, type DayTemplateTag } from "./day-templates";
import type { MealSlot } from "./meal-slot";

/**
 * The Ngày ăn mẫu being edited (feat/template-builder): one draft at a time, in memory, shared by the editor and the + sheet's
 * template mode (/add?mau=<id>), which adds foods to a meal of the draft instead of the diary. Nothing is stored until Lưu. The
 * editor drops the draft when it is left, unless it went to the + sheet (holdDraft), which comes back to it. A reload loses it,
 * as a form does.
 */
export interface TemplateDraft {
  id: string;
  /** Built from scratch: not in the list until Lưu */
  isNew: boolean;
  name: string;
  tag: DayTemplateTag;
  meals: DayTemplateMeal[];
  createdAt: string;
}

let draft: TemplateDraft | null = null;
let held = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribeDraft(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const currentDraft = (): TemplateDraft | null => draft;

/** The draft of template `id`, or null. */
export const draftFor = (id: string): TemplateDraft | null => (draft?.id === id ? draft : null);

/** A day built from scratch: the new name, the given tag, no food in any meal. */
export function newTemplateDraft(input: { id: string; name: string; tag: DayTemplateTag; now: string }): TemplateDraft {
  return { id: input.id, isNew: true, name: input.name, tag: input.tag, meals: [], createdAt: input.now };
}

/** The draft of a saved template (its own copy: nothing changes the list until Lưu). */
export const draftOf = (template: DayTemplate): TemplateDraft => ({ ...template, isNew: false, meals: template.meals.map((m) => ({ ...m, items: [...m.items] })) });

export function startDraft(next: TemplateDraft): void {
  draft = next;
  held = false;
  emit();
}

export function updateDraft(id: string, patch: Partial<Pick<TemplateDraft, "name" | "tag" | "meals">>): void {
  if (draft?.id !== id) return;
  draft = { ...draft, ...patch };
  emit();
}

/** The + sheet in template mode adds foods to one meal of the draft. False when the draft is gone (a reload). */
export function addToDraft(id: string, slot: MealSlot, items: readonly DayTemplateItem[]): boolean {
  if (draft?.id !== id || items.length === 0) return false;
  draft = { ...draft, meals: addTemplateItems(draft.meals, slot, items) };
  emit();
  return true;
}

/** The editor goes to the + sheet: the draft stays for its return. */
export function holdDraft(id: string): void {
  if (draft?.id === id) held = true;
}

/** The editor is left (Lưu, Back, a delete): the draft goes, unless it was held for the + sheet. Returns true when it went. */
export function releaseDraft(id: string): boolean {
  if (draft?.id !== id) return false;
  if (held) {
    held = false;
    return false;
  }
  draft = null;
  emit();
  return true;
}

/** Drops the draft whatever holds it (after Lưu). */
export function discardDraft(id: string): void {
  if (draft?.id !== id) return;
  draft = null;
  held = false;
  emit();
}

export const draftFoodCount = (d: TemplateDraft): number => templateItemCount(d.meals);
