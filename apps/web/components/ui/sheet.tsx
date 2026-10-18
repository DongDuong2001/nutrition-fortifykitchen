"use client";

import React, { useEffect, useRef, useState } from "react";
import { closeSheetEntry, openSheetEntry } from "@/lib/sheet-history";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  titleId?: string;
  /** The id of a heading inside `children` that names the dialog, when the header is custom (no `title`). */
  labelledBy?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** At 1024 px and up, show as a centred dialog instead of a bottom sheet. The phone keeps the sheet. */
  desktopDialog?: boolean;
  /** The id of the element that takes focus on open (a heading with tabIndex -1), instead of the first control. */
  initialFocusId?: string;
  /** cc-51: false for a sheet that animates itself (Có gì mới): no slide classes, and it unmounts at once on close. */
  motion?: boolean;
}

/** cc-51: how long a sheet takes to slide in or out (globals.css .m-sheet-*). */
const SHEET_MS = 250;
/** Let go after dragging down this share of the sheet's height, or faster than this (px per ms): it closes. */
const DRAG_CLOSE_SHARE = 0.25;
const DRAG_CLOSE_SPEED = 0.5;

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  titleId = "sheet-title",
  labelledBy,
  description,
  children,
  className = "",
  desktopDialog = false,
  initialFocusId,
  motion = true,
}: SheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // cc-51: stays mounted for the exit animation; a drag that closes it slides out from where the finger let go
  const [mounted, setMounted] = useState(open);
  const draggedOut = useRef(false);
  const drag = useRef<{ y: number; t: number; dy: number; v: number } | null>(null);
  // Every opening gets fresh content (a form opened again starts blank, as when the sheet unmounted at once)
  const openings = useRef(0);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) openings.current += 1;
  wasOpen.current = open;

  useEffect(() => {
    if (open) {
      draggedOut.current = false;
      setMounted(true);
      return;
    }
    if (!mounted) return;
    if (!motion) {
      setMounted(false);
      return;
    }
    const timer = setTimeout(() => setMounted(false), SHEET_MS);
    return () => clearTimeout(timer);
  }, [open, mounted, motion]);

  // Back (the phone's back gesture or button) closes the sheet instead of leaving the page. The entry copies the
  // router's own state, so Next restores the same page. Closed another way, the entry is taken back, unless a
  // navigation is pending, the route changed or another sheet sits above it (lib/sheet-history).
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const href = window.location.href;
    const id = openSheetEntry();
    let popped = false;
    const onPop = () => {
      if (window.history.state?.h1tSheet === id) return;
      popped = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      closeSheetEntry(id, href, popped);
    };
  }, [open]);

  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!open || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0, v: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    dialogRef.current?.classList.remove("m-snap", "m-sheet-enter");
  };
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !dialogRef.current) return;
    const dy = Math.max(0, e.clientY - d.y);
    const dt = Math.max(1, e.timeStamp - d.t);
    d.v = (dy - d.dy) / dt;
    d.dy = dy;
    d.t = e.timeStamp;
    dialogRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onDragEnd = () => {
    const d = drag.current;
    const el = dialogRef.current;
    drag.current = null;
    if (!d || !el) return;
    if (d.dy > el.offsetHeight * DRAG_CLOSE_SHARE || d.v > DRAG_CLOSE_SPEED) {
      draggedOut.current = true;
      el.style.transition = `transform ${SHEET_MS}ms ease-in`;
      el.style.transform = "translateY(100%)";
      onCloseRef.current();
    } else {
      el.classList.add("m-snap");
      el.style.transform = "";
    }
  };

  useEffect(() => {
    if (!open) return;

    // Capture the opener element to return focus on close
    openerRef.current = document.activeElement as HTMLElement | null;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog
    const focusTimer = setTimeout(() => {
      const initial = initialFocusId ? document.getElementById(initialFocusId) : null;
      if (initial) {
        initial.focus();
      } else if (dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          // From the first control, the dialog itself or a focused heading, Shift+Tab wraps to the last control
          if (document.activeElement === first || !focusables.includes(document.activeElement as HTMLElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      openerRef.current?.focus?.();
    };
  }, [open, initialFocusId]);

  if (!open && (!mounted || !motion)) return null;
  // Leaving: still drawn for the exit animation, but no longer a dialog for screen readers, focus or taps
  const showing = open;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-end ${desktopDialog ? "lg:justify-center lg:items-center" : ""} ${showing ? "" : "pointer-events-none"}`} inert={!showing}>
      {/* Dim Scrim */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 bg-scrim backdrop-blur-[1px] ${!motion ? "" : showing ? "m-scrim-enter" : "m-scrim-exit"}`}
      />

      {/* Bottom Sheet Dialog */}
      <div
        ref={dialogRef}
        role={showing ? "dialog" : undefined}
        tabIndex={-1}
        aria-modal={showing ? "true" : undefined}
        aria-hidden={showing ? undefined : true}
        aria-labelledby={showing ? (title ? titleId : labelledBy) : undefined}
        className={`relative z-10 w-full max-w-[390px] mx-auto bg-card rounded-t-[20px] px-4 pt-3 pb-6 flex flex-col gap-2 shadow-2xl outline-none ${desktopDialog ? "m-dialog lg:w-[420px] lg:max-w-[420px] lg:rounded-[20px] lg:px-6 lg:pt-6" : ""} ${!motion ? "" : showing ? "m-sheet-enter" : draggedOut.current ? "" : "m-sheet-exit"} ${className}`}
      >
        {/* Grabber: drag it down to close (a 24 px strip around the 5 px bar) */}
        <div
          aria-hidden="true"
          data-sheet-handle
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          style={{ touchAction: "none" }}
          className={`-mx-4 -mt-3 flex h-6 shrink-0 cursor-grab items-center justify-center self-stretch ${desktopDialog ? "lg:hidden" : ""}`}
        >
          <div className="w-9 h-[5px] rounded-full bg-grabber" />
        </div>

        {/* Optional Header */}
        {(title || description) && (
          <div className="px-1 mb-1">
            {title && (
              <h2
                id={titleId}
                className="m-0 text-lg font-bold text-text leading-tight"
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="m-0 text-sm text-secondary tabular-nums mt-0.5">
                {description}
              </p>
            )}
          </div>
        )}

        <React.Fragment key={openings.current}>{children}</React.Fragment>
      </div>
    </div>
  );
}
