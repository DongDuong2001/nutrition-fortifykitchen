import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ data: new Map<string, string>() }));
vi.mock("../storage-keys", () => ({
  accountStorage: () => ({
    getItem: (k: string) => store.data.get(k) ?? null,
    setItem: (k: string, v: string) => void store.data.set(k, v),
  }),
}));

import { FOOD_REQUESTS_KEY, readFoodRequests, saveFoodRequest } from "../food-requests";

describe("food requests (mock and demo only)", () => {
  beforeEach(() => store.data.clear());

  it("stores a request with the time it was made", () => {
    expect(saveFoodRequest("  Rau má  ", new Date("2026-10-17T03:00:00Z"))).toBe("saved");
    expect(readFoodRequests()).toEqual([{ name: "Rau má", at: "2026-10-17T03:00:00.000Z" }]);
  });

  it("a blank name is refused and a repeat is not stored twice", () => {
    expect(saveFoodRequest("   ")).toBe("blank");
    saveFoodRequest("Rau má");
    expect(saveFoodRequest("rau MÁ")).toBe("duplicate");
    expect(readFoodRequests()).toHaveLength(1);
  });

  it("bad stored data reads as no requests", () => {
    store.data.set(FOOD_REQUESTS_KEY, "{oops");
    expect(readFoodRequests()).toEqual([]);
  });
});
