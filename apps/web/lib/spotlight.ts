/** Geometry of the tour and tip overlay: the hole around a real element, and where its card goes. Pure. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

const HOLE_PAD = 6;
const GAP = 12;
const SIDE = 16;
const MAX_CARD_WIDTH = 340;
const ARROW_MIN = 20;

/** The element's box grown by 6 px and kept inside the screen. */
export function holeFor(box: Box, view: Size): Box {
  const left = Math.max(0, box.left - HOLE_PAD);
  const top = Math.max(0, box.top - HOLE_PAD);
  const right = Math.min(view.width, box.left + box.width + HOLE_PAD);
  const bottom = Math.min(view.height, box.top + box.height + HOLE_PAD);
  return { left, top, width: right - left, height: bottom - top };
}

export interface Placement {
  side: "below" | "above";
  left: number;
  top: number;
  width: number;
  /** The card scrolls inside this when the room on its side is smaller than the card */
  maxHeight: number;
  /** Where the arrow's tip is, from the card's left edge */
  arrowLeft: number;
}

/**
 * The card goes under the hole when it fits there, else above it, else on the side with more room (and scrolls). It
 * never overlaps the hole, stays 16 px from the screen's sides, and its arrow points at the middle of the hole.
 */
export function cardPlacement(hole: Box, view: Size, card: Size): Placement {
  const width = Math.min(MAX_CARD_WIDTH, view.width - SIDE * 2);
  const left = Math.min(Math.max(SIDE, hole.left + hole.width / 2 - width / 2), view.width - SIDE - width);
  const roomBelow = view.height - (hole.top + hole.height) - GAP - SIDE;
  const roomAbove = hole.top - GAP - SIDE;
  const below = roomBelow >= card.height || (roomAbove < card.height && roomBelow >= roomAbove);
  const room = Math.max(0, below ? roomBelow : roomAbove);
  const height = Math.min(card.height, room);
  const top = below ? hole.top + hole.height + GAP : hole.top - GAP - height;
  const arrow = Math.min(Math.max(hole.left + hole.width / 2 - left, ARROW_MIN), width - ARROW_MIN);
  return { side: below ? "below" : "above", left, top, width, maxHeight: room, arrowLeft: arrow };
}
