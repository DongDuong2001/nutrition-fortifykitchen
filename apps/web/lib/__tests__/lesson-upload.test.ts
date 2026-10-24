import { describe, expect, it, vi } from "vitest";
import { CoursesError, type CoursesApi } from "../courses-types";
import { PdfError } from "../pdf-pages";
import { STOP_UPLOAD_QUESTION, UploadStopped, lessonWorkInHand, uploadPdfLesson } from "../lesson-upload";
import { hasUnsavedWork, setUnsavedWork } from "../unsaved-work";

// Review 24/10: one failed page must not throw the whole upload away. A page's PUT is tried again twice (after about 1 s, then 3 s);
// a PdfError (the page could not be made) or a 4xx (the server said no) gives up at once.

/** A fake API: the calls it got, and `failures[n]` = what each try of page n throws (in order, then it works). */
function fakeApi(failures: Record<number, unknown[]> = {}) {
  const calls: string[] = [];
  const tries: Record<number, number> = {};
  const api = {
    addPdfLesson: async () => {
      calls.push("add");
      return { id: "L1" };
    },
    uploadPage: async (_c: string, _l: string, n: number) => {
      tries[n] = (tries[n] ?? 0) + 1;
      calls.push(`page${n}#${tries[n]}`);
      const fail = failures[n]?.[tries[n] - 1];
      if (fail) throw fail;
    },
    finishLesson: async () => void calls.push("finish"),
    deleteLesson: async () => void calls.push("delete"),
  } as unknown as CoursesApi;
  return { api, calls };
}

const base = (api: CoursesApi, over: Partial<Parameters<typeof uploadPdfLesson>[0]> = {}) => {
  const waits: number[] = [];
  const retried: number[] = [];
  const opts = {
    api,
    courseId: "C1",
    input: { partId: "P1", title: "Bài", pageCount: 4 },
    render: async (n: number) => `data${n}`,
    onPage: () => {},
    onRetry: (n: number) => void retried.push(n),
    isStopped: () => false,
    sleep: async (ms: number) => void waits.push(ms),
    ...over,
  };
  return { run: () => uploadPdfLesson(opts), waits, retried };
};

