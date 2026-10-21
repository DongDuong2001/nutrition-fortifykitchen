"use client";

import React, { startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EASE_OUT, REDUCED_MS, SWITCH_IN_MS, SWITCH_OUT_MS, SWITCH_SHIFT_PX, glideDirection } from "@/lib/motion";

type Dir = -1 | 0 | 1;

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The one glide for content that switches in place (feat/glide, Hao 21/10): a category chip, a tab, a basis chip. The
 * content never swaps in one frame. When `id` changes the content on screen fades out in 80 ms, then the new content enters
 * 16 px off to its side (from the right when `order` grew, from the left when it fell) and fades in, 200 ms, ease-out.
 * - transform and opacity only (the Web Animations API on one wrapper; no will-change, nothing left behind after the end);
 * - interruptible: a tap while it moves takes the next `id` once the fade-out is done, and a fade-out starts from the
 *   opacity the content has at that moment, so there is no queue and no jump;
 * - the wrapper holds the height of the content that left until the new content has come in, so the page does not jump;
 * - no animation on first mount, and with reduced motion only a 120 ms cross-fade;
 * - while the content leaves, the wrapper still draws the children of the id it showed (what was drawn last for it), so the
 *   caller changes its state at once (the chip lights up on the tap) and the new list is drawn when its turn comes: the fade-out
 *   starts in the tap's frame, the swap is a low-priority transition, and with `ready` false (the caller's list is still on its way,
 *   see useFoodBrowse listFilter) the swap waits for it. The rows are never re-keyed or remounted: the same children type sits at
 *   the same place, so FoodList keeps its memo; only the wrapper's transform and opacity move.
 * `id` is what the content is (a filter, a tab); a change of the children under the same id is drawn at once.
 */
export function SwitchGlide({
  id,
  order = 0,
  ready = true,
  children,
  className,
  ...rest
}: {
  id: string;
  /** False while the children for `id` are not built yet: the swap waits (the old content stays out, faded) until it is true. */
  ready?: boolean;
  /** The place of the active chip or tab in its row: new content comes from the right when it grew, from the left when it fell. */
  order?: number;
  children: React.ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "className">) {
  const ref = useRef<HTMLDivElement>(null);
  // What is on screen: the content of shown.id. `swaps` counts the changes (0 is the first mount: nothing animates)
  const [shown, setShown] = useState<{ id: string; order: number; dir: Dir; swaps: number }>({ id, order, dir: 0, swaps: 0 });
  const shownRef = useRef(shown);
  const wanted = useRef({ id, order });
  const readyRef = useRef(ready);
  const waiting = useRef(false);
  const drawn = useRef<React.ReactNode>(children);
  const leaving = useRef<Animation | null>(null);
  const entering = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    shownRef.current = shown;
    wanted.current = { id, order };
    readyRef.current = ready;
    if (id === shown.id) drawn.current = children;
  });

  const swap = () => {
    if (!readyRef.current) {
      waiting.current = true;
      return;
    }
    waiting.current = false;
    const to = wanted.current;
    const from = shownRef.current;
    // Low priority: a tap or a keystroke during the render of the new list goes first
    startTransition(() => setShown({ id: to.id, order: to.order, dir: glideDirection(from.order, to.order), swaps: from.swaps + 1 }));
  };

  // The children for the wanted id arrived while the old content was already out
  useLayoutEffect(() => {
    if (ready && waiting.current) swap();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // The content on screen leaves (80 ms), then phase 2 draws the one that is wanted by then
  const leave = () => {
    if (wanted.current.id === shownRef.current.id || leaving.current) return;
    const el = ref.current;
    if (!el || typeof el.animate !== "function" || prefersReducedMotion()) {
      swap();
      return;
    }
    // From wherever the content is now (an enter may still be running), held there while it fades
    const now = getComputedStyle(el);
    const from = { opacity: now.opacity, transform: now.transform };
    entering.current?.cancel();
    entering.current = null;
    el.style.minHeight = `${el.offsetHeight}px`;
    const out = el.animate([from, { ...from, opacity: "0" }], { duration: SWITCH_OUT_MS, easing: EASE_OUT, fill: "forwards" });
    leaving.current = out;
    // Kept until phase 2 has cancelled it: its fill holds the old content at opacity 0 until the new one is in the DOM
    out.onfinish = swap;
  };

  // Phase 1: the id changed
  useEffect(leave, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2: the new content is in the DOM, 16 px off to its side and transparent on its first frame, then it comes in
  useLayoutEffect(() => {
    if (shown.swaps === 0) return;
    const el = ref.current;
    if (!el) return;
    leaving.current?.cancel();
    leaving.current = null;
    if (typeof el.animate !== "function") {
      el.style.minHeight = "";
      return;
    }
    const reduced = prefersReducedMotion();
    const into = el.animate(
      reduced || shown.dir === 0
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: `translateX(${shown.dir * SWITCH_SHIFT_PX}px)` },
            { opacity: 1, transform: "translateX(0)" },
          ],
      { duration: reduced ? REDUCED_MS : SWITCH_IN_MS, easing: EASE_OUT, fill: "backwards" }
    );
    entering.current = into;
    into.onfinish = () => {
      if (entering.current === into) entering.current = null;
      if (!leaving.current) el.style.minHeight = "";
    };
    // Tapped again while the fade-out ran: the content that came in is already stale, so it goes out again
    if (wanted.current.id !== shown.id) leave();
  }, [shown.swaps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      leaving.current?.cancel();
      entering.current?.cancel();
    },
    []
  );

  return (
    <div ref={ref} data-glide={id} className={className} {...rest}>
      {id === shown.id ? children : drawn.current}
    </div>
  );
}
