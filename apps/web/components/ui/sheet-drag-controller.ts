import { pushSample, releaseSpring, releaseVelocity, shouldDismiss, type DragSample } from "@/lib/sheet-physics";

// cc-62: the drag of a sheet (Sheet and the /add panel), without React so it can be tested with plain objects.
// The sheet follows the finger 1:1 (an inline transform while data-dragging turns the CSS transition off); the scrim
// fades with it. On release the decision comes from lib/sheet-physics (velocity over the last 80 ms, momentum
// projection); the motion then is a spring from the live position with the release velocity, using motion's animate,
// loaded on the first pointerdown so it never is in a route's first-load JS. A new grab stops a running spring where it
// is, and a sheet that is sliding away can be grabbed back. Reduced motion, or motion not loaded yet: the CSS transition
// finishes from where the finger let go, as before.

/** What the controller needs of the sheet element (an HTMLElement in the app, a plain object in tests). */
export interface DragElement {
  style: { transform: string; opacity: string };
  dataset: DOMStringMap;
  offsetHeight: number;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

export interface SpringControls {
  stop(): void;
  then(onResolve: () => void): unknown;
}

export type AnimateFn = (el: DragElement, keyframes: { transform: string[] }, options: ReturnType<typeof releaseSpring>) => SpringControls;

export interface DragHost {
  sheet(): DragElement | null;
  scrim?(): DragElement | null;
  /** The sheet's current offset in px (the live transform, also mid-animation). */
  readOffset(el: DragElement): number;
  reducedMotion(): boolean;
  /** motion's animate once it has loaded, else null (the release then uses the CSS transition). */
  animate(): AnimateFn | null;
  /** Called on the first pointerdown: start loading motion. */
  load(): void;
  /** The release closes the sheet (called at once, before the slide). */
  onDismiss(): void;
  /** A sheet that is sliding away was grabbed: true when the host opened it again (the drag goes on), false to ignore the grab. */
  onRegrab?(): boolean;
}

/** Above the top the sheet follows the finger 1:1 at first, then tightens up to this many px. */
const STRETCH = 24;
const stretch = (up: number) => STRETCH * (1 - Math.exp(-up / STRETCH));

interface Drag {
  id: number;
  y: number;
  base: number;
  pos: number;
  samples: DragSample[];
}

export function createSheetDrag(host: DragHost) {
  let drag: Drag | null = null;
  let spring: SpringControls | null = null;
  let settle: Promise<void> = Promise.resolve();
  let resolveSettle: (() => void) | null = null;

  const setScrim = (pos: number, height: number) => {
    const scrim = host.scrim?.();
    if (!scrim) return;
    scrim.setAttribute("data-dragging", "");
    scrim.style.opacity = String(Math.max(0, Math.min(1, 1 - pos / Math.max(1, height))));
  };
  const releaseScrim = () => {
    const scrim = host.scrim?.();
    if (!scrim) return;
    scrim.removeAttribute("data-dragging");
    scrim.style.opacity = "";
  };

  return {
    /** Resolves once no release spring runs (a closing sheet waits for it before it unmounts). */
    settled: () => settle,
    /** A release spring is running (false after a release that used the CSS transition). */
    springing: () => spring !== null,

    down(pointerId: number, clientY: number, timeStamp: number) {
      if (drag) return false;
      host.load();
      const el = host.sheet();
      // Read where the sheet is right now (mid-spring or mid-transition), then stop what moves it and pin it there
      const base = el ? host.readOffset(el) : 0;
      // A sheet sliding away is grabbed back only when its host can open it again
      if (el && el.dataset.state === "closed" && !(host.onRegrab?.() ?? false)) return false;
      if (spring) {
        spring.stop();
        spring = null;
        // Whoever waits for the old spring (a closing sheet before it unmounts) is told it is over
        resolveSettle?.();
        resolveSettle = null;
      }
      drag = { id: pointerId, y: clientY, base, pos: base, samples: [{ t: timeStamp, y: base }] };
      if (el) {
        el.style.transform = `translateY(${base}px)`;
        el.setAttribute("data-dragging", "");
        setScrim(base, el.offsetHeight);
      }
      return true;
    },

    move(pointerId: number, clientY: number, timeStamp: number) {
      const el = host.sheet();
      if (!drag || !el || pointerId !== drag.id) return;
      const total = drag.base + clientY - drag.y;
      drag.pos = total >= 0 ? total : -stretch(-total);
      drag.samples = pushSample(drag.samples, { t: timeStamp, y: drag.pos });
      el.style.transform = `translateY(${drag.pos}px)`;
      setScrim(drag.pos, el.offsetHeight);
    },

    up(pointerId: number, timeStamp: number, cancelled: boolean) {
      const d = drag;
      if (!d || pointerId !== d.id) return;
      drag = null;
      const el = host.sheet();
      releaseScrim();
      if (!el) return;
      const height = el.offsetHeight;
      const velocity = releaseVelocity(d.samples, timeStamp);
      const dismiss = !cancelled && shouldDismiss(d.pos, velocity, height);
      const animate = host.reducedMotion() ? null : host.animate();
      if (dismiss) {
        el.dataset.state = "closed";
        host.onDismiss();
      }
      if (!animate) {
        // The CSS transition takes it from where the finger let go
        el.removeAttribute("data-dragging");
        el.style.transform = "";
        return;
      }
      const target = dismiss ? height : 0;
      const controls = animate(el, { transform: [`translateY(${d.pos}px)`, `translateY(${target}px)`] }, releaseSpring(dismiss, velocity));
      spring = controls;
      settle = new Promise<void>((resolve) => {
        resolveSettle = resolve;
        controls.then(() => {
          // A grab during the spring stopped it and owns the sheet now
          if (spring === controls) {
            spring = null;
            el.removeAttribute("data-dragging");
            el.style.transform = "";
            resolveSettle = null;
          }
          resolve();
        });
      });
    },
  };
}

/** Make everything in `root` inert except the drag areas ([data-sheet-drag]), whose controls are made inert too. */
export function setInertExceptDrag(root: Element, on: boolean): void {
  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (child.hasAttribute("data-sheet-drag")) {
      child.querySelectorAll<HTMLElement>("button, a, input, select, textarea, [tabindex]").forEach((c) => (c.inert = on));
    } else if (child.querySelector("[data-sheet-drag]")) {
      setInertExceptDrag(child, on);
    } else {
      child.inert = on;
    }
  }
}
