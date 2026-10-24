/**
 * Khoá học in mock mode (demo and the gates): the same courses, rules and refusals as the API (docs/07 §2.14) kept in this browser's
 * localStorage, shared by the accounts on it so a coach's code opens the course for a learner here. The sample courses are the design
 * boards' (design/courses). Live mode never loads the data below: lib/courses.ts imports this file only when the build is not live (dynamically), and a live build
 * swaps it for lib/mock/live/courses-mock.ts (next.config.ts), so not one sample course ships to the browser.
 */
import { currentAccountId } from "../auth-actions";
import { canManageClients } from "../coaching-link";
import {
  completesAt,
  courseLock,
  resumeOf,
  type CourseDetail,
  type CourseLesson,
  type CoursePart,
  type CourseSummary,
  type LessonView,
} from "../course-logic";
import { CoursesError, MAX_LESSON_PAGES, MAX_PAGE_BYTES, MAX_TEXT_BYTES, normalizeCode, type CourseCode, type CoursesApi, type CourseViewer } from "../courses-types";
import { codeFromBytes, randomBytes } from "../mock-coach-server";

const KEY = "h1t_mock_courses_v1";
const PAGE_KEY = "h1t_mock_course_page_v1_";
const CODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface MockLesson {
  id: string;
  title: string;
  kind: "pdf" | "text";
  content?: string;
  pageCount: number;
  minutes: number;
  ready: boolean;
}
interface MockPart {
  id: string;
  title: string;
  lessons: MockLesson[];
}
interface MockCourse {
  id: string;
  title: string;
  subtitle: string;
  tone: number;
  access: "open" | "code" | "level";
  minLevel?: number;
  createdAt: string;
  updatedAt: string;
  parts: MockPart[];
}
interface MockCode extends CourseCode {
  courseId: string;
  code: string;
  revoked: boolean;
}
interface Mark {
  lastPage: number;
  completed: boolean;
}
interface State {
  courses: MockCourse[];
  codes: MockCode[];
  /** account → course → the code it was opened with */
  unlocks: Record<string, Record<string, string>>;
  /** account → lesson → progress */
  progress: Record<string, Record<string, Mark>>;
}

// ---- the sample courses (design/courses boards): ids are short and readable so the probes can name them ----

const T = (day: number) => `2026-10-${String(day).padStart(2, "0")}T09:00:00+07:00`;
const pdf = (id: string, title: string, pageCount: number): MockLesson => ({ id, title, kind: "pdf", pageCount, minutes: 0, ready: true });
const text = (id: string, title: string, content: string, minutes: number): MockLesson => ({ id, title, kind: "text", content, pageCount: 0, minutes, ready: true });

const SAMPLE_TEXT =
  "## Ý chính\n\nMột bữa quanh buổi tập chỉ cần ba thứ: tinh bột dễ tiêu, một ít đạm, ít chất xơ.\n\n- Trước tập 1-2 giờ: cơm, bánh mì, chuối.\n- Sau tập trong 2 giờ: thêm đạm (trứng, ức gà, sữa).\n\nNếu tập sáng sớm, một quả chuối và nước là đủ.";

const SEED_CODES = { "c-hit1set": "HKX7M2PB4D", "c-an-ngoai": "NQ3TV8WZ6C" };

