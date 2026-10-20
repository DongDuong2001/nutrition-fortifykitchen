"use client";

import React, { useEffect, useRef, useState } from "react";
import { markUsed } from "@/lib/onboarding-store";
import { closeSheetEntry, openSheetEntry } from "@/lib/sheet-history";
import { setPresent } from "@/lib/tour-bus";
import { haptic } from "@/lib/haptics";
import { setInertExceptDrag } from "@/components/ui/sheet-drag-controller";
import { useSheetDrag } from "@/components/ui/use-sheet-drag";

// The /add panel drags and closes like a sheet; it imports both from here, so they stay in the sheet's shared chunk
export { useSheetDrag };

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
  /** cc-62: opened over another sheet (the portion sheet over /add): a lighter scrim, the first one is already there. */
  stacked?: boolean;
}

/** cc-55: how long a closing sheet stays drawn (globals.css --m-sheet-out, the exit; the enter takes 350 ms). */
export const SHEET_EXIT_MS = 220;

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
  stacked = false,
}: SheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  // cc-62: a drag that closes the sheet slides it away first and tells the parent once it is down, so a grab during the
  // slide can still take it back
  const dragClosing = useRef(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // cc-51: stays mounted for the exit; cc-55: the slide is a transition on data-state, so a sheet opened again while
  // it closes goes back up from where it is, and a drag that closes it slides on from where the finger let go
  const [mounted, setMounted] = useState(open);
  // Every opening gets fresh content (a form opened again starts blank, as when the sheet unmounted at once)
  const openings = useRef(0);
  const wasOpen = useRef(false);
  // Esc on a keyboard closes at once: a keyboard action never waits for an animation (like /add)
  const instantClose = useRef(false);
  if (open && !wasOpen.current) openings.current += 1;
  // cc-55: while it slides away it keeps what it showed (a sheet whose content comes from state that is already
  // cleared would otherwise lose its title and rows mid-exit)
  const shownContent = useRef({ title, description, children });
  if (open) shownContent.current = { title, description, children };
  wasOpen.current = open;

  useEffect(() => {
    if (open) {
      instantClose.current = false;
      setMounted(true);
      return;
    }
    if (!mounted) return;
    if (instantClose.current) {
      instantClose.current = false;
      setMounted(false);
      return;
    }
    const timer = setTimeout(() => setMounted(false), SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, mounted]);

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

  const setDragClosed = (closed: boolean) => {
    const dialog = dialogRef.current;
    if (scrimRef.current) scrimRef.current.dataset.state = closed ? "closed" : "open";
    if (!dialog) return;
    dialog.dataset.state = closed ? "closed" : "open";
    setInertExceptDrag(dialog, closed);
  };
  const drag = useSheetDrag(
    dialogRef,
    () => {
      markUsed("sheet-drag");
      haptic("snap");
      dragClosing.current = true;
      setDragClosed(true);
      // After the release has started its spring (or left the slide to the CSS transition, SHEET_EXIT_MS)
      setTimeout(() => {
        const done = () => {
          if (!dragClosing.current) return;
          dragClosing.current = false;
          if (dialogRef.current) setInertExceptDrag(dialogRef.current, false);
          instantClose.current = true;
          onCloseRef.current();
        };
        if (drag.springing()) void drag.settled().then(done);
        else setTimeout(done, SHEET_EXIT_MS);
      }, 0);
    },
    {
      scrimRef,
      onRegrab: () => {
        if (!dragClosing.current) return false;
        dragClosing.current = false;
        setDragClosed(false);
        return true;
      },
    }
  );

  useEffect(() => {
    if (!open) return;

    // Capture the opener element to return focus on close
    openerRef.current = document.activeElement as HTMLElement | null;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The drag-down tip waits for an open sheet
    setPresent("sheet", true);

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
      // A tip open over the sheet keeps Esc and Tab for its own card
      if (e.defaultPrevented || document.querySelector("[data-onboarding-overlay]")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        instantClose.current = true;
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
      setPresent("sheet", false);
      document.body.style.overflow = originalOverflow;
      openerRef.current?.focus?.();
    };
  }, [open, initialFocusId]);

  if (!open && !mounted) return null;
  // Leaving: still drawn for the exit animation, but no longer a dialog for screen readers, focus or taps
  const showing = open;
  const state = showing ? "open" : "closed";
  const content = shownContent.current;

  return (
    <div className={`fixed inset-0 z-sheet flex flex-col justify-end ${desktopDialog ? "lg:justify-center lg:items-center" : ""} ${showing ? "" : "pointer-events-none"}`} inert={!showing}>
      {/* Dim Scrim */}
      <div
        ref={scrimRef}
        aria-hidden="true"
        onClick={onClose}
        data-state={state}
        className={`m-scrim fixed inset-0 ${stacked ? "bg-scrim-2" : "bg-scrim"} ${desktopDialog ? "m-scrim-dialog" : ""}`}
      />

      {/* Bottom Sheet Dialog */}
      <div
        ref={dialogRef}
        data-state={state}
        role={showing ? "dialog" : undefined}
        tabIndex={-1}
        aria-modal={showing ? "true" : undefined}
        aria-hidden={showing ? undefined : true}
        aria-labelledby={showing ? (title ? titleId : labelledBy) : undefined}
        className={`relative z-sticky w-full max-w-[390px] mx-auto bg-card rounded-t-sheet px-4 pt-3 pb-[max(24px,env(safe-area-inset-bottom))] max-h-[calc(100dvh-24px)] overflow-y-auto overscroll-contain flex flex-col gap-2 shadow-sheet outline-none m-sheet ${desktopDialog ? "m-dialog lg:w-[420px] lg:max-w-[420px] lg:rounded-sheet lg:px-6 lg:pt-6" : ""} ${className}`}
      >
        {/* Grabber: drag it down to close (a 24 px strip around the 5 px bar); the title block below drags too */}
        <div
          aria-hidden="true"
          data-sheet-handle
          data-sheet-drag
          data-tour="sheet-handle"
          {...drag.handlers}
          style={{ touchAction: "none" }}
          className={`-mx-4 -mt-3 flex h-6 shrink-0 cursor-grab items-center justify-center self-stretch ${desktopDialog ? "lg:hidden" : ""}`}
        >
          <div className="w-9 h-[5px] rounded-full bg-grabber" />
        </div>

        {/* Optional Header */}
        {(content.title || content.description) && (
          <div data-sheet-drag {...drag.handlers} style={{ touchAction: "none" }} className="px-1 mb-1">
            {content.title && (
              <h2
                id={titleId}
                className="m-0 text-lg font-bold text-text leading-tight"
              >
                {content.title}
              </h2>
            )}
            {content.description && (
              <p className="m-0 text-sm text-secondary tabular-nums mt-0.5">
                {content.description}
              </p>
            )}
          </div>
        )}

        <React.Fragment key={openings.current}>{content.children}</React.Fragment>
      </div>
    </div>
  );
}
