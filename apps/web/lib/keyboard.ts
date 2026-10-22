// design-floor (V3 22/10): the on-screen keyboard never covers the field being typed in. visualViewport says how much of
// the page the keyboard leaves; a focused field whose box ends below that (or starts above it) is scrolled into the middle.

/** The keyboard's height in px (0 when none): the part of the layout viewport the visual viewport does not cover. */
export function keyboardInset(innerHeight: number, vvHeight: number, vvOffsetTop: number): number {
  return Math.max(0, Math.round(innerHeight - vvHeight - vvOffsetTop));
}

/** Whether a field's box (top and bottom, in layout-viewport px) sits outside what the visual viewport shows, with a margin. */
export function fieldHidden(top: number, bottom: number, vvHeight: number, vvOffsetTop: number, margin = 8): boolean {
  return bottom > vvOffsetTop + vvHeight - margin || top < vvOffsetTop + margin;
}
