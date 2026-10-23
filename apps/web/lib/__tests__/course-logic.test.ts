import { describe, expect, it } from "vitest";
import {
  COURSE_TONES,
  accentBackground,
  completesAt,
  courseLock,
  lessonMeta,
  lockLabel,
  nextLesson,
  partTone,
  partToneIndex,
  progressText,
  resumeOf,
  segmentsOn,
  tileBackground,
  type CoursePart,
} from "../course-logic";

const lesson = (id: string, over: Partial<CoursePart["lessons"][number]> = {}): CoursePart["lessons"][number] => ({
  id,
  title: id,
  kind: "pdf",
  pageCount: 4,
  minutes: 0,
  ready: true,
  done: false,
  lastPage: 0,
  ...over,
});

const parts = (...lists: ReturnType<typeof lesson>[][]): CoursePart[] => lists.map((lessons, i) => ({ id: `p${i}`, title: `Phần ${i + 1}`, lessons }));

describe("courseLock: who may open a course (docs/07 §2.14)", () => {
  const level = { access: "level" as const, minLevel: 3 };
  it("an open course is never locked", () => {
    expect(courseLock({ access: "open" }, { role: "user", level: 0, unlocked: false })).toBeNull();
  });
  it("a code course is locked until the user has opened it with a live code", () => {
    expect(courseLock({ access: "code" }, { role: "user", level: 5, unlocked: false })).toEqual({ kind: "code" });
    expect(courseLock({ access: "code" }, { role: "user", level: 0, unlocked: true })).toBeNull();
  });
  it("a Level course opens at the Level and above, not below", () => {
    expect(courseLock(level, { role: "user", level: 2, unlocked: false })).toEqual({ kind: "level", minLevel: 3 });
    expect(courseLock(level, { role: "user", level: 3, unlocked: false })).toBeNull();
    expect(courseLock(level, { role: "user", level: 5, unlocked: false })).toBeNull();
  });
  it("having opened a code does not open a Level course, and a Level does not open a code course", () => {
    expect(courseLock(level, { role: "user", level: 1, unlocked: true })).toEqual({ kind: "level", minLevel: 3 });
    expect(courseLock({ access: "code" }, { role: "user", level: 5, unlocked: false })).toEqual({ kind: "code" });
  });
  it("a coach and an admin see every course", () => {
    for (const role of ["coach", "admin"] as const) {
      expect(courseLock({ access: "code" }, { role, level: 0, unlocked: false })).toBeNull();
      expect(courseLock(level, { role, level: 0, unlocked: false })).toBeNull();
    }
  });
});

describe("lockLabel: a word, never colour alone (D-COL-04)", () => {
  it("says why", () => {
    expect(lockLabel({ kind: "code" })).toBe("Cần mã");
    expect(lockLabel({ kind: "level", minLevel: 3 })).toBe("Mở ở Level 3");
  });
});

describe("segmentsOn: UI-RULES §6, 10 segments", () => {
  it("nothing done is empty, all done is full", () => {
    expect(segmentsOn(0, 6)).toBe(0);
    expect(segmentsOn(6, 6)).toBe(10);
  });
  it("rounds down, but any progress lights one segment", () => {
    expect(segmentsOn(2, 4)).toBe(5);
    expect(segmentsOn(1, 6)).toBe(1);
    expect(segmentsOn(1, 40)).toBe(1);
    expect(segmentsOn(5, 6)).toBe(8);
  });
  it("an empty course or a bad count is empty, and never above 10", () => {
    expect(segmentsOn(0, 0)).toBe(0);
    expect(segmentsOn(3, 0)).toBe(0);
    expect(segmentsOn(9, 6)).toBe(10);
    expect(segmentsOn(-1, 6)).toBe(0);
  });
});

describe("progressText", () => {
  it("is done/total bài", () => {
    expect(progressText(3, 6)).toBe("3/6 bài");
    expect(progressText(0, 4)).toBe("0/4 bài");
  });
});

