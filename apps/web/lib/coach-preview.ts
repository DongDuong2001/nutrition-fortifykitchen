import type { Level } from "./coaching-link";
import { columnGroups } from "./level-nutrients";
import { getNutrientDefinition } from "./nutrients";

/**
 * "Học viên sẽ thấy": what a client's Hôm nay would list at a Level, with what the change adds or removes marked.
 * Pure: the coach screen only draws this.
 */
export type PreviewStatus = "same" | "added" | "removed";

export interface PreviewItem {
  id: string;
  name: string;
  status: PreviewStatus;
}

export interface PreviewGroup {
  title: string;
  items: PreviewItem[];
}

/** The groups of the draft Level in order; a nutrient the current Level shows and the draft does not follows as "removed". */
export function previewForLevel(current: Level, draft: Level): PreviewGroup[] {
  const before = columnGroups(current);
  const after = columnGroups(draft);
  const name = (id: string) => getNutrientDefinition(id)?.nameVi ?? id;
  const titles = [...new Set([...after.map((g) => g.title), ...before.map((g) => g.title)])];
  const order = ["Chi tiết béo & xơ", "Khoáng chất", "Vitamin"];
  titles.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return titles.map((title) => {
    const was = before.find((g) => g.title === title)?.ids ?? [];
    const now = after.find((g) => g.title === title)?.ids ?? [];
    const items: PreviewItem[] = [
      ...now.map((id) => ({ id, name: name(id), status: (was.includes(id) ? "same" : "added") as PreviewStatus })),
      ...was.filter((id) => !now.includes(id)).map((id) => ({ id, name: name(id), status: "removed" as PreviewStatus })),
    ];
    return { title, items };
  });
}

export function previewHasChanges(groups: PreviewGroup[]): boolean {
  return groups.some((g) => g.items.some((i) => i.status !== "same"));
}

/** "Đã đổi Level của Học viên A thành 3" */
export function levelChangedToast(name: string, level: number): string {
  return `Đã đổi Level của ${name} thành ${level}`;
}

/** The label of a client's last logged day: "Hôm nay 16/10", or null when they never logged. */
export function lastLoggedText(daysAgo: number | null, dayLabel: string | null): string {
  if (daysAgo === null) return "Chưa ghi món nào";
  return `Ghi gần nhất: ${dayLabel ?? `${daysAgo} ngày trước`}`;
}

/** The tag shown when the client has not logged today. */
export const NOT_LOGGED_TODAY = "Chưa ghi hôm nay";
export function loggedToday(daysAgo: number | null): boolean {
  return daysAgo === 0;
}