function seed(): State {
  const courses: MockCourse[] = [
    {
      id: "c-hit1set",
      title: "Nhập môn HIT1SET",
      subtitle: "HLV Lê Hồng Khánh",
      tone: 0,
      access: "code",
      createdAt: T(20),
      updatedAt: T(22),
      parts: [
        { id: "p-hit-1", title: "Phần 1 · Mục tiêu của bạn", lessons: [pdf("l-hit-1", "App tính mục tiêu của bạn thế nào", 12), pdf("l-hit-2", "Đạm: bao nhiêu là đủ", 8)] },
        { id: "p-hit-2", title: "Phần 2 · Ăn quanh buổi tập", lessons: [text("l-hit-3", "Tinh bột quanh buổi tập", SAMPLE_TEXT, 4), pdf("l-hit-4", "Vì sao theo dõi 22 vi chất", 15)] },
        { id: "p-hit-3", title: "Phần 3 · Theo dõi mỗi ngày", lessons: [text("l-hit-5", "Ghi một ngày ăn cho đúng", SAMPLE_TEXT, 3), pdf("l-hit-6", "Đọc chỉ số mỗi tuần", 6)] },
      ],
    },
    {
      id: "c-an-quanh",
      title: "Ăn quanh buổi tập",
      subtitle: "HLV Lê Hồng Khánh",
      tone: 1,
      access: "open",
      createdAt: T(18),
      updatedAt: T(21),
      parts: [
        { id: "p-aq-1", title: "Phần 1 · Trước khi tập", lessons: [pdf("l-aq-1", "Bữa trước tập", 5), pdf("l-aq-2", "Uống gì trước tập", 4)] },
        { id: "p-aq-2", title: "Phần 2 · Sau khi tập", lessons: [pdf("l-aq-3", "Tinh bột quanh buổi tập", 4), text("l-aq-4", "Đạm sau tập", SAMPLE_TEXT, 3)] },
      ],
    },
    {
      id: "c-vi-chat",
      title: "Vi chất cho người tập",
      subtitle: "HLV Lê Hồng Khánh",
      tone: 2,
      access: "level",
      minLevel: 3,
      createdAt: T(15),
      updatedAt: T(19),
      parts: [
        {
          id: "p-vc-1",
          title: "Phần 1 · 22 vi chất",
          lessons: [pdf("l-vc-1", "Sắt và canxi", 6), pdf("l-vc-2", "Magiê và kẽm", 5), pdf("l-vc-3", "Vitamin B", 7), pdf("l-vc-4", "Vitamin D và K", 5), text("l-vc-5", "Đọc bảng vi chất", SAMPLE_TEXT, 4)],
        },
      ],
    },
    {
      id: "c-nhan",
      title: "Đọc nhãn dinh dưỡng",
      subtitle: "HLV Lê Hồng Khánh",
      tone: 3,
      access: "open",
      createdAt: T(10),
      updatedAt: T(12),
      parts: [{ id: "p-nh-1", title: "Phần 1 · Nhãn thực phẩm", lessons: [pdf("l-nh-1", "Khẩu phần trên nhãn", 4), pdf("l-nh-2", "Đường ẩn", 3), text("l-nh-3", "Mua gì trong siêu thị", SAMPLE_TEXT, 3)] }],
    },
    {
      id: "c-an-ngoai",
      title: "Ăn ngoài vẫn đủ đạm",
      subtitle: "HLV Lê Hồng Khánh",
      tone: 4,
      access: "code",
      createdAt: T(8),
      updatedAt: T(9),
      parts: [{ id: "p-an-1", title: "Phần 1 · Ăn ngoài", lessons: [pdf("l-an-1", "Quán cơm", 4), pdf("l-an-2", "Bún phở", 4), text("l-an-3", "Đồ ăn nhanh", SAMPLE_TEXT, 3), pdf("l-an-4", "Gọi món cho cả nhóm", 5)] }],
    },
  ];
  const now = Date.now();
  const codes: MockCode[] = Object.entries(SEED_CODES).map(([courseId, code]) => ({
    id: `code-${courseId}`,
    courseId,
    code,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
    revoked: false,
  }));
  // What the demo user has already done: two lessons of Ăn quanh buổi tập and the page of the third, and all of Đọc nhãn dinh dưỡng
  const done: Record<string, Mark> = {
    "l-aq-1": { lastPage: 5, completed: true },
    "l-aq-2": { lastPage: 4, completed: true },
    "l-aq-3": { lastPage: 2, completed: false },
    "l-nh-1": { lastPage: 4, completed: true },
    "l-nh-2": { lastPage: 3, completed: true },
    "l-nh-3": { lastPage: 1, completed: true },
  };
  return { courses, codes, unlocks: {}, progress: { __seed: done } };
}

// ---- storage ----

let memory: State | null = null;

function load(): State {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (memory = JSON.parse(raw) as State);
  } catch {
    // Storage blocked or unreadable: start from the samples for this page view
  }
  return (memory = seed());
}

