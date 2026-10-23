import { describe, expect, it } from "vitest";
import { createRowSwipe, endOf, offsetFor, SWIPE_ACTION_PX, SWIPE_LOCK_PX } from "../row-swipe";

// Job I: swipe a food row on Hôm nay. Left = Xóa, right = ⋯. The row is 178 px wide at 390.
const W = 178;

describe("createRowSwipe: direction lock", () => {
  it("does nothing until the finger has moved 10 px, and then only when it moved more across than down", () => {
    const s = createRowSwipe({ width: W, rest: "closed" });
    s.down(100, 100);
    expect(s.move(100 - (SWIPE_LOCK_PX - 1), 100)).toBeNull();
    const moved = s.move(100 - SWIPE_LOCK_PX - 2, 103);
    expect(moved?.locked).toBe(true);
    expect(moved?.offset).toBe(-(SWIPE_LOCK_PX + 2));
  });

  it("a vertical move (more down than across) gives the touch back to the scroll for good", () => {
    const s = createRowSwipe({ width: W, rest: "closed" });
    s.down(100, 100);
    expect(s.move(104, 118)).toBeNull();
    expect(s.state).toBe("scroll");
    // Even a long sideways move after that is not a swipe
    expect(s.move(20, 118)).toBeNull();
    expect(s.up()).toBe("none");
  });

  it("exactly diagonal is not horizontal", () => {
    const s = createRowSwipe({ width: W, rest: "closed" });
    s.down(0, 0);
    expect(s.move(-12, 12)).toBeNull();
    expect(s.state).toBe("scroll");
  });

  it("after the lock the row follows the finger 1:1 (the first 10 px count too)", () => {
    const s = createRowSwipe({ width: W, rest: "closed" });
    s.down(100, 100);
    s.move(85, 100);
    expect(s.move(60, 101)?.offset).toBe(-40);
  });
});

describe("offsetFor: rubber band past the ends", () => {
  it("moves 1:1 inside the ends", () => {
    expect(offsetFor("closed", -50, W)).toBe(-50);
    expect(offsetFor("closed", 30, W)).toBe(30);
  });
  it("an open row starts from where it rests", () => {
    expect(offsetFor("left", -10, W)).toBe(-SWIPE_ACTION_PX - 10);
    expect(offsetFor("left", 40, W)).toBe(-SWIPE_ACTION_PX + 40);
    expect(offsetFor("right", 4, W)).toBe(SWIPE_ACTION_PX + 4);
  });
  it("past the far left (the whole row gone) it resists: a quarter of what the finger adds", () => {
    expect(offsetFor("closed", -W - 40, W)).toBe(-W - 10);
  });
  it("past the right end (35 % of the row) it resists as well", () => {
    const end = Math.round(W * 0.35);
    expect(offsetFor("closed", end + 40, W)).toBe(end + 10);
  });
});

describe("endOf: what a release does", () => {
  it("a long left swipe (past 60 % of the row) deletes", () => {
    expect(endOf("closed", -Math.ceil(W * 0.6), W)).toBe("delete");
    expect(endOf("closed", -(W - 4), W)).toBe("delete");
  });
  it("a short left swipe (past 25 %) rests open with the button showing", () => {
    expect(endOf("closed", -Math.ceil(W * 0.25), W)).toBe("open-left");
    expect(endOf("closed", -Math.floor(W * 0.6) + 1, W)).toBe("open-left");
  });
  it("less than 25 % springs back", () => {
    expect(endOf("closed", -Math.floor(W * 0.25) + 1, W)).toBe("close");
    expect(endOf("closed", -3, W)).toBe("close");
  });
  it("a right swipe past 25 % opens the ⋯ menu at once, a short one rests with the ⋯ showing", () => {
    expect(endOf("closed", Math.ceil(W * 0.25), W)).toBe("menu");
    expect(endOf("closed", Math.floor(SWIPE_ACTION_PX / 2) + 1, W)).toBe("open-right");
    expect(endOf("closed", 5, W)).toBe("close");
  });
  it("from open-left: dragged back more than half the button closes it, a long pull still deletes", () => {
    expect(endOf("left", Math.floor(-SWIPE_ACTION_PX / 2) + 3, W)).toBe("close");
    expect(endOf("left", -SWIPE_ACTION_PX - 5, W)).toBe("open-left");
    expect(endOf("left", -Math.ceil(W * 0.6), W)).toBe("delete");
  });
  it("from open-right: pushed back closes it, pulled half a button further opens the menu", () => {
    expect(endOf("right", 8, W)).toBe("close");
    expect(endOf("right", SWIPE_ACTION_PX + 2, W)).toBe("open-right");
    expect(endOf("right", SWIPE_ACTION_PX * 1.5, W)).toBe("menu");
  });
});

describe("a whole gesture", () => {
  it("up() answers with the end, once, and the machine is done", () => {
    const s = createRowSwipe({ width: W, rest: "closed" });
    s.down(150, 50);
    s.move(130, 52);
    s.move(40, 52);
    expect(s.up()).toBe("delete");
    expect(s.up()).toBe("none");
  });
  it("the delete point is crossed once, going left, and back again", () => {
    const s = createRowSwipe({ width: W, rest: "closed" });
    s.down(150, 50);
    expect(s.move(120, 50)?.pastDelete).toBe(false);
    expect(s.move(150 - Math.ceil(W * 0.6) - 1, 50)?.pastDelete).toBe(true);
    expect(s.move(130, 50)?.pastDelete).toBe(false);
  });
  it("a tap (no move) ends as none", () => {
    const s = createRowSwipe({ width: W, rest: "closed" });
    s.down(10, 10);
    expect(s.up()).toBe("none");
  });
  it("cancel (the system took the touch) ends with a close and no action", () => {
    const s = createRowSwipe({ width: W, rest: "left" });
    s.down(100, 10);
    s.move(110, 10);
    expect(s.cancel()).toBe("close");
  });
});
