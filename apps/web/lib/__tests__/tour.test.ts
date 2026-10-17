import { describe, expect, it } from "vitest";
import { TOUR_STEPS, tourReduce, tourStepFor, type TourState } from "../tour";

const at = (index: number): TourState => ({ status: "step", index });
const OFF: TourState = { status: "off" };

describe("tour steps", () => {
  it("has five steps: kcal panel, + button, search, portion, colours", () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual(["kcal", "add", "search", "portion", "result"]);
  });

  it("steps 1 and 5 have a button; steps 2 to 4 wait for the real action", () => {
    expect(TOUR_STEPS.map((s) => s.advance)).toEqual(["button", "action", "action", "action", "button"]);
  });

  it("the search step spotlights the search field and the first result only, not the whole list", () => {
    const search = TOUR_STEPS.find((s) => s.id === "search");
    expect(search?.target).toEqual(["food-search", "add-results-first"]);
  });

  it("each step names the screen it lives on", () => {
    expect(TOUR_STEPS.map((s) => s.path)).toEqual(["/app", "/app", "/add", "/add", "/app"]);
  });
});

describe("tourReduce", () => {
  it("start goes to step 1", () => {
    expect(tourReduce(OFF, { type: "start" })).toEqual(at(0));
  });

  it("Tiếp on step 1 goes to step 2; it does nothing on a step that waits for an action", () => {
    expect(tourReduce(at(0), { type: "next" })).toEqual(at(1));
    expect(tourReduce(at(1), { type: "next" })).toEqual(at(1));
    expect(tourReduce(at(2), { type: "next" })).toEqual(at(2));
  });

  it("the real action moves steps 2, 3 and 4 on, and an action of another step does nothing", () => {
    expect(tourReduce(at(1), { type: "action", name: "add-opened" })).toEqual(at(2));
    expect(tourReduce(at(2), { type: "action", name: "food-picked" })).toEqual(at(3));
    expect(tourReduce(at(3), { type: "action", name: "portion-confirmed" })).toEqual(at(4));
    expect(tourReduce(at(1), { type: "action", name: "food-picked" })).toEqual(at(1));
    expect(tourReduce(at(3), { type: "action", name: "add-opened" })).toEqual(at(3));
  });

  it("Hoàn tất on the last step ends the tour for good", () => {
    expect(tourReduce(at(4), { type: "next" })).toEqual({ status: "done", reason: "finished" });
  });

  it("Bỏ qua hướng dẫn ends it for good from every step", () => {
    for (let i = 0; i < TOUR_STEPS.length; i++) expect(tourReduce(at(i), { type: "skip" })).toEqual({ status: "done", reason: "skipped" });
  });

  it("a step whose element is missing is skipped, and the last one ends the tour", () => {
    expect(tourReduce(at(0), { type: "skipStep" })).toEqual(at(1));
    expect(tourReduce(at(2), { type: "skipStep" })).toEqual(at(3));
    expect(tourReduce(at(4), { type: "skipStep" })).toEqual({ status: "done", reason: "finished" });
    expect(tourReduce(OFF, { type: "skipStep" })).toEqual(OFF);
  });

  it("an event with no tour running does nothing", () => {
    expect(tourReduce(OFF, { type: "next" })).toEqual(OFF);
    expect(tourReduce(OFF, { type: "action", name: "food-picked" })).toEqual(OFF);
    expect(tourReduce(OFF, { type: "skip" })).toEqual(OFF);
  });
});

describe("tourStepFor (what a route change does to a running tour)", () => {
  it("keeps the step while the route is the step's screen", () => {
    expect(tourStepFor(at(0), "/app")).toEqual(at(0));
    expect(tourStepFor(at(2), "/add")).toEqual(at(2));
  });

  it("opening /add during step 2 is the action: step 3", () => {
    expect(tourStepFor(at(1), "/add")).toEqual(at(2));
  });

  it("back on / after confirming the portion in step 4 is step 5", () => {
    expect(tourStepFor(at(3), "/app")).toEqual(at(4));
  });

  it("any other route ends the tour silently (not for good: left, not skipped)", () => {
    expect(tourStepFor(at(0), "/explore")).toEqual({ status: "done", reason: "left" });
    expect(tourStepFor(at(1), "/settings")).toEqual({ status: "done", reason: "left" });
    expect(tourStepFor(at(2), "/app")).toEqual({ status: "done", reason: "left" });
    expect(tourStepFor(at(4), "/trends")).toEqual({ status: "done", reason: "left" });
  });

  it("a tour that is off or done stays as it is", () => {
    expect(tourStepFor(OFF, "/explore")).toEqual(OFF);
    expect(tourStepFor({ status: "done", reason: "left" }, "/app")).toEqual({ status: "done", reason: "left" });
  });
});
