import { describe, expect, it } from "vitest";
import { applyServerDay, entriesFromDaySummary, mergeServerDay } from "../server-day";

// cc-68 (Part 5): the 60 s poll reads the same day again and again. When nothing changed, the list in state is the very
// same array, so setState bails out and nothing renders.
const TODAY = "2026-10-19";
const wire = (id: string, grams = 100, kcal = 120) => ({
  id,
  food_id: "food-chuoi",
  food_name: "Chuối",
  grams,
  serving_label: `${grams} g`,
  meal_slot: "breakfast",
  calories: kcal,
  nutrients: { protein: 1.3, carbs: 27, fat: 0.4, fiber: 2.6, potassium: 358 },
  created_at: "2026-10-19T01:00:00.000Z",
});
const summary = (...entries: ReturnType<typeof wire>[]) => ({ meals: [{ meal_slot: "breakfast", entries }] }) as never;
const U = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${n}`;
const options = { keep: new Set<string>(), startedAt: Date.parse("2026-10-19T03:00:00.000Z") };

describe("a refetch that finds nothing new", () => {
  it("returns the list it was given, entry for entry", () => {
    const first = applyServerDay([], summary(wire(U(1)), wire(U(2))), TODAY, TODAY, options);
    expect(first.map((e) => e.id)).toEqual([U(1), U(2)]);
    // the server answers again, as new objects with the same content
    const again = applyServerDay(first, summary(wire(U(1)), wire(U(2))), TODAY, TODAY, options);
    expect(again).toBe(first);
  });

  it("does the same for yesterday and leaves today's entries alone", () => {
    const yesterday = "2026-10-18";
    const base = applyServerDay([], summary(wire(U(3))), TODAY, TODAY, options);
    const both = applyServerDay(base, summary(wire(U(4))), yesterday, TODAY, options);
    expect(both).not.toBe(base);
    expect(applyServerDay(both, summary(wire(U(4))), yesterday, TODAY, options)).toBe(both);
    expect(applyServerDay(both, summary(wire(U(3))), TODAY, TODAY, options)).toBe(both);
  });

  it("is not fooled by a missing created_at (the stamp is the time of reading)", () => {
    const noStamp = { ...wire(U(1)), created_at: undefined } as never;
    const first = applyServerDay([], summary(noStamp), TODAY, TODAY, options);
    expect(applyServerDay(first, summary(noStamp), TODAY, TODAY, options)).toBe(first);
  });
});

describe("a refetch that finds a change", () => {
  it("a changed entry is a new object; the others stay the same objects", () => {
    const first = applyServerDay([], summary(wire(U(1)), wire(U(2))), TODAY, TODAY, options);
    const next = mergeServerDay(first, entriesFromDaySummary(summary(wire(U(1)), wire(U(2), 250, 300)), TODAY), options);
    expect(next).not.toBe(first);
    expect(next[0]).toBe(first[0]);
    expect(next[1]).not.toBe(first[1]);
    expect(next[1].grams).toBe(250);
  });

  it("a food added or deleted elsewhere changes the list", () => {
    const first = applyServerDay([], summary(wire(U(1)), wire(U(2))), TODAY, TODAY, options);
    expect(applyServerDay(first, summary(wire(U(1))), TODAY, TODAY, options).map((e) => e.id)).toEqual([U(1)]);
    expect(applyServerDay(first, summary(wire(U(1)), wire(U(2)), wire(U(3))), TODAY, TODAY, options)).toHaveLength(3);
  });

  it("an entry with a write waiting keeps the device's version, and a second poll changes nothing", () => {
    const first = applyServerDay([], summary(wire(U(1))), TODAY, TODAY, options);
    const edited = [{ ...first[0], grams: 300, displayQty: "300 g", synced: false }];
    const kept = applyServerDay(edited, summary(wire(U(1))), TODAY, TODAY, { ...options, keep: new Set([U(1)]) });
    expect(kept[0].grams).toBe(300);
    // the poll that finds the same thing waiting changes nothing
    expect(applyServerDay(kept, summary(wire(U(1))), TODAY, TODAY, { ...options, keep: new Set([U(1)]) })).toBe(kept);
  });
});
