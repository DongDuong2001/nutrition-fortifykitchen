import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_FRESH_MS, CATALOG_MAX_AGE_MS, catalogCacheKey, catalogCacheState } from "../catalog-cache";

// cc-50: the catalogue is kept on the device per account (custom foods are per user) and refreshed in the background.

describe("catalogCacheState", () => {
  const now = Date.parse("2026-10-18T08:00:00Z");
  it("nothing saved", () => expect(catalogCacheState(null, now)).toBe("none"));
  it("fresh for 10 minutes: used as it is, no request", () => {
    expect(catalogCacheState(now - CATALOG_FRESH_MS + 1, now)).toBe("fresh");
  });
  it("stale after 10 minutes and up to 24 h: shown at once, refreshed in the background", () => {
    expect(catalogCacheState(now - CATALOG_FRESH_MS, now)).toBe("stale");
    expect(catalogCacheState(now - CATALOG_MAX_AGE_MS + 1, now)).toBe("stale");
  });
  it("expired after 24 h: loaded again before it is shown", () => {
    expect(catalogCacheState(now - CATALOG_MAX_AGE_MS, now)).toBe("expired");
  });
  it("a time in the future (clock moved back) counts as stale, never fresh forever", () => {
    expect(catalogCacheState(now + 60_000, now)).toBe("stale");
  });
});

describe("catalogCacheKey", () => {
  it("one copy per account; signed out has its own", () => {
    expect(catalogCacheKey("a@example.com")).toBe("foods:a@example.com");
    expect(catalogCacheKey("b@example.com")).not.toBe(catalogCacheKey("a@example.com"));
    expect(catalogCacheKey(null)).toBe("foods:guest");
  });
});
