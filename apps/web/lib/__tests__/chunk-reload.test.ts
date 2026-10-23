import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHUNK_RELOAD_SCRIPT } from "../chunk-reload-script";

/**
 * Hotfix 23/10: a phone still holding the old page asks for chunks a deploy removed. The inline script in the root layout reloads
 * once (never in a loop, never over unsaved work). These tests run the script that ships, in a fake window.
 */

const KEY = "h1t_chunk_reload";

type Handler = (e: Record<string, unknown>) => void;

function setup({ stored, unsaved = false, online = true, storage = "ok" }: { stored?: number; unsaved?: boolean; online?: boolean; storage?: "ok" | "throws" } = {}) {
  const handlers = new Map<string, Handler[]>();
  const kept = new Map<string, string>(stored === undefined ? [] : [[KEY, String(stored)]]);
  const timers: Array<{ fn: () => void; ms: number }> = [];
  const reload = vi.fn();
  const dispatched: string[] = [];
  const win: Record<string, unknown> = {
    addEventListener: (type: string, fn: Handler) => handlers.set(type, [...(handlers.get(type) ?? []), fn]),
    dispatchEvent: (e: { type: string }) => dispatched.push(e.type),
    Event: class {
      constructor(public type: string) {}
    },
    navigator: { onLine: online },
    location: { reload },
    sessionStorage: {
      getItem: (k: string) => {
        if (storage === "throws") throw new Error("denied");
        return kept.get(k) ?? null;
      },
      setItem: (k: string, v: string) => {
        if (storage === "throws") throw new Error("denied");
        kept.set(k, v);
      },
      removeItem: (k: string) => void kept.delete(k),
    },
    setTimeout: (fn: () => void, ms: number) => timers.push({ fn, ms }),
    h1tUnsaved: unsaved ? () => true : undefined,
  };
  win.window = win;
  // Date goes in so the fake clock of vi.setSystemTime reaches the script (a vm context has its own Date)
  runInNewContext(CHUNK_RELOAD_SCRIPT, { window: win, Date });
  const fire = (type: string, e: Record<string, unknown>) => (handlers.get(type) ?? []).forEach((h) => h(e));
  return { win, kept, timers, reload, dispatched, fire, listens: (type: string) => (handlers.get(type) ?? []).length };
}

const chunkScript = { tagName: "SCRIPT", src: "https://h1tmicro.vn/_next/static/chunks/app/page-1a2b.js" };
const scriptError = (target: unknown) => ({ target });
const rejection = (reason: unknown) => ({ reason });
const named = (name: string, message: string) => Object.assign(new Error(message), { name });

/** What each browser says when a chunk the deploy removed is asked for. */
const CHUNK_ERRORS: Array<[string, unknown]> = [
  ["webpack ChunkLoadError", named("ChunkLoadError", "Loading chunk 123 failed.\n(error: https://h1tmicro.vn/_next/static/chunks/123.js)")],
  ["webpack, a ChunkLoadError whose message is something else", named("ChunkLoadError", "timeout")],
  ["webpack CSS chunk", new Error("Loading CSS chunk 5 failed.")],
  ["Chrome dynamic import", new TypeError("Failed to fetch dynamically imported module: https://h1tmicro.vn/_next/static/chunks/x.js")],
  ["Safari dynamic import", new TypeError("Importing a module script failed.")],
  ["Firefox dynamic import", new TypeError("error loading dynamically imported module")],
  ["a rejection that is only a string", "Loading chunk 9 failed."],
];

const NOT_CHUNK_ERRORS: Array<[string, unknown]> = [
  ["an API fetch that failed (Chrome)", new TypeError("Failed to fetch")],
  ["an API fetch that failed (Firefox)", new TypeError("NetworkError when attempting to fetch resource.")],
  ["an API fetch that failed (Safari)", new TypeError("Load failed")],
  ["a plain error", new Error("Cannot read properties of undefined")],
  ["an abort", Object.assign(new Error("The user aborted a request."), { name: "AbortError" })],
  ["undefined", undefined],
  ["null", null],
  ["an object with no message", {}],
];

describe("what counts as a chunk error", () => {
  it.each(CHUNK_ERRORS)("%s reloads (unhandledrejection)", (_label, reason) => {
    const t = setup();
    t.fire("unhandledrejection", rejection(reason));
    expect(t.reload).toHaveBeenCalledTimes(1);
  });

  it.each(NOT_CHUNK_ERRORS)("%s does not", (_label, reason) => {
    const t = setup();
    t.fire("unhandledrejection", rejection(reason));
    expect(t.reload).not.toHaveBeenCalled();
    expect(t.kept.has(KEY)).toBe(false);
  });

  it("a script under /_next/static/ that fails to load reloads", () => {
    const t = setup();
    t.fire("error", scriptError(chunkScript));
    expect(t.reload).toHaveBeenCalledTimes(1);
  });

  it("listens in the capture phase, where a resource error is seen", () => {
    const calls: Array<[string, unknown]> = [];
    runInNewContext(CHUNK_RELOAD_SCRIPT, {
      window: {
        addEventListener: (type: string, _fn: unknown, capture: unknown) => calls.push([type, capture]),
        navigator: { onLine: true },
        setTimeout: () => 0,
      },
    });
    expect(calls).toContainEqual(["error", true]);
  });

  it.each([
    ["a script of another origin's path", { tagName: "SCRIPT", src: "https://hcaptcha.com/1/api.js" }],
    ["an image under /_next/static/", { tagName: "IMG", src: "https://h1tmicro.vn/_next/static/media/a.png" }],
    ["a stylesheet link", { tagName: "LINK", href: "https://h1tmicro.vn/_next/static/css/a.css" }],
    ["a window error (a bug, not a missing file)", { tagName: undefined }],
    ["no target", null],
  ])("%s does not", (_label, target) => {
    const t = setup();
    t.fire("error", scriptError(target));
    expect(t.reload).not.toHaveBeenCalled();
  });
});

