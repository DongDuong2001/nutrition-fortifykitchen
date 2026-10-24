/**
 * The shapes and the refusal of the courses API, shared by the live client (lib/courses.ts) and the mock (lib/mock/courses-mock.ts).
 */
import type { Level, Role } from "./coaching-link";
import type { CourseAccess, CourseDetail, CourseLock, CourseSummary, LessonView } from "./course-logic";

/** A code of a course as its coach sees it; `code` (the value) comes only back from `createCode`, once. */
export interface CourseCode {
  id: string;
  createdAt: string;
  expiresAt: string;
}

export interface CourseInput {
  title: string;
  subtitle?: string;
  tone?: number;
  access: CourseAccess;
  minLevel?: number;
}

export interface LessonPatch {
  title?: string;
  partId?: string;
  content?: string;
}

/** Who is asking: the mock decides access from it; live mode lets the server decide from the session. */
export interface CourseViewer {
  role: Role;
  level: Level;
}

export interface CoursesApi {
  list(): Promise<CourseSummary[]>;
  get(id: string): Promise<CourseDetail>;
  /** Opens a code course with the course's code; a CoursesError 403 `bad-code` when it is not a live code of this course. */
  open(id: string, code: string): Promise<CourseDetail>;
  lesson(courseId: string, lessonId: string): Promise<LessonView>;
  /** The page as an image URL for <img> (an object URL; call `revoke` when the page leaves the screen). */
  page(courseId: string, lessonId: string, n: number): Promise<{ src: string; revoke: () => void }>;
  progress(courseId: string, lessonId: string, body: { lastPage: number; completed?: boolean }): Promise<void>;
  createCourse(input: CourseInput): Promise<CourseSummary>;
  updateCourse(id: string, patch: Partial<CourseInput>): Promise<CourseSummary>;
  deleteCourse(id: string): Promise<void>;
  addPart(courseId: string, title: string): Promise<{ id: string }>;
  renamePart(courseId: string, partId: string, title: string): Promise<void>;
  deletePart(courseId: string, partId: string): Promise<void>;
  reorderParts(courseId: string, ids: string[]): Promise<void>;
  addTextLesson(courseId: string, input: { partId: string; title: string; content: string }): Promise<{ id: string }>;
  /** A PDF lesson starts hidden: add the pages with `uploadPage`, then `finishLesson`. */
  addPdfLesson(courseId: string, input: { partId: string; title: string; pageCount: number }): Promise<{ id: string }>;
  /** `data` is the page as a base64 WebP (at most 1 MiB decoded). */
  uploadPage(courseId: string, lessonId: string, n: number, data: string): Promise<void>;
  finishLesson(courseId: string, lessonId: string): Promise<void>;
  updateLesson(courseId: string, lessonId: string, patch: LessonPatch): Promise<void>;
  deleteLesson(courseId: string, lessonId: string): Promise<void>;
  reorderLessons(courseId: string, partId: string, ids: string[]): Promise<void>;
  codes(courseId: string): Promise<CourseCode[]>;
  createCode(courseId: string): Promise<CourseCode & { code: string }>;
  revokeCode(courseId: string, codeId: string): Promise<void>;
}

/** Limits the coach's screens check before the server does (the server's are in docs/07 §2.14). */
export const MAX_LESSON_PAGES = 60;
export const MAX_TEXT_BYTES = 1_000_000;
export const MAX_PAGE_BYTES = 1024 * 1024;

const MESSAGES: Record<number, string> = {
  400: "Chưa đúng. Kiểm tra lại rồi thử lại.",
  401: "Phiên đăng nhập đã hết. Đăng nhập lại rồi thử lại.",
  403: "Bạn chưa có quyền mở phần này.",
  404: "Không còn khóa hoặc bài này.",
  409: "Bài này chưa đủ trang. Thử lại.",
  413: "Tệp quá lớn.",
  429: "Thử lại sau ít phút.",
};

/** A refusal from the API (or the mock). `kind` tells a wrong code from a lock; `lock` says why a course is shut. */
export class CoursesError extends Error {
  constructor(
    public readonly status: number,
    public readonly kind: "locked" | "bad-code" | "other" = "other",
    public readonly lock: CourseLock | null = null
  ) {
    super(kind === "bad-code" ? BAD_CODE : (MESSAGES[status] ?? "Máy chủ báo lỗi. Thử lại sau."));
  }
}

/** Under the code field: the four ways a code fails look the same on purpose (the server does not say which). */
export const BAD_CODE = "Mã truy cập không đúng, đã hết hạn, đã bị thu hồi hoặc dành cho khóa khác.";

export function coursesErrorText(error: unknown): string {
  return error instanceof CoursesError ? error.message : "Không kết nối được máy chủ. Thử lại sau.";
}

/** A typed code as the API compares it: any case, spaces and dashes ignored. */
export const normalizeCode = (code: string): string => code.replace(/[\s-]/g, "").toUpperCase();
