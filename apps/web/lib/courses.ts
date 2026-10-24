/**
 * Khoá học through the Go API (docs/07 §2.14, apps/api/internal/courses, migration 000022). The learner's calls (list, open, a lesson,
 * a page, progress) and the coach's (create, edit, reorder, upload pages, codes) are one `CoursesApi`: live mode talks to the server,
 * which decides access; mock mode (demo, the gates) keeps the same courses in this browser (lib/mock/courses-mock.ts) under the same rules.
 */
import { apiFetch } from "./api-client";
import { isLiveMode } from "./api-mode";
import type { CourseLock, CourseSummary } from "./course-logic";
import { CoursesError, type CourseCode, type CourseViewer, type CoursesApi } from "./courses-types";

export * from "./courses-types";

async function fail(res: Response): Promise<never> {
  let code = "";
  let fields: Record<string, string> = {};
  try {
    const body = await res.json();
    code = body?.error?.code ?? body?.code ?? "";
    fields = body?.error?.fields ?? {};
  } catch {
    // No JSON body: the status says enough
  }
  if (res.status === 403 && code === "BAD_CODE") throw new CoursesError(403, "bad-code");
  if (res.status === 403 && code === "COURSE_LOCKED") {
    const lock: CourseLock = fields.lock === "level" ? { kind: "level", minLevel: Number(fields.minLevel) || 1 } : { kind: "code" };
    throw new CoursesError(403, "locked", lock);
  }
  throw new CoursesError(res.status);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`/courses${path}`, init);
  if (!res.ok) return fail(res);
  if (res.status === 204) return undefined as T;
  // Every route answers {data: …} (apps/api pkg/response); an older or raw body is taken as it is, as the other clients do
  const body = await res.json();
  return (body?.data ?? body) as T;
}

const send = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
const seg = encodeURIComponent;

function liveApi(): CoursesApi {
  const lessonPath = (c: string, l: string) => `/${seg(c)}/lessons/${seg(l)}`;
  return {
    list: async () => (await call<{ items: CourseSummary[] }>("")).items,
    get: (id) => call(`/${seg(id)}`),
    open: (id, code) => call(`/${seg(id)}/open`, send("POST", { code })),
    lesson: (c, l) => call(lessonPath(c, l)),
    async page(c, l, n) {
      const res = await apiFetch(`/courses${lessonPath(c, l)}/pages/${n}`);
      if (!res.ok) return fail(res);
      const src = URL.createObjectURL(await res.blob());
      return { src, revoke: () => URL.revokeObjectURL(src) };
    },
    progress: (c, l, body) => call(`${lessonPath(c, l)}/progress`, send("PUT", body)),
    createCourse: (input) => call("", send("POST", input)),
    updateCourse: (id, patch) => call(`/${seg(id)}`, send("PATCH", patch)),
    deleteCourse: (id) => call(`/${seg(id)}`, send("DELETE")),
    addPart: (c, title) => call(`/${seg(c)}/parts`, send("POST", { title })),
    renamePart: (c, p, title) => call(`/${seg(c)}/parts/${seg(p)}`, send("PATCH", { title })),
    deletePart: (c, p) => call(`/${seg(c)}/parts/${seg(p)}`, send("DELETE")),
    reorderParts: (c, ids) => call(`/${seg(c)}/parts/reorder`, send("POST", { ids })),
    addTextLesson: (c, { partId, title, content }) => call(`/${seg(c)}/lessons`, send("POST", { partId, title, kind: "text", content })),
    addPdfLesson: (c, { partId, title, pageCount }) => call(`/${seg(c)}/lessons`, send("POST", { partId, title, kind: "pdf", pageCount })),
    uploadPage: (c, l, n, data) => call(`${lessonPath(c, l)}/pages/${n}`, send("PUT", { data })),
    finishLesson: (c, l) => call(`${lessonPath(c, l)}/finish`, send("POST")),
    updateLesson: (c, l, patch) => call(lessonPath(c, l), send("PATCH", patch)),
    deleteLesson: (c, l) => call(lessonPath(c, l), send("DELETE")),
    reorderLessons: (c, partId, ids) => call(`/${seg(c)}/lessons/reorder`, send("POST", { partId, ids })),
    codes: async (c) => (await call<{ items: CourseCode[] }>(`/${seg(c)}/codes`)).items,
    createCode: (c) => call(`/${seg(c)}/codes`, send("POST")),
    revokeCode: (c, id) => call(`/${seg(c)}/codes/${seg(id)}`, send("DELETE")),
  };
}

const saved = new Set<() => void>();

/**
 * Runs `cb` after any call saved a lesson's progress. A screen that lists the course (its "Học tiếp", its checks) asks again then:
 * the reader saves the place as it unmounts, which can be after the course screen under it has already read the course.
 */
export function onProgressSaved(cb: () => void): () => void {
  saved.add(cb);
  return () => void saved.delete(cb);
}

/**
 * The mock, read on the first call: its sample courses are ~600 lines of demo data that a live build must not load (a live build also
 * swaps the module for an empty stand-in, next.config.ts), so nothing here imports it up front. Every method waits for it.
 */
function lazyMockApi(viewer: CourseViewer): CoursesApi {
  let loaded: Promise<CoursesApi> | undefined;
  const mock = () => (loaded ??= import("./mock/courses-mock").then((m) => m.mockCoursesApi(viewer)));
  return new Proxy({} as CoursesApi, {
    get: (_target, name) => (name === "then" ? undefined : (...args: unknown[]) => mock().then((api) => (api[name as keyof CoursesApi] as (...a: unknown[]) => unknown)(...args))),
  });
}

/** The API for this build: the server in live mode, this browser's mock otherwise. `viewer` only matters to the mock. */
export function coursesApi(viewer: CourseViewer): CoursesApi {
  const api = isLiveMode() ? liveApi() : lazyMockApi(viewer);
  return new Proxy(api, {
    get: (target, name, receiver) =>
      name === "progress"
        ? async (courseId: string, lessonId: string, body: { lastPage: number; completed?: boolean }) => {
            await target.progress(courseId, lessonId, body);
            saved.forEach((cb) => cb());
          }
        : Reflect.get(target, name, receiver),
  });
}
