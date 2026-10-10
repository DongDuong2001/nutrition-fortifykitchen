"use client";

import React, { useEffect, useRef } from "react";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  titleId?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  titleId = "sheet-title",
  description,
  children,
  className = "",
}: SheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    // Capture the opener element to return focus on close
    openerRef.current = document.activeElement as HTMLElement | null;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog
    const focusTimer = setTimeout(() => {
      if (dialogRef.current) {
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
          if (document.activeElement === first || document.activeElement === dialogRef.current) {
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
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Dim Scrim */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-scrim backdrop-blur-[1px] transition-opacity duration-200"
      />

      {/* Bottom Sheet Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`relative z-10 w-full max-w-[390px] mx-auto bg-card rounded-t-[20px] px-4 pt-2.5 pb-6 flex flex-col gap-2 shadow-2xl transition-transform duration-200 outline-none ${className}`}
      >
        {/* Grabber */}
        <div
          aria-hidden="true"
          className="w-9 h-[5px] rounded-full bg-grabber self-center shrink-0 mb-1"
        />

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

        {children}
      </div>
    </div>
  );
}
