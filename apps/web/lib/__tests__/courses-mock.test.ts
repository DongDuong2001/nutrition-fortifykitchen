import { beforeEach, describe, expect, it } from "vitest";
import { CoursesError, coursesApi, normalizeCode, type CoursesApi, type CourseViewer } from "../courses";

// Mock mode (no NEXT_PUBLIC_API_MODE=live): the courses live in localStorage under the server's rules (docs/07 §2.14)
const store = new Map<string, string>();
const learner = (level: CourseViewer["level"] = 0): CoursesApi => coursesApi({ role: "user", level });
const coach = (): CoursesApi => coursesApi({ role: "coach", level: 0 });

async function refusal(p: Promise<unknown>): Promise<CoursesError> {
  try {
    await p;
  } catch (e) {
    return e as CoursesError;
  }
  throw new Error("expected a refusal");
}

beforeEach(async () => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as Storage;
  // Each test starts from the samples: the module keeps its state for the page view, so reload it
  (await import("../mock/courses-mock")).resetMockCourses();
});

describe("the library never needs access; opening does", () => {
  it("lists every course with its lock and my progress", async () => {
    const list = await learner(2).list();
    expect(list.map((c) => c.id).sort()).toEqual(["c-an-ngoai", "c-an-quanh", "c-hit1set", "c-nhan", "c-vi-chat"]);
    const by = Object.fromEntries(list.map((c) => [c.id, c]));
    expect(by["c-an-quanh"]).toMatchObject({ unlocked: true, lessonCount: 4, doneCount: 2 });
    expect(by["c-hit1set"]).toMatchObject({ unlocked: false, lock: "code" });
    expect(by["c-vi-chat"]).toMatchObject({ unlocked: false, lock: "level", minLevel: 3 });
  });

  it("an open course opens for any signed-in user", async () => {
    const c = await learner().get("c-an-quanh");
    expect(c.parts.flatMap((p) => p.lessons)).toHaveLength(4);
    expect(c.resume).toEqual({ lessonId: "l-aq-3", page: 2 });
  });

  it("a code course says 403 locked until it is opened with its code", async () => {
    const e = await refusal(learner().get("c-hit1set"));
    expect([e.status, e.kind, e.lock]).toEqual([403, "locked", { kind: "code" }]);
  });
});

describe("a code opens one course, only while it is live", () => {
  it("the right code (any case, spaces and dashes ignored) opens the course and keeps it open", async () => {
    const api = learner();
    const c = await api.open("c-hit1set", " hkx7-m2pb 4d ");
    expect(c.unlocked).toBe(true);
    expect((await api.get("c-hit1set")).parts).toHaveLength(3);
    expect(normalizeCode(" hkx7-m2pb 4d ")).toBe("HKX7M2PB4D");
  });

  it("a wrong code, another course's code and a short code are the same refusal", async () => {
    for (const code of ["AAAAAAAAAA", "NQ3TV8WZ6C", "HKX7"]) {
      const e = await refusal(learner().open("c-hit1set", code));
      expect([e.status, e.kind], code).toEqual([403, "bad-code"]);
    }
  });

  it("a revoked code refuses, and a user who used it loses the course", async () => {
    const [code] = await coach().codes("c-hit1set");
    const api = learner();
    await api.open("c-hit1set", "HKX7M2PB4D");
    await coach().revokeCode("c-hit1set", code.id);
    expect((await refusal(api.get("c-hit1set"))).kind).toBe("locked");
    expect((await refusal(api.open("c-hit1set", "HKX7M2PB4D"))).kind).toBe("bad-code");
  });

  it("a lapsed code refuses", async () => {
    const state = JSON.parse(store.get("h1t_mock_courses_v1") ?? "null");
    expect(state).toBeNull(); // nothing written yet: the samples are in memory until the first change
    await coach().createCode("c-hit1set");
    const saved = JSON.parse(store.get("h1t_mock_courses_v1") as string);
    for (const c of saved.codes) c.expiresAt = new Date(Date.now() - 1000).toISOString();
    store.set("h1t_mock_courses_v1", JSON.stringify(saved));
    (await import("../mock/courses-mock")).resetMockCourses();
    expect((await refusal(learner().open("c-hit1set", "HKX7M2PB4D"))).kind).toBe("bad-code");
  });

  it("a code opens only its own course", async () => {
    const api = learner();
    await api.open("c-hit1set", "HKX7M2PB4D");
    expect((await refusal(api.get("c-an-ngoai"))).kind).toBe("locked");
  });
});

