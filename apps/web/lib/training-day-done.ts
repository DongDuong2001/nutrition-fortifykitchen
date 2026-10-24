/**
 * feat/sound-goals RA1: Ngày tập done. /training has a header per phase, so the moment plays on the phase whose tick completed
 * the day: its "x / y" pops and its header glides to "Xong Ngày tập hôm nay". Pure: the phases and the ticked ids before and after.
 */
export interface DayPhase {
  id: string;
  items: readonly { id: string }[];
}

/**
 * The phase whose tick completed the day, or null: the day was not complete before and is now (every item of the checklist ticked,
 * at least one item), so a refetch, an untick and a rest day never match. When one change ticks several items (a mix logs two), the
 * phase of the last of them in the checklist's order.
 */
export function dayCompletedBy(phases: readonly DayPhase[], before: readonly string[], after: readonly string[]): string | null {
  const items = phases.flatMap((phase) => phase.items.map((item) => ({ id: item.id, phase: phase.id })));
  if (items.length === 0) return null;
  const was = new Set(before);
  const now = new Set(after);
  if (!items.every((item) => now.has(item.id)) || items.every((item) => was.has(item.id))) return null;
  return items.findLast((item) => !was.has(item.id))?.phase ?? null;
}