describe("resumeOf: Học tiếp", () => {
  it("is the first lesson not finished, at the page the user stopped on", () => {
    const p = parts([lesson("a", { done: true, lastPage: 4 }), lesson("b", { lastPage: 2 })], [lesson("c")]);
    expect(resumeOf(p)).toEqual({ lessonId: "b", page: 2 });
  });
  it("starts at page 1 for a lesson never opened", () => {
    expect(resumeOf(parts([lesson("a", { done: true })], [lesson("b")]))).toEqual({ lessonId: "b", page: 1 });
  });
  it("skips a lesson that is not ready (a PDF still being uploaded)", () => {
    expect(resumeOf(parts([lesson("a", { ready: false }), lesson("b")]))).toEqual({ lessonId: "b", page: 1 });
  });
  it("is null when everything is finished or there is no lesson", () => {
    expect(resumeOf(parts([lesson("a", { done: true })]))).toBeNull();
    expect(resumeOf(parts())).toBeNull();
  });
});

describe("nextLesson: Bài tiếp at the end of a lesson", () => {
  const p = parts([lesson("a"), lesson("b")], [lesson("c", { ready: false }), lesson("d")]);
  it("goes to the next lesson, across parts, skipping one that is not ready", () => {
    expect(nextLesson(p, "a")?.id).toBe("b");
    expect(nextLesson(p, "b")?.id).toBe("d");
  });
  it("is null after the last lesson or for an unknown id", () => {
    expect(nextLesson(p, "d")).toBeNull();
    expect(nextLesson(p, "zzz")).toBeNull();
  });
});

describe("completesAt: a PDF is complete when its last page has been on screen", () => {
  it("only at the last page or beyond", () => {
    expect(completesAt(3, 4)).toBe(false);
    expect(completesAt(4, 4)).toBe(true);
    expect(completesAt(5, 4)).toBe(true);
  });
  it("a lesson with no pages never completes by scrolling", () => {
    expect(completesAt(1, 0)).toBe(false);
  });
});

describe("lessonMeta", () => {
  it("names the number, the kind and the size", () => {
    expect(lessonMeta(1, lesson("a", { pageCount: 12 }))).toBe("Bài 1 · PDF · 12 trang");
    expect(lessonMeta(3, lesson("a", { kind: "text", minutes: 4, pageCount: 0 }))).toBe("Bài 3 · Bài viết · 4 phút đọc");
  });
  it("says where an unfinished PDF was left", () => {
    expect(lessonMeta(3, lesson("a", { pageCount: 4, lastPage: 2 }))).toBe("Bài 3 · PDF · 4 trang · đang đọc trang 2");
  });
  it("says nothing of the page for a finished lesson or one at page 1", () => {
    expect(lessonMeta(3, lesson("a", { pageCount: 4, lastPage: 4, done: true }))).toBe("Bài 3 · PDF · 4 trang");
    expect(lessonMeta(3, lesson("a", { pageCount: 4, lastPage: 1 }))).toBe("Bài 3 · PDF · 4 trang");
  });
});

describe("tones: two deep-* tokens at 135° under the rainbow shade", () => {
  it("there are 8 pairs, each of two different tokens", () => {
    expect(COURSE_TONES).toHaveLength(8);
    for (const [a, b] of COURSE_TONES) {
      expect(a).not.toBe(b);
      for (const t of [a, b]) expect(t).toMatch(/^var\(--color-(deep-[a-z]+|cobalt)\)$/);
    }
  });
  it("no pair uses yellow, brown or grey: white text needs 4,5:1", () => {
    for (const pair of COURSE_TONES) for (const t of pair) expect(t).not.toMatch(/yellow|brown|grey/);
  });
  it("the tile is the 0 to 12 % ink shade over the 135° pair, like --gradient-tile-rainbow", () => {
    expect(tileBackground(1)).toBe(
      `linear-gradient(180deg, rgb(0 0 0 / 0) 0%, rgb(0 0 0 / 0.12) 100%), linear-gradient(135deg, ${COURSE_TONES[1][0]}, ${COURSE_TONES[1][1]})`
    );
  });
  it("a tone outside 0-7 wraps, a part takes the first colour of its tone", () => {
    expect(tileBackground(9)).toBe(tileBackground(1));
    expect(tileBackground(-1)).toBe(tileBackground(7));
    expect(partTone(2)).toBe(COURSE_TONES[2][0]);
  });
  it("the accent bar is the pair top to bottom", () => {
    expect(accentBackground(1)).toBe(`linear-gradient(180deg, ${COURSE_TONES[1][0]}, ${COURSE_TONES[1][1]})`);
  });
  it("parts take the course's tone, then the next ones, wrapping at 8", () => {
    expect([0, 1, 2].map((i) => partToneIndex(0, i))).toEqual([0, 1, 2]);
    expect([0, 1, 2].map((i) => partToneIndex(7, i))).toEqual([7, 0, 1]);
  });
});
