import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportClientError, reportedKey } from "../client-errors";

// cc-50: failures real users hit are reported once to POST /api/v1/client-errors (logged as event client_error).

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
  vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "2026-10-18.3");
  vi.stubGlobal("window", { location: { pathname: "/app" } });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const sent = () => vi.mocked(fetch).mock.calls.map(([url, init]) => ({ url, body: JSON.parse(String(init?.body)) }));

describe("reportClientError", () => {
  it("posts the report with the screen, the app version and the API path without ids", () => {
    reportClientError({ kind: "write", method: "PATCH", path: "/entries/3d82bc41-0892-48e8-a59f-00256731e99a", status: 400, message: "bad grams" });
    expect(sent()).toEqual([
      {
        url: "https://api.test/api/v1/client-errors",
        body: { kind: "write", method: "PATCH", path: "/entries/:id", status: 400, message: "bad grams", route: "/app", version: "2026-10-18.3" },
      },
    ]);
  });

  it("sends one failure once: the outbox sending it again every minute does not report it again", () => {
    const report = { kind: "write" as const, method: "POST", path: "/days/2026-10-18/entries", status: 500, message: "boom 1" };
    reportClientError(report);
    reportClientError(report);
    reportClientError({ ...report, status: 503 });
    expect(sent().map((s) => s.body.status)).toEqual([500, 503]);
  });

  it("a report that fails to send is dropped quietly", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect(() => reportClientError({ kind: "sync", message: "offline 1" })).not.toThrow();
  });

  it("nothing in mock mode", () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "");
    reportClientError({ kind: "share", message: "mock" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("the key ignores entry ids, so one bad endpoint is one report", () => {
    expect(reportedKey({ kind: "write", method: "DELETE", path: "/entries/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: 500, message: "x" })).toBe(
      reportedKey({ kind: "write", method: "DELETE", path: "/entries/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: 500, message: "x" })
    );
  });
});