describe("uploadPdfLesson: a page that fails once is tried again", () => {
  it("page 3 fails once with a 500: it is sent again after 1 s, the lesson is finished and never deleted", async () => {
    const { api, calls } = fakeApi({ 3: [new CoursesError(500)] });
    const t = base(api);
    expect(await t.run()).toBe("L1");
    expect(calls).toEqual(["add", "page1#1", "page2#1", "page3#1", "page3#2", "page4#1", "finish"]);
    expect(t.waits).toEqual([1000]);
    expect(t.retried).toEqual([3]);
  });

  it("a connection that drops (no CoursesError) counts as worth another try: 1 s, then 3 s", async () => {
    const { api, calls } = fakeApi({ 2: [new TypeError("offline"), new TypeError("offline")] });
    const t = base(api);
    await t.run();
    expect(calls.filter((c) => c.startsWith("page2"))).toEqual(["page2#1", "page2#2", "page2#3"]);
    expect(t.waits).toEqual([1000, 3000]);
  });

  it("three tries and no more: the third failure ends the upload and the half lesson is deleted", async () => {
    const { api, calls } = fakeApi({ 2: [new CoursesError(503), new CoursesError(503), new CoursesError(503), new CoursesError(503)] });
    const t = base(api);
    await expect(t.run()).rejects.toBeInstanceOf(CoursesError);
    expect(calls.filter((c) => c.startsWith("page2"))).toHaveLength(3);
    expect(calls.at(-1)).toBe("delete");
    expect(calls).not.toContain("finish");
    expect(t.waits).toEqual([1000, 3000]);
  });

  it("a 4xx gives up at once: one try, no wait, the half lesson is deleted", async () => {
    const { api, calls } = fakeApi({ 3: [new CoursesError(413)] });
    const t = base(api);
    await expect(t.run()).rejects.toMatchObject({ status: 413 });
    expect(calls.filter((c) => c.startsWith("page3"))).toEqual(["page3#1"]);
    expect(calls.at(-1)).toBe("delete");
    expect(t.waits).toEqual([]);
    expect(t.retried).toEqual([]);
  });

  it("a full server disk (507) gives up at once too: another try in 1 s would find it just as full", async () => {
    const { api, calls } = fakeApi({ 2: [new CoursesError(507)] });
    const t = base(api);
    await expect(t.run()).rejects.toMatchObject({ status: 507 });
    expect(calls.filter((c) => c.startsWith("page2"))).toEqual(["page2#1"]);
    expect(calls.at(-1)).toBe("delete");
    expect(t.waits).toEqual([]);
  });

  it("a page that cannot be made (PdfError) gives up at once and is never sent", async () => {
    const { api, calls } = fakeApi();
    const t = base(api, {
      render: async (n: number) => {
        if (n === 2) throw new PdfError("too-big");
        return `data${n}`;
      },
    });
    await expect(t.run()).rejects.toBeInstanceOf(PdfError);
    expect(calls).toEqual(["add", "page1#1", "delete"]);
  });

  it("the page is drawn once however many times it is sent", async () => {
    const { api } = fakeApi({ 1: [new CoursesError(500), new CoursesError(500)] });
    const render = vi.fn(async (n: number) => `data${n}`);
    await base(api, { render }).run();
    expect(render.mock.calls.filter(([n]) => n === 1)).toHaveLength(1);
  });

  it("stopping while it waits to try again ends it with the half lesson deleted, no further try", async () => {
    const { api, calls } = fakeApi({ 2: [new CoursesError(500)] });
    let stopped = false;
    const t = base(api, {
      isStopped: () => stopped,
      sleep: async () => {
        stopped = true;
      },
    });
    await expect(t.run()).rejects.toBeInstanceOf(UploadStopped);
    expect(calls.filter((c) => c.startsWith("page2"))).toEqual(["page2#1"]);
    expect(calls.at(-1)).toBe("delete");
  });
});

describe("lessonWorkInHand: an update never reloads over a lesson in the making", () => {
  const idle = { kind: "pdf" as const, content: "", converting: false, saving: false };

  it("a written lesson with content not yet saved is work in hand; an empty one is not", () => {
    expect(lessonWorkInHand({ ...idle, kind: "text", content: "## Tiêu đề\n\nMột ý." })).toBe(true);
    expect(lessonWorkInHand({ ...idle, kind: "text", content: "  \n " })).toBe(false);
    expect(lessonWorkInHand({ ...idle, kind: "text" })).toBe(false);
  });

  it("the whole PDF conversion and upload is work in hand (cut halfway, the lesson is deleted)", () => {
    expect(lessonWorkInHand({ ...idle, converting: true })).toBe(true);
  });

  it("a text lesson on its way to the server is work in hand until it is saved", () => {
    expect(lessonWorkInHand({ ...idle, kind: "text", content: "x", saving: true })).toBe(true);
    expect(lessonWorkInHand({ ...idle, saving: true })).toBe(true);
  });

  it("text typed and then the PDF tab chosen does not hold the update back: what counts is the lesson being made", () => {
    expect(lessonWorkInHand({ ...idle, kind: "pdf", content: "old draft" })).toBe(false);
  });

  it("an idle sheet holds nothing", () => {
    expect(lessonWorkInHand(idle)).toBe(false);
  });

  it("the marker is the one the update reads", () => {
    setUnsavedWork("course-add-lesson", lessonWorkInHand({ ...idle, converting: true }));
    expect(hasUnsavedWork()).toBe(true);
    setUnsavedWork("course-add-lesson", false);
    expect(hasUnsavedWork()).toBe(false);
  });
});

describe("the question when a sheet is closed during an upload", () => {
  it("says what is happening and asks", () => {
    expect(STOP_UPLOAD_QUESTION).toBe("Đang tải bài lên. Dừng lại?");
  });
});
