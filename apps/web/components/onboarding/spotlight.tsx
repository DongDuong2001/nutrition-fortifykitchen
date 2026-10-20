"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cardPlacement, holeFor, roundHole, type Box } from "@/lib/spotlight";
import { usePresence } from "@/components/ui/presence";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const POLL_MS = 100;
const GIVE_UP_MS = 1500;
/** How often a shown target is checked for still being in the page (a re-render or a closed sheet removes it) */
const WATCH_MS = 300;
/** cc-55: a spotlight that follows another within this time is the next step: its dim does not fade in again. */
const NEXT_STEP_MS = 300;
let lastGoneAt = -Infinity;

/** The first element of data-tour="<id>" that is on screen (a phone and a desktop copy can both exist). */
function findTarget(id: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
  for (const el of Array.from(all)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** cc-55: an animation still moving the target (a sheet sliding up), so the hole waits until it has settled. */
function moving(elements: HTMLElement[]): Animation | null {
  if (typeof document.getAnimations !== "function") return null;
  return (
    document.getAnimations().find((a) => {
      const t = (a.effect as KeyframeEffect | null)?.target;
      const ends = a.effect?.getComputedTiming().endTime !== Infinity;
      return a.playState === "running" && ends && t instanceof Element && elements.some((el) => t.contains(el));
    }) ?? null
  );
}

/** A tour step can show on the page now: its target, or its fallback, is drawn (it may be scrolled away). */
export function stepOnPage(step: { target: string; fallback?: string }): boolean {
  return findTarget(step.target) !== null || (step.fallback !== undefined && findTarget(step.fallback) !== null);
}

/** The smallest box that holds every rect (one rect: itself). */
function unionBox(rects: DOMRect[]): Box {
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return { left, top, width: right - left, height: bottom - top };
}

export interface SpotlightProps {
  /** data-tour="<target>": the element to point at, measured live (never fixed coordinates). Several: the hole is the box around all of them. */
  target: string | readonly string[];
  /** The dialog's accessible name (an element id inside the card) */
  labelledBy?: string;
  /** Or the name itself ("Hướng dẫn bước 1 trên 3") */
  ariaLabel?: string;
  /** Pointed at when the target is not on screen at the first look (cc-46). Only pointed at: never tappable. */
  fallback?: string;
  /** Scroll the target into view first (cc-46) */
  scroll?: boolean;
  /** "news": the "Có gì mới" tour, 70 % ink dim and a 16 px card */
  tone?: "tip" | "news";
  /** A round 44 px hole centred on the element (a small icon button), instead of the rounded box around it */
  round?: boolean;
  /** An action step: taps reach the highlighted element. Otherwise the whole page is blocked. */
  interactive?: boolean;
  /** Esc: skip the tour, or "Đã hiểu" for a tip */
  onEscape: () => void;
  /** The target never appeared or is off screen: the step or tip is skipped */
  onMissing: () => void;
  /** The target was found (a tip is marked seen from here) */
  onShown?: () => void;
  children: React.ReactNode;
}

/**
 * Dims the page except a hole around a real element, and puts one card above or below it with an arrow. The hole
 * follows the element (ResizeObserver, scroll and resize), so nothing here is hard-coded. role="dialog" and
 * aria-modal; focus moves to the card and goes back afterwards. Mount it on the client only (after mount).
 */
export function Spotlight({
  target,
  labelledBy,
  ariaLabel,
  fallback,
  scroll = false,
  tone = "tip",
  round = false,
  interactive = false,
  onEscape,
  onMissing,
  onShown,
  children,
}: SpotlightProps) {
  const [box, setBox] = useState<Box | null>(null);
  const [onFallback, setOnFallback] = useState(false);
  const [view, setView] = useState({ width: 0, height: 0 });
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  // cc-55: inside <Presence> a closing spotlight stays drawn for its exit: inert, and its callbacks are spent
  const leaving = usePresence() === "closed";
  const callbacks = useRef({ onEscape, onMissing, onShown });
  callbacks.current = leaving ? { onEscape: () => {}, onMissing: () => {}, onShown: undefined } : { onEscape, onMissing, onShown };
  // The dim fades in only when no spotlight was just on screen (a tour's next step keeps the page dimmed)
  const [fadeDim] = useState(() => performance.now() - lastGoneAt > NEXT_STEP_MS);
  useEffect(() => () => {
    lastGoneAt = performance.now();
  }, []);
  const shown = useRef(false);

  // Find the target (it can mount a moment after the route) and follow it
  const targetKey = typeof target === "string" ? target : target.join(" ");
  useEffect(() => {
    const ids = targetKey.split(" ");
    let elements: HTMLElement[] = [];
    let observer: ResizeObserver | null = null;
    let frame = 0;
    let poll: ReturnType<typeof setInterval> | null = null;
    let watch: ReturnType<typeof setInterval> | null = null;
    let usingFallback = false;
    // cc-64 (2b): whether to look for a running animation before measuring. Only a new target or a change of its size
    // asks (a sheet sliding in); a scroll frame does not scan every animation of the document
    let checkMotion = true;
    const started = Date.now();

    // The element left the page: point at its new copy if there is one, else the step or tip is skipped (no ring
    // left on an empty spot)
    const refind = (): boolean => {
      const found = usingFallback && fallback ? [findTarget(fallback)] : ids.map(findTarget);
      if (!found.every((el): el is HTMLElement => el !== null)) return false;
      observer?.disconnect();
      elements = found;
      checkMotion = true;
      for (const el of found) observer?.observe(el);
      return true;
    };

    const measure = () => {
      frame = 0;
      if (elements.length === 0) return;
      if (elements.some((el) => !el.isConnected) && !refind()) {
        callbacks.current.onMissing();
        return;
      }
      const settling = checkMotion ? moving(elements) : null;
      if (settling) {
        settling.finished.then(resized, resized);
        return;
      }
      checkMotion = false;
      const r = unionBox(elements.map((el) => el.getBoundingClientRect()));
      // Shallow compares: a frame where nothing moved renders nothing
      setView((v) => (v.width === window.innerWidth && v.height === window.innerHeight ? v : { width: window.innerWidth, height: window.innerHeight }));
      if (r.width === 0 || r.height === 0 || r.top + r.height < 0 || r.top > window.innerHeight || r.left + r.width < 0 || r.left > window.innerWidth) {
        callbacks.current.onMissing();
        return;
      }
      setBox((b) => (b && b.top === r.top && b.left === r.left && b.width === r.width && b.height === r.height ? b : r));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resized = () => {
      checkMotion = true;
      schedule();
    };

    const attach = (els: HTMLElement[]) => {
      elements = els;
      if (scroll) els[0].scrollIntoView({ block: "center" });
      checkMotion = true;
      observer = new ResizeObserver(resized);
      for (const el of els) observer.observe(el);
      window.addEventListener("scroll", schedule, true);
      window.addEventListener("resize", schedule);
      watch = setInterval(() => {
        if (elements.some((el) => !el.isConnected)) schedule();
      }, WATCH_MS);
      measure();
      if (!shown.current) {
        shown.current = true;
        callbacks.current.onShown?.();
      }
    };

    let first = true;
    const tryFind = () => {
      const found = ids.map(findTarget);
      const alternative = first && fallback ? findTarget(fallback) : null;
      first = false;
      if (!found.every((el) => el !== null) && alternative) {
        usingFallback = true;
        setOnFallback(true);
        attach([alternative]);
      } else if (found.every((el): el is HTMLElement => el !== null)) {
        if (poll) clearInterval(poll);
        poll = null;
        attach(found);
      } else if (Date.now() - started > GIVE_UP_MS) {
        if (poll) clearInterval(poll);
        poll = null;
        callbacks.current.onMissing();
      }
    };
    tryFind();
    if (elements.length === 0) poll = setInterval(tryFind, POLL_MS);

    return () => {
      if (poll) clearInterval(poll);
      if (watch) clearInterval(watch);
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [targetKey, fallback, scroll]);

  // The card's own size decides above or below
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const read = () => setCardSize({ width: el.offsetWidth, height: el.offsetHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [box !== null]);

  // Focus goes into the card once it is on screen, and back to where it was afterwards
  const cardShown = box !== null;
  useEffect(() => {
    if (!cardShown) return;
    const before = document.activeElement as HTMLElement | null;
    cardRef.current?.focus();
    return () => {
      before?.focus?.();
    };
  }, [cardShown]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        callbacks.current.onEscape();
        return;
      }
      // A step with a button keeps Tab inside the card; an action step lets Tab reach the highlighted element
      if (e.key === "Tab" && !interactive && cardRef.current) {
        const items = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === cardRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [interactive]
  );

  // Esc also works when focus left the card (an action step)
  useEffect(() => {
    const onWindowKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") callbacks.current.onEscape();
    };
    window.addEventListener("keydown", onWindowKey);
    return () => window.removeEventListener("keydown", onWindowKey);
  }, []);

  if (!box || view.width === 0) return null;
  const hole = round ? roundHole(box) : holeFor(box, view);
  const place = cardPlacement(hole, view, cardSize);
  const news = tone === "news";
  const radius = news ? "rounded-2xl" : "rounded-card";

  return (
    <div data-onboarding-overlay={leaving ? undefined : ""} inert={leaving} className="fixed inset-0 z-tour" style={{ pointerEvents: "none" }}>
      {/* The dim is the shadow of the hole, so the hole's corners are round like the card's (18 px) */}
      <div
        aria-hidden="true"
        data-state={leaving ? "closed" : "open"}
        className={`${fadeDim || leaving ? "m-fade" : ""} absolute border-2 border-sky ${
          news ? "shadow-[0_0_0_100vmax_color-mix(in_srgb,var(--color-ink)_70%,transparent)]" : "shadow-[0_0_0_100vmax_var(--color-scrim)]"
        } ${round ? "rounded-full" : radius}`}
        style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
      />
      {/* Four panels leave the hole open; the page under the hole stays tappable only in an action step */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0" style={{ height: hole.top, pointerEvents: "auto" }} />
      <div aria-hidden="true" className="absolute inset-x-0" style={{ top: hole.top + hole.height, bottom: 0, pointerEvents: "auto" }} />
      <div aria-hidden="true" className="absolute left-0" style={{ top: hole.top, height: hole.height, width: hole.left, pointerEvents: "auto" }} />
      <div aria-hidden="true" className="absolute right-0" style={{ top: hole.top, height: hole.height, left: hole.left + hole.width, pointerEvents: "auto" }} />
      {(!interactive || onFallback) && (
        <div aria-hidden="true" className="absolute" style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height, pointerEvents: "auto" }} />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabel ? undefined : labelledBy}
        aria-label={ariaLabel}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        data-onboarding-card
        data-placement={place.side}
        data-state={leaving ? "closed" : "open"}
        className={`m-pop group absolute ${radius} bg-card text-text shadow-2xl outline-none`}
        // The card scales from its arrow, so it grows out of the control it points at
        style={
          {
            left: place.left,
            top: place.top,
            width: place.width,
            pointerEvents: "auto",
            "--m-origin": `${place.arrowLeft}px ${place.side === "below" ? "0" : "100%"}`,
          } as React.CSSProperties
        }
      >
        <div className={`flex flex-col gap-3 overflow-y-auto ${radius} p-4`} style={{ maxHeight: place.maxHeight }}>
          {children}
        </div>
        <span
          aria-hidden="true"
          className="absolute h-3 w-3 rotate-45 bg-card"
          style={{ left: place.arrowLeft - 6, [place.side === "below" ? "top" : "bottom"]: -6 }}
        />
      </div>
    </div>
  );
}