describe("a Level course opens at the Level and above", () => {
  it("is locked at Level 2 and open at Level 3", async () => {
    const e = await refusal(learner(2).get("c-vi-chat"));
    expect([e.status, e.lock]).toEqual([403, { kind: "level", minLevel: 3 }]);
    expect((await learner(3).get("c-vi-chat")).unlocked).toBe(true);
    expect((await learner(5).get("c-vi-chat")).unlocked).toBe(true);
  });
});

describe("a coach sees everything and a learner changes nothing", () => {
  it("a coach opens a code course and a Level course, and sees a PDF that is not finished", async () => {
    const api = coach();
    expect((await api.get("c-hit1set")).unlocked).toBe(true);
    expect((await api.get("c-vi-chat")).unlocked).toBe(true);
    const { id } = await api.addPdfLesson("c-an-quanh", { partId: "p-aq-1", title: "Mới", pageCount: 3 });
    expect((await learner().get("c-an-quanh")).parts[0].lessons.map((l) => l.id)).not.toContain(id);
    expect((await api.get("c-an-quanh")).parts[0].lessons.map((l) => l.id)).toContain(id);
  });

  it("every coach route refuses a learner with 403", async () => {
    const api = learner(5);
    const calls = [
      () => api.createCourse({ title: "x", access: "open" }),
      () => api.updateCourse("c-nhan", { title: "x" }),
      () => api.deleteCourse("c-nhan"),
      () => api.addPart("c-nhan", "x"),
      () => api.addTextLesson("c-nhan", { partId: "p-nh-1", title: "x", content: "y" }),
      () => api.createCode("c-hit1set"),
      () => api.codes("c-hit1set"),
    ];
    for (const call of calls) expect((await refusal(call())).status).toBe(403);
  });
});

describe("progress is for oneself, idempotent, and completes a PDF at its last page", () => {
  it("remembers the page and resumes there", async () => {
    const api = learner();
    await api.progress("c-an-quanh", "l-aq-3", { lastPage: 3 });
    expect((await api.get("c-an-quanh")).resume).toEqual({ lessonId: "l-aq-3", page: 3 });
  });

  it("the last page completes the lesson; the same call again changes nothing", async () => {
    const api = learner();
    await api.progress("c-an-quanh", "l-aq-3", { lastPage: 4 });
    await api.progress("c-an-quanh", "l-aq-3", { lastPage: 4 });
    const c = await api.get("c-an-quanh");
    expect(c.doneCount).toBe(3);
    expect(c.resume).toEqual({ lessonId: "l-aq-4", page: 1 });
  });

  it("completed stays when a later call leaves it out, and the toggle can undo it", async () => {
    const api = learner();
    await api.progress("c-an-quanh", "l-aq-3", { lastPage: 4 });
    await api.progress("c-an-quanh", "l-aq-3", { lastPage: 1 });
    expect((await api.get("c-an-quanh")).doneCount).toBe(3);
    await api.progress("c-an-quanh", "l-aq-3", { lastPage: 1, completed: false });
    expect((await api.get("c-an-quanh")).doneCount).toBe(2);
  });

  it("refuses a page outside 1-60 and a course the user cannot open", async () => {
    const api = learner();
    expect((await refusal(api.progress("c-an-quanh", "l-aq-3", { lastPage: 0 }))).status).toBe(400);
    expect((await refusal(api.progress("c-an-quanh", "l-aq-3", { lastPage: 61 }))).status).toBe(400);
    expect((await refusal(api.progress("c-hit1set", "l-hit-1", { lastPage: 1 }))).status).toBe(403);
  });

  it("a lesson asked through another course's path is 404", async () => {
    expect((await refusal(learner().lesson("c-an-quanh", "l-nh-1"))).status).toBe(404);
    expect((await refusal(learner().page("c-an-quanh", "l-nh-1", 1))).status).toBe(404);
  });
});