describe("reload once in 60 s", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T10:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("stamps the time, then reloads", () => {
    const t = setup();
    t.fire("error", scriptError(chunkScript));
    expect(t.kept.get(KEY)).toBe(String(Date.now()));
    expect(t.reload).toHaveBeenCalledTimes(1);
    expect(t.dispatched).toEqual([]);
  });

  it("does not reload again when the stamp is under 60 s old: it shows the error screen", () => {
    const t = setup({ stored: Date.now() - 59_000 });
    t.fire("error", scriptError(chunkScript));
    expect(t.reload).not.toHaveBeenCalled();
    expect(t.win.h1tChunkState).toBe("error");
    expect(t.dispatched).toEqual(["h1t:chunk"]);
  });

  it("reloads again once the stamp is 60 s old", () => {
    const t = setup({ stored: Date.now() - 60_000 });
    t.fire("error", scriptError(chunkScript));
    expect(t.reload).toHaveBeenCalledTimes(1);
  });

  it("a stamp from the future (clock moved) counts as young, so it can never loop", () => {
    const t = setup({ stored: Date.now() + 5_000 });
    t.fire("error", scriptError(chunkScript));
    expect(t.reload).not.toHaveBeenCalled();
  });

  it("the script error and the rejection of one failure make one reload, not a reload and an error screen", () => {
    const t = setup();
    t.fire("error", scriptError(chunkScript));
    t.fire("unhandledrejection", rejection(named("ChunkLoadError", "Loading chunk 1 failed.")));
    expect(t.reload).toHaveBeenCalledTimes(1);
    expect(t.win.h1tChunkState).toBe("reload");
    expect(t.dispatched).toEqual([]);
  });

  it("clears the stamp when the page has run fine for 10 s", () => {
    const t = setup({ stored: Date.now() - 20_000 });
    expect(t.timers).toHaveLength(1);
    expect(t.timers[0].ms).toBe(10_000);
    t.timers[0].fn();
    expect(t.kept.has(KEY)).toBe(false);
  });

  it("keeps the stamp when this page already had a chunk error", () => {
    const t = setup({ stored: Date.now() - 20_000 });
    t.fire("error", scriptError(chunkScript));
    t.timers[0].fn();
    expect(t.kept.has(KEY)).toBe(true);
  });

  it("with no sessionStorage (private mode) it cannot promise there is no loop, so it never reloads", () => {
    const t = setup({ storage: "throws" });
    t.fire("error", scriptError(chunkScript));
    expect(t.reload).not.toHaveBeenCalled();
    expect(t.win.h1tChunkState).toBe("error");
  });

  it("offline, a reload cannot bring the chunk: nothing happens", () => {
    const t = setup({ online: false });
    t.fire("error", scriptError(chunkScript));
    expect(t.reload).not.toHaveBeenCalled();
    expect(t.kept.has(KEY)).toBe(false);
    expect(t.dispatched).toEqual([]);
  });
});

describe("never over unsaved work", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T10:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("with something typed it only offers the update (a toast) and leaves the stamp alone", () => {
    const t = setup({ unsaved: true });
    t.fire("error", scriptError(chunkScript));
    expect(t.reload).not.toHaveBeenCalled();
    expect(t.kept.has(KEY)).toBe(false);
    expect(t.win.h1tChunkState).toBe("toast");
    expect(t.dispatched).toEqual(["h1t:chunk"]);
  });

  it("with something typed, a young stamp still gives the toast, not an error screen that would take the form away", () => {
    const t = setup({ unsaved: true, stored: Date.now() - 5_000 });
    t.fire("error", scriptError(chunkScript));
    expect(t.win.h1tChunkState).toBe("toast");
  });
});

describe("for the error screens (React caught the error)", () => {
  type Boundary = (e: unknown) => string;
  const boundary = (t: ReturnType<typeof setup>) => t.win.h1tChunk as Boundary;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T10:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("says nothing for an error that is not a chunk error", () => {
    const t = setup();
    expect(boundary(t)(new Error("boom"))).toBe("");
    expect(t.reload).not.toHaveBeenCalled();
  });

  it("reloads once for a chunk error, with the same stamp", () => {
    const t = setup();
    expect(boundary(t)(named("ChunkLoadError", "Loading chunk 3 failed."))).toBe("reload");
    expect(t.reload).toHaveBeenCalledTimes(1);
    expect(t.kept.get(KEY)).toBe(String(Date.now()));
  });

  it("answers error on the second failure, and does not raise the error screen itself (it is already showing)", () => {
    const t = setup({ stored: Date.now() - 1_000 });
    expect(boundary(t)(new TypeError("Importing a module script failed."))).toBe("error");
    expect(t.reload).not.toHaveBeenCalled();
    expect(t.dispatched).toEqual([]);
  });

  it("repeats the outcome the page already had, without a second reload", () => {
    const t = setup();
    t.fire("error", scriptError(chunkScript));
    expect(boundary(t)(named("ChunkLoadError", "x"))).toBe("reload");
    expect(t.reload).toHaveBeenCalledTimes(1);
  });

  it("Tải lại on the error screen stamps and reloads, whatever the stamp says", () => {
    const t = setup({ stored: Date.now() - 1_000 });
    (t.win.h1tChunkReload as () => void)();
    expect(t.reload).toHaveBeenCalledTimes(1);
    expect(t.kept.get(KEY)).toBe(String(Date.now()));
  });
});
