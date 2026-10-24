import { describe, expect, it } from "vitest";
import { dayCompletedBy, trainingGoalDue } from "../training-day-done";

// feat/sound-goals RA1: on /training the phase whose tick completed the day pops its "x / y" and shows "Xong Ngày tập hôm nay".

const phases = [
  { id: "pre-workout", items: [{ id: "pre-1" }, { id: "pre-2" }] },
  { id: "intra-workout", items: [{ id: "in-1" }] },
  { id: "post-workout", items: [{ id: "post-1" }, { id: "post-2" }] },
];

describe("dayCompletedBy", () => {
  it("the tick that makes the last item done: that item's phase", () => {
    expect(dayCompletedBy(phases, ["pre-1", "pre-2", "in-1", "post-1"], ["pre-1", "pre-2", "in-1", "post-1", "post-2"])).toBe("post-workout");
  });
  it("the phase of the completing tick, not the last phase in order", () => {
    expect(dayCompletedBy(phases, ["pre-2", "in-1", "post-1", "post-2"], ["pre-1", "pre-2", "in-1", "post-1", "post-2"])).toBe("pre-workout");
    expect(dayCompletedBy(phases, ["pre-1", "pre-2", "post-1", "post-2"], ["pre-1", "pre-2", "in-1", "post-1", "post-2"])).toBe("intra-workout");
  });
  it("a tick that leaves the day unfinished: null", () => {
    expect(dayCompletedBy(phases, ["pre-1"], ["pre-1", "pre-2"])).toBeNull();
  });
  it("a day that was already complete before this change (a refetch, an untick then the same state): null", () => {
    const all = ["pre-1", "pre-2", "in-1", "post-1", "post-2"];
    expect(dayCompletedBy(phases, all, all)).toBeNull();
  });
  it("an untick: null", () => {
    expect(dayCompletedBy(phases, ["pre-1", "pre-2", "in-1", "post-1", "post-2"], ["pre-1", "pre-2", "in-1", "post-1"])).toBeNull();
  });
  it("a rest day, or phases with no items: never complete", () => {
    expect(dayCompletedBy([], [], [])).toBeNull();
    expect(dayCompletedBy([{ id: "pre-workout", items: [] }], [], [])).toBeNull();
  });
  it("ticks of items that are not on today's checklist do not count; an empty phase is skipped", () => {
    const withEmpty = [{ id: "pre-workout", items: [] }, ...phases.slice(1)];
    expect(dayCompletedBy(withEmpty, ["old-item"], ["old-item", "in-1", "post-1"])).toBeNull();
    expect(dayCompletedBy(withEmpty, ["old-item", "in-1", "post-1"], ["old-item", "in-1", "post-1", "post-2"])).toBe("post-workout");
    expect(dayCompletedBy(withEmpty, ["in-1", "post-1"], ["in-1", "post-1", "post-2"])).toBe("post-workout");
  });
  it("several items ticked by one change (a mix logs two entries): the phase of the last one in the checklist's order", () => {
    expect(dayCompletedBy(phases, ["pre-1", "pre-2"], ["pre-1", "pre-2", "in-1", "post-1", "post-2"])).toBe("post-workout");
  });
});

// Whether the moment plays comes from the `training` goal key and the day's record (lib/goals reachedGoals), not from the ticks alone.
describe("trainingGoalDue (local tick, today, once a day)", () => {
  it("the day's first completion plays", () => {
    expect(trainingGoalDue([])).toBe(true);
    expect(trainingGoalDue(["kcal", "iron"])).toBe(true);
  });
  it("untick then tick again the same day: nothing (the record has it)", () => {
    expect(trainingGoalDue(["training"])).toBe(false);
    expect(trainingGoalDue(["iron", "training"])).toBe(false);
  });
});