describe("a learner never gets the pages of a course they cannot open", () => {
  it("is 403 for the page of a locked course, 404 past the last page", async () => {
    expect((await refusal(learner().page("c-hit1set", "l-hit-1", 1))).status).toBe(403);
    expect((await refusal(learner().page("c-an-quanh", "l-aq-1", 6))).status).toBe(404);
    expect((await learner().page("c-an-quanh", "l-aq-1", 5)).src).toMatch(/^data:image\/svg/);
  });
});

describe("the coach builds a course", () => {
  it("creates, adds a part and a text lesson, reorders, moves a lesson and deletes", async () => {
    const api = coach();
    const course = await api.createCourse({ title: "  Khóa mới ", access: "level", minLevel: 2 });
    expect(course).toMatchObject({ title: "Khóa mới", access: "level", minLevel: 2, lessonCount: 0 });
    const a = await api.addPart(course.id, "Phần A");
    const b = await api.addPart(course.id, "Phần B");
    await api.reorderParts(course.id, [b.id, a.id]);
    const one = await api.addTextLesson(course.id, { partId: a.id, title: "Bài 1", content: "một hai ba" });
    const two = await api.addTextLesson(course.id, { partId: a.id, title: "Bài 2", content: "bốn" });
    await api.reorderLessons(course.id, a.id, [two.id, one.id]);
    await api.updateLesson(course.id, one.id, { partId: b.id });
    const got = await api.get(course.id);
    expect(got.parts.map((p) => [p.title, p.lessons.map((l) => l.title)])).toEqual([["Phần B", ["Bài 1"]], ["Phần A", ["Bài 2"]]]);
    await api.deleteCourse(course.id);
    expect((await refusal(api.get(course.id))).status).toBe(404);
  });

  it("refuses a reorder that is not every id once, an empty title, a Level course without a Level", async () => {
    const api = coach();
    expect((await refusal(api.reorderParts("c-hit1set", ["p-hit-1"]))).status).toBe(400);
    expect((await refusal(api.reorderParts("c-hit1set", ["p-hit-1", "p-hit-1", "p-hit-2"]))).status).toBe(400);
    expect((await refusal(api.addPart("c-hit1set", "   "))).status).toBe(400);
    expect((await refusal(api.createCourse({ title: "x", access: "level" }))).status).toBe(400);
    expect((await refusal(api.createCourse({ title: "x", access: "level", minLevel: 6 }))).status).toBe(400);
  });

  it("a PDF lesson is hidden until its pages are in and it is finished; the caps are the server's", async () => {
    const api = coach();
    expect((await refusal(api.addPdfLesson("c-an-quanh", { partId: "p-aq-1", title: "x", pageCount: 61 }))).status).toBe(400);
    expect((await refusal(api.addPdfLesson("c-an-quanh", { partId: "p-aq-1", title: "x", pageCount: 0 }))).status).toBe(400);
    const { id } = await api.addPdfLesson("c-an-quanh", { partId: "p-aq-1", title: "Ba trang", pageCount: 3 });
    await api.uploadPage("c-an-quanh", id, 1, "UklGRg==");
    expect((await refusal(api.uploadPage("c-an-quanh", id, 4, "UklGRg=="))).status).toBe(404);
    expect((await refusal(api.uploadPage("c-an-quanh", id, 1, "A".repeat(1_500_000)))).status).toBe(413);
    await api.finishLesson("c-an-quanh", id);
    const seen = await learner().get("c-an-quanh");
    expect(seen.parts[0].lessons.find((l) => l.id === id)).toMatchObject({ pageCount: 3, ready: true });
    expect((await learner().page("c-an-quanh", id, 1)).src).toBe("data:image/webp;base64,UklGRg==");
  });

  it("codes: only for a code course; the value comes back once and the list never has it", async () => {
    const api = coach();
    const made = await api.createCode("c-hit1set");
    expect(made.code).toHaveLength(10);
    const listed = await api.codes("c-hit1set");
    expect(listed.map((c) => c.id)).toContain(made.id);
    expect(JSON.stringify(listed)).not.toContain(made.code);
    expect((await refusal(api.createCode("c-nhan"))).status).toBe(400);
    await api.revokeCode("c-hit1set", made.id);
    expect((await refusal(api.revokeCode("c-hit1set", made.id))).status).toBe(404);
  });
});