function save(state: State): void {
  memory = state;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the change lasts for this page view only
  }
}

const who = () => currentAccountId() ?? "guest";

/** Progress of the signed-in account; an account that has none yet starts from the demo user's. */
function marks(state: State): Record<string, Mark> {
  return state.progress[who()] ?? state.progress.__seed ?? {};
}

function liveCode(state: State, courseId: string, codeId: string | undefined): boolean {
  const c = state.codes.find((x) => x.id === codeId && x.courseId === courseId);
  return !!c && !c.revoked && Date.parse(c.expiresAt) > Date.now();
}

const unlockedBy = (state: State, courseId: string) => liveCode(state, courseId, state.unlocks[who()]?.[courseId]);

// ---- views ----

const lessons = (c: MockCourse) => c.parts.flatMap((p) => p.lessons);

function lessonView(l: MockLesson, m: Record<string, Mark>): CourseLesson {
  const mark = m[l.id];
  return { id: l.id, title: l.title, kind: l.kind, pageCount: l.pageCount, minutes: l.minutes, ready: l.ready, done: !!mark?.completed, lastPage: mark?.lastPage ?? 0 };
}

function summary(state: State, c: MockCourse, v: CourseViewer): CourseSummary {
  const m = marks(state);
  const ready = lessons(c).filter((l) => l.ready);
  const lock = courseLock(c, { role: v.role, level: v.level, unlocked: unlockedBy(state, c.id) });
  return {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    tone: c.tone,
    access: c.access,
    ...(c.minLevel ? { minLevel: c.minLevel } : {}),
    lessonCount: ready.length,
    doneCount: ready.filter((l) => m[l.id]?.completed).length,
    unlocked: lock === null,
    ...(lock ? { lock: lock.kind } : {}),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function find(state: State, id: string): MockCourse {
  const c = state.courses.find((x) => x.id === id);
  if (!c) throw new CoursesError(404);
  return c;
}

/** The course when this viewer may open it, else the same refusal as the server (403 with the reason). */
function opened(state: State, id: string, v: CourseViewer): MockCourse {
  const c = find(state, id);
  const lock = courseLock(c, { role: v.role, level: v.level, unlocked: unlockedBy(state, c.id) });
  if (lock) throw new CoursesError(403, "locked", lock);
  return c;
}

function detail(state: State, c: MockCourse, v: CourseViewer): CourseDetail {
  const m = marks(state);
  const coach = canManageClients(v.role);
  const parts: CoursePart[] = c.parts.map((p) => ({
    id: p.id,
    title: p.title,
    lessons: p.lessons.filter((l) => coach || l.ready).map((l) => lessonView(l, m)),
  }));
  const resume = resumeOf(parts);
  return { ...summary(state, c, v), parts, ...(resume ? { resume } : {}) };
}

function manage(v: CourseViewer): void {
  if (!canManageClients(v.role)) throw new CoursesError(403);
}

const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const touch = (c: MockCourse) => void (c.updatedAt = new Date().toISOString());

function title(raw: string, max = 100): string {
  const t = raw.trim();
  if (t.length < 1 || [...t].length > max) throw new CoursesError(400);
  return t;
}

function reorder<T extends { id: string }>(items: T[], ids: string[]): T[] {
  if (ids.length !== items.length || new Set(ids).size !== ids.length || !ids.every((id) => items.some((x) => x.id === id))) throw new CoursesError(400);
  return ids.map((id) => items.find((x) => x.id === id) as T);
}

// ---- pages: an SVG for the samples, the uploaded image for a coach's PDF ----

function sampleSvg(lesson: MockLesson, n: number): string {
  const esc = lesson.title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#fff"/>` +
    `<text x="96" y="200" font-family="Manrope, sans-serif" font-size="64" font-weight="700" fill="#111317">${esc}</text>` +
    `<text x="96" y="300" font-family="Manrope, sans-serif" font-size="40" fill="#636366">Trang ${n}/${lesson.pageCount}</text>` +
    `<rect x="96" y="380" width="1100" height="24" rx="12" fill="#E5E5EA"/><rect x="96" y="440" width="900" height="24" rx="12" fill="#E5E5EA"/><rect x="96" y="500" width="1000" height="24" rx="12" fill="#E5E5EA"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function pageSrc(lesson: MockLesson, n: number): string {
  try {
    const uploaded = localStorage.getItem(`${PAGE_KEY}${lesson.id}_${n}`);
    if (uploaded) return uploaded;
  } catch {
    // Storage blocked: fall through to the sample page
  }
  return uploadedMemory.get(`${lesson.id}_${n}`) ?? sampleSvg(lesson, n);
}

/** Uploaded pages that did not fit in localStorage (a real photo of a page is far above its 5 MB) last for this page view. */
const uploadedMemory = new Map<string, string>();

// ---- the API ----

/**
 * Probes and demos only (the mock is never in a live build): sessionStorage `h1t_mock_fail_page` = "<n>:<times>[:<status>]" makes the PUT
 * of page n fail that many times, with a 503 or the status given (507 is a full disk), so the retry of lib/lesson-upload and the words of
 * the refusal can be watched. The status to fail with, or 0 when this call goes through.
 */
function injectedFailure(n: number): number {
  try {
    const [page, times, status] = (sessionStorage.getItem("h1t_mock_fail_page") ?? "").split(":").map(Number);
    if (page !== n || !(times > 0)) return 0;
    if (times > 1) sessionStorage.setItem("h1t_mock_fail_page", `${page}:${times - 1}${status ? `:${status}` : ""}`);
    else sessionStorage.removeItem("h1t_mock_fail_page");
    return status || 503;
  } catch {
    return 0;
  }
}

export function mockCoursesApi(v: CourseViewer): CoursesApi {
  const mutate = <T>(fn: (state: State) => T): T => {
    const state = structuredClone(load());
    const out = fn(state);
    save(state);
    return out;
  };
  const lessonOf = (c: MockCourse, id: string): { part: MockPart; lesson: MockLesson } => {
    for (const part of c.parts) {
      const lesson = part.lessons.find((l) => l.id === id);
      if (lesson) return { part, lesson };
    }
    throw new CoursesError(404);
  };

  return {
    async list() {
      const state = load();
      return [...state.courses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((c) => summary(state, c, v));
    },
    async get(id) {
      const state = load();
      return detail(state, opened(state, id, v), v);
    },
    async open(id, code) {
      return mutate((state) => {
        const c = find(state, id);
        if (c.access === "code" && !canManageClients(v.role)) {
          const typed = normalizeCode(code);
          const hit = state.codes.find((x) => x.courseId === id && normalizeCode(x.code) === typed && liveCode(state, id, x.id));
          if (!hit) throw new CoursesError(403, "bad-code");
          state.unlocks[who()] = { ...state.unlocks[who()], [id]: hit.id };
        }
        return detail(state, opened(state, id, v), v);
      });
    },
    async lesson(courseId, lessonId) {
      const state = load();
      const c = opened(state, courseId, v);
      const { part, lesson } = lessonOf(c, lessonId);
      if (!lesson.ready && !canManageClients(v.role)) throw new CoursesError(404);
      const view: LessonView = { ...lessonView(lesson, marks(state)), courseId, partId: part.id, ...(lesson.kind === "text" ? { content: lesson.content ?? "" } : {}) };
      return view;
    },
    async page(courseId, lessonId, n) {
      const state = load();
      const { lesson } = lessonOf(opened(state, courseId, v), lessonId);
      if (lesson.kind !== "pdf" || n < 1 || n > lesson.pageCount) throw new CoursesError(404);
      return { src: pageSrc(lesson, n), revoke: () => {} };
    },
    async progress(courseId, lessonId, body) {
      mutate((state) => {
        const { lesson } = lessonOf(opened(state, courseId, v), lessonId);
        if (!Number.isInteger(body.lastPage) || body.lastPage < 1 || body.lastPage > MAX_LESSON_PAGES) throw new CoursesError(400);
        const all = { ...marks(state) };
        const before = all[lesson.id];
        // Same rule as the server: completed stays when the call leaves it out; reaching the last page of a PDF completes it
        const completed = body.completed ?? (before?.completed || (lesson.kind === "pdf" && completesAt(body.lastPage, lesson.pageCount)));
        all[lesson.id] = { lastPage: body.lastPage, completed: !!completed };
        state.progress[who()] = all;
      });
    },
    async createCourse(input) {
      manage(v);
      return mutate((state) => {
        const now = new Date().toISOString();
        const level = input.access === "level" ? input.minLevel : undefined;
        if (input.access === "level" && !(level && level >= 1 && level <= 5)) throw new CoursesError(400);
        const c: MockCourse = {
          id: uid("c"),
          title: title(input.title),
          subtitle: (input.subtitle ?? "").trim().slice(0, 200),
          tone: Math.abs(Math.trunc(input.tone ?? state.courses.length)) % 8,
          access: input.access,
          ...(level ? { minLevel: level } : {}),
          createdAt: now,
          updatedAt: now,
          parts: [],
        };
        state.courses.push(c);
        return summary(state, c, v);
      });
    },
    async updateCourse(id, patch) {
      manage(v);
      return mutate((state) => {
        const c = find(state, id);
        if (patch.title !== undefined) c.title = title(patch.title);
        if (patch.subtitle !== undefined) c.subtitle = patch.subtitle.trim().slice(0, 200);
        if (patch.tone !== undefined) c.tone = Math.abs(Math.trunc(patch.tone)) % 8;
        if (patch.access !== undefined) {
          c.access = patch.access;
          if (patch.access === "level") {
            const level = patch.minLevel ?? c.minLevel;
            if (!(level && level >= 1 && level <= 5)) throw new CoursesError(400);
            c.minLevel = level;
          } else delete c.minLevel;
        }
        touch(c);
        return summary(state, c, v);
      });
    },
    async deleteCourse(id) {
      manage(v);
      mutate((state) => {
        find(state, id);
        state.courses = state.courses.filter((c) => c.id !== id);
        state.codes = state.codes.filter((c) => c.courseId !== id);
      });
    },
    async addPart(courseId, name) {
      manage(v);
      return mutate((state) => {
        const c = find(state, courseId);
        const part = { id: uid("p"), title: title(name), lessons: [] };
        c.parts.push(part);
        touch(c);
        return { id: part.id };
      });
    },
    async renamePart(courseId, partId, name) {
      manage(v);
      mutate((state) => {
        const c = find(state, courseId);
        const part = c.parts.find((p) => p.id === partId);
        if (!part) throw new CoursesError(404);
        part.title = title(name);
        touch(c);
      });
    },
    async deletePart(courseId, partId) {
      manage(v);
      mutate((state) => {
        const c = find(state, courseId);
        if (!c.parts.some((p) => p.id === partId)) throw new CoursesError(404);
        c.parts = c.parts.filter((p) => p.id !== partId);
        touch(c);
      });
    },
    async reorderParts(courseId, ids) {
      manage(v);
      mutate((state) => {
        const c = find(state, courseId);
        c.parts = reorder(c.parts, ids);
        touch(c);
      });
    },
    async addTextLesson(courseId, input) {
      manage(v);
      return mutate((state) => {
        const c = find(state, courseId);
        const part = c.parts.find((p) => p.id === input.partId);
        if (!part) throw new CoursesError(404);
        if (new Blob([input.content]).size > MAX_TEXT_BYTES) throw new CoursesError(413);
        const lesson: MockLesson = {
          id: uid("l"),
          title: title(input.title),
          kind: "text",
          content: input.content,
          pageCount: 0,
          // 180 words a minute, at least one (0 for empty text), as the server
          minutes: input.content.trim() ? Math.max(1, Math.ceil(input.content.trim().split(/\s+/).length / 180)) : 0,
          ready: true,
        };
        part.lessons.push(lesson);
        touch(c);
        return { id: lesson.id };
      });
    },
    async addPdfLesson(courseId, input) {
      manage(v);
      return mutate((state) => {
        const c = find(state, courseId);
        const part = c.parts.find((p) => p.id === input.partId);
        if (!part) throw new CoursesError(404);
        if (!Number.isInteger(input.pageCount) || input.pageCount < 1 || input.pageCount > MAX_LESSON_PAGES) throw new CoursesError(400);
        const lesson: MockLesson = { id: uid("l"), title: title(input.title), kind: "pdf", pageCount: input.pageCount, minutes: 0, ready: false };
        part.lessons.push(lesson);
        touch(c);
        return { id: lesson.id };
      });
    },
    async uploadPage(courseId, lessonId, n, data) {
      manage(v);
      const { lesson } = lessonOf(find(load(), courseId), lessonId);
      if (lesson.kind !== "pdf" || n < 1 || n > lesson.pageCount) throw new CoursesError(404);
      if (Math.floor((data.length * 3) / 4) > MAX_PAGE_BYTES) throw new CoursesError(413);
      const failWith = injectedFailure(n);
      if (failWith) throw new CoursesError(failWith);
      const src = `data:image/webp;base64,${data}`;
      try {
        localStorage.setItem(`${PAGE_KEY}${lessonId}_${n}`, src);
      } catch {
        uploadedMemory.set(`${lessonId}_${n}`, src);
      }
    },
    async finishLesson(courseId, lessonId) {
      manage(v);
      mutate((state) => {
        const { lesson } = lessonOf(find(state, courseId), lessonId);
        lesson.ready = true;
      });
    },
    async updateLesson(courseId, lessonId, patch) {
      manage(v);
      mutate((state) => {
        const c = find(state, courseId);
        const { part, lesson } = lessonOf(c, lessonId);
        if (patch.title !== undefined) lesson.title = title(patch.title);
        if (patch.content !== undefined) {
          if (lesson.kind !== "text") throw new CoursesError(400);
          if (new Blob([patch.content]).size > MAX_TEXT_BYTES) throw new CoursesError(413);
          lesson.content = patch.content;
        }
        if (patch.partId !== undefined && patch.partId !== part.id) {
          const to = c.parts.find((p) => p.id === patch.partId);
          if (!to) throw new CoursesError(404);
          part.lessons = part.lessons.filter((l) => l.id !== lessonId);
          to.lessons.push(lesson);
        }
        touch(c);
      });
    },
    async deleteLesson(courseId, lessonId) {
      manage(v);
      mutate((state) => {
        const c = find(state, courseId);
        const { part } = lessonOf(c, lessonId);
        part.lessons = part.lessons.filter((l) => l.id !== lessonId);
        touch(c);
      });
    },
    async reorderLessons(courseId, partId, ids) {
      manage(v);
      mutate((state) => {
        const c = find(state, courseId);
        const part = c.parts.find((p) => p.id === partId);
        if (!part) throw new CoursesError(404);
        part.lessons = reorder(part.lessons, ids);
        touch(c);
      });
    },
    async codes(courseId) {
      manage(v);
      const state = load();
      const c = find(state, courseId);
      if (c.access !== "code") throw new CoursesError(400);
      return state.codes
        .filter((x) => x.courseId === courseId && liveCode(state, courseId, x.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(({ id, createdAt, expiresAt }) => ({ id, createdAt, expiresAt }));
    },
    async createCode(courseId) {
      manage(v);
      return mutate((state) => {
        if (find(state, courseId).access !== "code") throw new CoursesError(400);
        const now = Date.now();
        const made: MockCode = {
          id: crypto.randomUUID(),
          courseId,
          code: codeFromBytes(randomBytes(10)),
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
          revoked: false,
        };
        state.codes.push(made);
        return { id: made.id, code: made.code, createdAt: made.createdAt, expiresAt: made.expiresAt };
      });
    },
    async revokeCode(courseId, codeId) {
      manage(v);
      mutate((state) => {
        const c = state.codes.find((x) => x.id === codeId && x.courseId === courseId && !x.revoked);
        if (!c) throw new CoursesError(404);
        c.revoked = true;
      });
    },
  };
}

/** Forget the in-memory copy so the next call reads localStorage (or the samples) again. For the tests. */
export function resetMockCourses(): void {
  memory = null;
}
