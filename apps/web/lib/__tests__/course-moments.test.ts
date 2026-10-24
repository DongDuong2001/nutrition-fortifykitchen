import { describe, expect, it } from "vitest";
import {
  CODE_CLOSE_MS,
  codeCloseDelay,
  courseFinishedBy,
  courseMomentDue,
  loadFinishedCourses,
  saveFinishedCourses,
  withFinishedCourse,
} from "../course-moments";

// feat/sound-goals §5b: the tap that finishes a course (once per course per account) and when the code sheet closes.

const lesson = (id: string, done: boolean) => ({ id, done });

describe("courseFinishedBy (the tap that makes every lesson done, any lesson)", () => {
  it("the last lesson left, in any order", () => {
    const lessons = [lesson("a", true), lesson("b", false), lesson("c", true)];
    expect(courseFinishedBy(lessons, "b")).toBe(true);
  });
  it("another lesson is still open: false", () => {
    expect(courseFinishedBy([lesson("a", false), lesson("b", false), lesson("c", true)], "b")).toBe(false);
  });
  it("a single-lesson course", () => {
    expect(courseFinishedBy([lesson("a", false)], "a")).toBe(true);
  });
  it("the tapped lesson was already done (an un-mark, or a second look): false", () => {
    expect(courseFinishedBy([lesson("a", true), lesson("b", true)], "b")).toBe(false);
  });
  it("an unknown lesson, or a course with no lessons: false", () => {
    expect(courseFinishedBy([lesson("a", true)], "zzz")).toBe(false);
    expect(courseFinishedBy([], "a")).toBe(false);
  });
});

describe("courseMomentDue (once per course per account)", () => {
  const lessons = [lesson("a", true), lesson("b", false)];
  it("the finishing tap on a course not recorded: due", () => {
    expect(courseMomentDue(lessons, "b", "course-1", [])).toBe(true);
  });
  it("recorded already (un-marked and finished again): not due", () => {
    expect(courseMomentDue(lessons, "b", "course-1", ["course-1"])).toBe(false);
  });
  it("another course in the record does not matter", () => {
    expect(courseMomentDue(lessons, "b", "course-1", ["course-2"])).toBe(true);
  });
  it("not the finishing tap: not due", () => {
    expect(courseMomentDue([lesson("a", false), lesson("b", false)], "b", "course-1", [])).toBe(false);
  });
});

describe("the once-per-course record", () => {
  const memory = (init: Record<string, string> = {}) => {
    const data = new Map(Object.entries(init));
    return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
  };
  it("withFinishedCourse adds a course once", () => {
    expect(withFinishedCourse([], "c1")).toEqual(["c1"]);
    expect(withFinishedCourse(["c1"], "c1")).toEqual(["c1"]);
    expect(withFinishedCourse(["c1"], "c2")).toEqual(["c1", "c2"]);
  });
  it("saves and loads it; nothing saved, a bad value or no storage: empty", () => {
    const storage = memory();
    expect(loadFinishedCourses(storage)).toEqual([]);
    saveFinishedCourses(["c1", "c2"], storage);
    expect(loadFinishedCourses(storage)).toEqual(["c1", "c2"]);
    expect(loadFinishedCourses(memory({ h1t_courses_finished_v1: "{oops" }))).toEqual([]);
    expect(loadFinishedCourses(memory({ h1t_courses_finished_v1: '{"a":1}' }))).toEqual([]);
    expect(loadFinishedCourses(null)).toEqual([]);
    expect(() => saveFinishedCourses(["c1"], null)).not.toThrow();
  });
  it("keeps only strings", () => {
    expect(loadFinishedCourses(memory({ h1t_courses_finished_v1: '["c1", 3, null, "c2"]' }))).toEqual(["c1", "c2"]);
  });
});

describe("codeCloseDelay (the lock opens on the sheet's tile, the sheet closes 450 ms later)", () => {
  it("450 ms after the code was accepted", () => {
    expect(CODE_CLOSE_MS).toBe(450);
    expect(codeCloseDelay({ acceptedAt: 1000, now: 1000, closed: false })).toBe(450);
    expect(codeCloseDelay({ acceptedAt: 1000, now: 1200, closed: false })).toBe(250);
  });
  it("never negative once the time has passed", () => {
    expect(codeCloseDelay({ acceptedAt: 1000, now: 1450, closed: false })).toBe(0);
    expect(codeCloseDelay({ acceptedAt: 1000, now: 5000, closed: false })).toBe(0);
  });
  it("the person closed the sheet first: at once (D-MOT-03, never blocks)", () => {
    expect(codeCloseDelay({ acceptedAt: 1000, now: 1100, closed: true })).toBe(0);
  });
});
