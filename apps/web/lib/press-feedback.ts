/**
 * Press feedback on touch-down. A phone decides late (or, on iOS without a touch listener, not at all) that a touch is a press,
 * so CSS :active alone shows the press after the finger is already on its way. At the pointerdown of a touch or a pen the
 * nearest pressable control gets data-pressed; the CSS that reacts to :active reacts to it too (globals.css: the `active:`
 * variant and the press rules). It is taken off at pointerup or pointercancel (the browser cancels the pointer when a touch
 * turns into a scroll, so a swipe over a list never leaves a pressed row), and never before PRESS_MIN_MS, so a quick tap still
 * shows. A mouse keeps :active.
 */

/** What can be pressed: the controls the press rules in globals.css already name, and links. */
export const PRESSABLE = 'button, a[href], [role="button"], [role="option"], [role="tab"], summary';
/** A pressed control stays marked at least this long, so a tap shorter than a frame or two still shows. */
export const PRESS_MIN_MS = 90;

export interface PressTarget {
  closest(selector: string): PressTarget | null;
  hasAttribute(name: string): boolean;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/** The control a touch on `target` presses, or null: nothing pressable, a disabled or inert control, or one that opts out. */
export function pressTargetOf<T extends PressTarget>(target: T | null): T | null {
  const el = (target?.closest(PRESSABLE) ?? null) as T | null;
  if (!el) return null;
  if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return null;
  if (el.closest("[inert], [data-no-press]")) return null;
  return el;
}

export function installPressFeedback(doc: Document, now: () => number = () => performance.now()): () => void {
  const pressed = new Map<number, { el: Element; at: number; timer?: ReturnType<typeof setTimeout> }>();
  const release = (id: number) => {
    const p = pressed.get(id);
    if (!p) return;
    pressed.delete(id);
    const wait = PRESS_MIN_MS - (now() - p.at);
    // Another finger may hold the same control: the mark stays while any pointer still presses it
    const done = () => {
      if (![...pressed.values()].some((q) => q.el === p.el)) p.el.removeAttribute("data-pressed");
    };
    if (wait > 0) setTimeout(done, wait);
    else done();
  };
  const down = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const el = pressTargetOf(e.target as unknown as PressTarget | null) as unknown as Element | null;
    if (!el) return;
    el.setAttribute("data-pressed", "");
    pressed.set(e.pointerId, { el, at: now() });
  };
  const up = (e: PointerEvent) => release(e.pointerId);
  doc.addEventListener("pointerdown", down, { capture: true, passive: true });
  doc.addEventListener("pointerup", up, { capture: true, passive: true });
  doc.addEventListener("pointercancel", up, { capture: true, passive: true });
  return () => {
    doc.removeEventListener("pointerdown", down, { capture: true });
    doc.removeEventListener("pointerup", up, { capture: true });
    doc.removeEventListener("pointercancel", up, { capture: true });
    for (const p of pressed.values()) p.el.removeAttribute("data-pressed");
    pressed.clear();
  };
}
