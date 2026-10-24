import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Review 24/10: the sample courses (lib/mock/courses-mock.ts, ~600 lines of demo data) are not part of the live build. lib/courses.ts
// used to import them statically, so a live page loaded them. Now they are read only when the build is not live, and only on the
// first call.
let evaluated = 0;

// doMock, not mock: each test imports a fresh lib/courses, and the sample module is evaluated again only if that import asks for it
beforeEach(() => {
  evaluated = 0;
  vi.resetModules();
  vi.doMock("../mock/courses-mock", () => {
    evaluated++;
    return { mockCoursesApi: () => ({ list: async () => [{ id: "from-the-mock" }], progress: async () => {} }), resetMockCourses: () => {} };
  });
});
afterEach(() => {
  vi.doUnmock("../mock/courses-mock");
  vi.unstubAllEnvs();
});

describe("lib/courses and the sample courses", () => {
  it("importing lib/courses loads no sample course", async () => {
    await import("../courses");
    expect(evaluated).toBe(0);
  });

  it("a live build never asks for them", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: { items: [] } }), { status: 200 })));
    const { coursesApi } = await import("../courses");
    await coursesApi({ role: "user", level: 0 }).list();
    expect(evaluated).toBe(0);
    vi.unstubAllGlobals();
  });

  it("the mock build reads them on the first call, and the call is the mock's", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "mock");
    const { coursesApi } = await import("../courses");
    const api = coursesApi({ role: "user", level: 0 });
    expect(evaluated).toBe(0);
    expect(await api.list()).toEqual([{ id: "from-the-mock" }]);
    expect(evaluated).toBe(1);
  });

  it("progress still tells the screens that listen (onProgressSaved) after the mock saved it", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "mock");
    const { coursesApi, onProgressSaved } = await import("../courses");
    const seen = vi.fn();
    onProgressSaved(seen);
    await coursesApi({ role: "user", level: 0 }).progress("c", "l", { lastPage: 2 });
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
