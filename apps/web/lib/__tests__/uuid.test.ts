import { describe, expect, it } from "vitest";
import { isUuid, generateUuid } from "../uuid";

describe("uuid helper", () => {
  it("validates standard UUID strings", () => {
    expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
    expect(isUuid("ABCDEF01-2345-6789-ABCD-EF0123456789")).toBe(true);
  });

  it("rejects non-UUID strings", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid("entry-123456789")).toBe(false);
    expect(isUuid("food-cha-la")).toBe(false);
    expect(isUuid("not-a-uuid-at-all")).toBe(false);
  });

  it("generates valid UUIDs", () => {
    const id1 = generateUuid();
    const id2 = generateUuid();
    expect(isUuid(id1)).toBe(true);
    expect(isUuid(id2)).toBe(true);
    expect(id1).not.toBe(id2);
  });
});
