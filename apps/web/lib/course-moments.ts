import { accountStorage, type KeyValueStore } from "./storage-keys";

/**
 * feat/sound-goals §5b: the course moments. The tap that makes every lesson of a course done plays "Xong khóa học" on the done
 * button, once per course per account; the code sheet closes 450 ms after its lock opens. Pure, except the record's load/save.
 */
export interface LessonState {
  id: string;
  done: boolean;
}

/** The tap on `tappedId` makes every lesson of the course done: it was open, and no other is (any lesson, not only the last in order). */
export function courseFinishedBy(lessons: readonly LessonState[], tappedId: string): boolean {
  const tapped = lessons.find((lesson) => lesson.id === tappedId);
  return !!tapped && !tapped.done && lessons.every((lesson) => lesson.id === tappedId || lesson.done);
}

/** The finishing tap on a course the account has not finished before. */
export function courseMomentDue(lessons: readonly LessonState[], tappedId: string, courseId: string, finished: readonly string[]): boolean {
  return !finished.includes(courseId) && courseFinishedBy(lessons, tappedId);
}

const FINISHED_KEY = "h1t_courses_finished_v1";

export function withFinishedCourse(finished: readonly string[], courseId: string): string[] {
  return finished.includes(courseId) ? [...finished] : [...finished, courseId];
}

export function loadFinishedCourses(storage: KeyValueStore | null = accountStorage()): string[] {
  try {
    const saved = JSON.parse(storage?.getItem(FINISHED_KEY) ?? "null");
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveFinishedCourses(finished: readonly string[], storage: KeyValueStore | null = accountStorage()): void {
  try {
    storage?.setItem(FINISHED_KEY, JSON.stringify(finished));
  } catch {
    // Storage full or blocked: the moment may play once more
  }
}

/** The lock opens on the sheet's tile, then the sheet closes and `onOpened` runs. */
export const CODE_CLOSE_MS = 450;

/** Milliseconds until the sheet closes: 450 ms after the code was accepted, or at once when the person closed it first (D-MOT-03). */
export function codeCloseDelay({ acceptedAt, now, closed }: { acceptedAt: number; now: number; closed: boolean }): number {
  return closed ? 0 : Math.max(0, acceptedAt + CODE_CLOSE_MS - now);
}
