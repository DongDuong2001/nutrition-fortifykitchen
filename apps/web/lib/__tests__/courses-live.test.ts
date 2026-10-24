import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Live mode: the same CoursesApi over fetch. The server answers {data: …} (apps/api pkg/response) and errors as {error: {code, message, fields}}
type Call = { url: string; method: string; body: unknown };
let calls: Call[];
let reply: (call: Call) => Response;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  calls = [];
  reply = () => json(200, { data: { success: true } });
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const call = { url: String(url).replace(/^.*\/api\/v1/, ""), method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    return reply(call);
  });
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const api = async () => (await import("../courses")).coursesApi({ role: "user", level: 0 });

describe("the live client", () => {
  it("unwraps {data} for lists and details, and sends nothing in a GET", async () => {
    reply = (c) => json(200, { data: c.url === "/courses" ? { items: [{ id: "c1", title: "A" }] } : { id: "c1", parts: [] } });
    const a = await api();
    expect(await a.list()).toEqual([{ id: "c1", title: "A" }]);
    expect(await a.get("c1")).toEqual({ id: "c1", parts: [] });
    expect(calls.map((c) => [c.method, c.url])).toEqual([["GET", "/courses"], ["GET", "/courses/c1"]]);
  });

  it("opens with a code in the body, never the URL", async () => {
    reply = () => json(200, { data: { id: "c1", unlocked: true, parts: [] } });
    await (await api()).open("c1", "HKX7M2PB4D");
    expect(calls[0]).toMatchObject({ method: "POST", url: "/courses/c1/open", body: { code: "HKX7M2PB4D" } });
  });

  it("a wrong code is a bad-code refusal, a lock says why", async () => {
    const { CoursesError } = await import("../courses");
    reply = () => json(403, { error: { code: "BAD_CODE", message: "x" } });
    let e = (await (await api()).open("c1", "x").catch((x) => x)) as InstanceType<typeof CoursesError>;
    expect([e.status, e.kind]).toEqual([403, "bad-code"]);
    reply = () => json(403, { error: { code: "COURSE_LOCKED", message: "x", fields: { lock: "level", minLevel: "3" } } });
    e = (await (await api()).get("c1").catch((x) => x)) as InstanceType<typeof CoursesError>;
    expect([e.status, e.kind, e.lock]).toEqual([403, "locked", { kind: "level", minLevel: 3 }]);
    reply = () => json(403, { error: { code: "COURSE_LOCKED", message: "x", fields: { lock: "code" } } });
    e = (await (await api()).get("c1").catch((x) => x)) as InstanceType<typeof CoursesError>;
    expect(e.lock).toEqual({ kind: "code" });
    reply = () => json(404, { error: { code: "NOT_FOUND", message: "x" } });
    e = (await (await api()).get("c1").catch((x) => x)) as InstanceType<typeof CoursesError>;
    expect([e.status, e.kind]).toEqual([404, "other"]);
  });

  it("a full server disk (507 STORAGE_FULL) says so in words, with the status for the code that decides what to do", async () => {
    const { CoursesError } = await import("../courses");
    reply = () => json(507, { error: { code: "STORAGE_FULL", message: "Not enough room left to store the lesson" } });
    const e = (await (await api()).uploadPage("c1", "l1", 3, "UklGRg==").catch((x) => x)) as InstanceType<typeof CoursesError>;
    expect(e).toBeInstanceOf(CoursesError);
    expect(e.status).toBe(507);
    expect(e.message).toBe("Máy chủ đã hết chỗ lưu bài. Báo cho HLV nhé.");
  });

  it("progress, the coach's routes and the page upload use the contract's paths, methods and bodies", async () => {
    const a = await api();
    await a.progress("c1", "l1", { lastPage: 3 });
    await a.progress("c1", "l1", { lastPage: 4, completed: true });
    await a.createCourse({ title: "T", access: "level", minLevel: 2, tone: 3 });
    await a.updateCourse("c1", { title: "U" });
    await a.deleteCourse("c1");
    await a.addPart("c1", "P");
    await a.renamePart("c1", "p1", "Q");
    await a.deletePart("c1", "p1");
    await a.reorderParts("c1", ["p2", "p1"]);
    await a.addTextLesson("c1", { partId: "p1", title: "L", content: "x" });
    await a.addPdfLesson("c1", { partId: "p1", title: "L", pageCount: 3 });
    await a.uploadPage("c1", "l1", 2, "UklGRg==");
    await a.finishLesson("c1", "l1");
    await a.updateLesson("c1", "l1", { partId: "p2" });
    await a.deleteLesson("c1", "l1");
    await a.reorderLessons("c1", "p1", ["l2", "l1"]);
    await a.codes("c1");
    await a.createCode("c1");
    await a.revokeCode("c1", "k1");
    expect(calls.map((c) => [c.method, c.url, c.body])).toEqual([
      ["PUT", "/courses/c1/lessons/l1/progress", { lastPage: 3 }],
      ["PUT", "/courses/c1/lessons/l1/progress", { lastPage: 4, completed: true }],
      ["POST", "/courses", { title: "T", access: "level", minLevel: 2, tone: 3 }],
      ["PATCH", "/courses/c1", { title: "U" }],
      ["DELETE", "/courses/c1", undefined],
      ["POST", "/courses/c1/parts", { title: "P" }],
      ["PATCH", "/courses/c1/parts/p1", { title: "Q" }],
      ["DELETE", "/courses/c1/parts/p1", undefined],
      ["POST", "/courses/c1/parts/reorder", { ids: ["p2", "p1"] }],
      ["POST", "/courses/c1/lessons", { partId: "p1", title: "L", kind: "text", content: "x" }],
      ["POST", "/courses/c1/lessons", { partId: "p1", title: "L", kind: "pdf", pageCount: 3 }],
      ["PUT", "/courses/c1/lessons/l1/pages/2", { data: "UklGRg==" }],
      ["POST", "/courses/c1/lessons/l1/finish", undefined],
      ["PATCH", "/courses/c1/lessons/l1", { partId: "p2" }],
      ["DELETE", "/courses/c1/lessons/l1", undefined],
      ["POST", "/courses/c1/lessons/reorder", { partId: "p1", ids: ["l2", "l1"] }],
      ["GET", "/courses/c1/codes", undefined],
      ["POST", "/courses/c1/codes", undefined],
      ["DELETE", "/courses/c1/codes/k1", undefined],
    ]);
  });

  it("the codes list and a new code come back unwrapped", async () => {
    reply = (c) => json(c.method === "POST" ? 201 : 200, { data: c.method === "POST" ? { id: "k1", code: "ABCDEFGHJK", createdAt: "a", expiresAt: "b" } : { items: [{ id: "k1", createdAt: "a", expiresAt: "b" }] } });
    const a = await api();
    expect(await a.codes("c1")).toEqual([{ id: "k1", createdAt: "a", expiresAt: "b" }]);
    expect((await a.createCode("c1")).code).toBe("ABCDEFGHJK");
  });

  it("a page is an object URL of the image the server streamed", async () => {
    const created: Blob[] = [];
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: (b: Blob) => (created.push(b), "blob:page-1"), revokeObjectURL: vi.fn() }));
    reply = () => new Response(new Blob(["x"], { type: "image/webp" }), { status: 200, headers: { "Content-Type": "image/webp" } });
    const page = await (await api()).page("c1", "l1", 1);
    expect(page.src).toBe("blob:page-1");
    expect(calls[0]).toMatchObject({ method: "GET", url: "/courses/c1/lessons/l1/pages/1" });
    page.revoke();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:page-1");
  });

  it("a progress save tells the screens that list the course", async () => {
    const { onProgressSaved } = await import("../courses");
    const seen = vi.fn();
    const off = onProgressSaved(seen);
    await (await api()).progress("c1", "l1", { lastPage: 2 });
    expect(seen).toHaveBeenCalledTimes(1);
    off();
    await (await api()).progress("c1", "l1", { lastPage: 3 });
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
