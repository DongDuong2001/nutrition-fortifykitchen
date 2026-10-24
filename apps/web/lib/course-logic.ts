/**
 * Khoá học (Tài liệu as courses, docs/07 §2.14): the shapes the API answers with and the pure rules the screens and the mock share.
 * Khoá → Phần → Bài. The server decides access in live mode (`unlocked` and `lock` on every course); `courseLock` is the same rule for
 * mock mode and for the tests. Nothing here touches the network, storage or React.
 */
import type { Level, Role } from "./coaching-link";
import { canManageClients } from "./coaching-link";

export type CourseAccess = "open" | "code" | "level";
export type LessonKind = "pdf" | "text";

/** Why a course is shut: it wants a code, or the user's Level is below `minLevel`. */
export type CourseLock = { kind: "code" } | { kind: "level"; minLevel: number };

export interface CourseSummary {
  id: string;
  title: string;
  subtitle: string;
  /** 0-7: the gradient pair of COURSE_TONES */
  tone: number;
  access: CourseAccess;
  minLevel?: number;
  lessonCount: number;
  doneCount: number;
  unlocked: boolean;
  lock?: "code" | "level";
  createdAt: string;
  updatedAt: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  kind: LessonKind;
  /** PDF pages (0 for a written lesson) */
  pageCount: number;
  /** Minutes to read a written lesson (0 for a PDF) */
  minutes: number;
  /** A PDF is ready once the coach finished uploading its pages; a learner never sees one that is not */
  ready: boolean;
  done: boolean;
  /** The page the user stopped on (0: never opened) */
  lastPage: number;
}

export interface CoursePart {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CourseDetail extends CourseSummary {
  parts: CoursePart[];
  resume?: { lessonId: string; page: number };
}

/** One lesson as the reader opens it; a written lesson carries its markdown. */
export interface LessonView extends CourseLesson {
  courseId: string;
  partId: string;
  content?: string;
}

/** The inputs of an access check; `unlocked` = the user opened this course with a code that is still live. */
export interface AccessContext {
  role: Role;
  level: Level;
  unlocked: boolean;
}

/** null = open to this user. A coach or an admin sees every course. */
export function courseLock(course: Pick<CourseSummary, "access" | "minLevel">, ctx: AccessContext): CourseLock | null {
  if (canManageClients(ctx.role)) return null;
  if (course.access === "code") return ctx.unlocked ? null : { kind: "code" };
  if (course.access === "level") {
    const min = course.minLevel ?? 1;
    return ctx.level >= min ? null : { kind: "level", minLevel: min };
  }
  return null;
}

/** The words on a locked tile (D-COL-04: a word, never colour alone). */
export function lockLabel(lock: CourseLock): string {
  return lock.kind === "code" ? "Cần mã" : `Mở ở Level ${lock.minLevel}`;
}

/** How many of the 10 slanted segments are lit (UI-RULES §6): rounded down, but any progress shows one. */
export function segmentsOn(done: number, total: number): number {
  if (!(total > 0) || !(done > 0)) return 0;
  return Math.min(10, Math.max(1, Math.floor((done / total) * 10)));
}

export const progressText = (done: number, total: number): string => `${done}/${total} bài`;

/** Học tiếp: the first lesson that is ready and not finished, at the page the user stopped on. */
export function resumeOf(parts: CoursePart[]): { lessonId: string; page: number } | null {
  for (const part of parts) {
    for (const l of part.lessons) {
      if (l.ready && !l.done) return { lessonId: l.id, page: Math.max(1, l.lastPage) };
    }
  }
  return null;
}

/** Bài tiếp: the lesson after `lessonId` in reading order (across parts) that is ready. */
export function nextLesson(parts: CoursePart[], lessonId: string): CourseLesson | null {
  const all = parts.flatMap((p) => p.lessons);
  const at = all.findIndex((l) => l.id === lessonId);
  if (at < 0) return null;
  return all.slice(at + 1).find((l) => l.ready) ?? null;
}

/** A PDF counts as read once its last page has been on screen. */
export const completesAt = (page: number, pageCount: number): boolean => pageCount > 0 && page >= pageCount;

/** "Bài 3 · PDF · 4 trang · đang đọc trang 2": the second line of a lesson row. `n` counts across the whole course. */
export function lessonMeta(n: number, l: Pick<CourseLesson, "kind" | "pageCount" | "minutes" | "lastPage" | "done">): string {
  const size = l.kind === "pdf" ? `PDF · ${l.pageCount} trang` : `Bài viết · ${l.minutes} phút đọc`;
  const where = l.kind === "pdf" && !l.done && l.lastPage > 1 ? ` · đang đọc trang ${l.lastPage}` : "";
  return `Bài ${n} · ${size}${where}`;
}

/**
 * The eight gradient pairs a coach picks from: two deep-* tokens at 135°, as the design boards. Yellow, brown and grey are left out
 * (white text needs 4,5:1 on both ends). The first colour also drives a part's dot and its lesson tiles.
 */
export const COURSE_TONES: readonly (readonly [string, string])[] = [
  ["var(--color-cobalt)", "var(--color-deep-indigo)"],
  ["var(--color-deep-orange)", "var(--color-deep-pink)"],
  ["var(--color-deep-teal)", "var(--color-deep-blue)"],
  ["var(--color-deep-purple)", "var(--color-deep-indigo)"],
  ["var(--color-deep-mint)", "var(--color-deep-cyan)"],
  ["var(--color-deep-green)", "var(--color-deep-teal)"],
  ["var(--color-deep-pink)", "var(--color-deep-purple)"],
  ["var(--color-deep-blue)", "var(--color-deep-cyan)"],
];

const toneAt = (tone: number) => COURSE_TONES[((Math.trunc(tone) % COURSE_TONES.length) + COURSE_TONES.length) % COURSE_TONES.length];

/** Built like --gradient-tile-rainbow (globals.css): a 0 → 12 % ink shade over the 135° pair. */
export const tileBackground = (tone: number): string =>
  `linear-gradient(180deg, rgb(0 0 0 / 0) 0%, rgb(0 0 0 / 0.12) 100%), linear-gradient(135deg, ${toneAt(tone)[0]}, ${toneAt(tone)[1]})`;

/** A lesson tile inside a part: the pair without the shade (an IconTile, 44 px). */
export const pairBackground = (tone: number): string => `linear-gradient(135deg, ${toneAt(tone)[0]}, ${toneAt(tone)[1]})`;

/** The 4 px accent bar before a course's title: the pair top to bottom. */
export const accentBackground = (tone: number): string => `linear-gradient(180deg, ${toneAt(tone)[0]}, ${toneAt(tone)[1]})`;

export const partTone = (tone: number): string => toneAt(tone)[0];

/** The colour index of part `i` of a course: the course's tone, then the next ones (the design's parts each have their own pair). */
export const partToneIndex = (courseTone: number, i: number): number => (courseTone + i) % COURSE_TONES.length;

/** "22/10" for the "cập nhật" line of a tile. */
export function dayMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const vn = new Date(d.getTime() + 7 * 3600_000);
  return `${String(vn.getUTCDate()).padStart(2, "0")}/${String(vn.getUTCMonth() + 1).padStart(2, "0")}`;
}
