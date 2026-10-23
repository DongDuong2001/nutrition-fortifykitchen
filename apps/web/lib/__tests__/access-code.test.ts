import { describe, expect, it } from "vitest";
import { LOCK_MS, MAX_FAILURES, accessRefused, checkAccess, codeMatches } from "../access-code";

const request = (ip: string, code?: string) =>
  new Request("http://localhost/api/documents", { headers: { "x-forwarded-for": ip, ...(code === undefined ? {} : { "x-access-code": code }) } });

describe("codeMatches", () => {
  it("matches only the exact code, and nothing when no code is set", () => {
    expect(codeMatches("s3cret", "s3cret")).toBe(true);
    expect(codeMatches("s3cre", "s3cret")).toBe(false);
    expect(codeMatches("S3CRET", "s3cret")).toBe(false);
    expect(codeMatches("", "s3cret")).toBe(false);
    expect(codeMatches(null, "s3cret")).toBe(false);
    expect(codeMatches("", "")).toBe(false);
    expect(codeMatches("anything", undefined)).toBe(false);
  });
});

describe("checkAccess", () => {
  it("is unset without ACCESS_CODE, wrong for another code and ok for the code, from the header or given", () => {
    expect(checkAccess(request("10.0.0.1", "x"), undefined, undefined)).toBe("unset");
    expect(checkAccess(request("10.0.0.1", "x"), undefined, "ok-code")).toBe("wrong");
    expect(checkAccess(request("10.0.0.1", "ok-code"), undefined, "ok-code")).toBe("ok");
    expect(checkAccess(request("10.0.0.1"), "ok-code", "ok-code")).toBe("ok");
  });

  it("locks an address after MAX_FAILURES wrong codes for LOCK_MS, then counts again; a right code clears it", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_FAILURES; i++) expect(checkAccess(request("10.0.0.2", "x"), undefined, "ok-code", t0 + i)).toBe("wrong");
    expect(checkAccess(request("10.0.0.2", "ok-code"), undefined, "ok-code", t0 + MAX_FAILURES)).toBe("locked");
    expect(checkAccess(request("10.0.0.3", "ok-code"), undefined, "ok-code", t0)).toBe("ok");
    expect(checkAccess(request("10.0.0.2", "ok-code"), undefined, "ok-code", t0 + MAX_FAILURES + LOCK_MS)).toBe("ok");
    expect(checkAccess(request("10.0.0.2", "x"), undefined, "ok-code", t0 + MAX_FAILURES + LOCK_MS + 1)).toBe("wrong");
    expect(checkAccess(request("10.0.0.2", "ok-code"), undefined, "ok-code", t0 + MAX_FAILURES + LOCK_MS + 2)).toBe("ok");
  });

  it("prefers the CDN's address header", () => {
    const req = new Request("http://localhost/api/documents", { headers: { "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "10.0.0.2", "x-access-code": "ok-code" } });
    expect(checkAccess(req, undefined, "ok-code")).toBe("ok");
  });

  it("writes the refusal with its status", async () => {
    expect(accessRefused("wrong").status).toBe(401);
    expect(accessRefused("locked").status).toBe(429);
    expect(accessRefused("unset").status).toBe(503);
    expect(await accessRefused("wrong").text()).toBe("Mã truy cập không đúng");
  });
});
