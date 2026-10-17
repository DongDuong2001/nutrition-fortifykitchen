import { describe, expect, it } from "vitest";
import { apiOriginDiffers } from "../api-mode";

describe("lib/api-mode apiOriginDiffers", () => {
  const page = "https://lehongkhanh.vn";
  it("is false for the same origin, whatever the path", () => {
    expect(apiOriginDiffers("https://lehongkhanh.vn/api/v1", page)).toBe(false);
  });
  it("is true for another host, port or scheme", () => {
    expect(apiOriginDiffers("https://api.lehongkhanh.vn/api/v1", page)).toBe(true);
    expect(apiOriginDiffers("http://localhost:8080/api/v1", "http://localhost:3101")).toBe(true);
    expect(apiOriginDiffers("http://lehongkhanh.vn/api/v1", page)).toBe(true);
  });
  it("is false for a relative path or an unparseable url", () => {
    expect(apiOriginDiffers("/api/v1", page)).toBe(false);
    expect(apiOriginDiffers("not a url", page)).toBe(false);
  });
});
