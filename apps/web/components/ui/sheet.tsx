"use client";

import React, { useEffect } from "react";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  titleId?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  titleId = "sheet-title",
  description,
  children,
  className = "",
}: SheetProps) {
  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Dim Scrim */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-[#0A0A0B]/50 backdrop-blur-[1px] transition-opacity duration-200"
      />

      {/* Bottom Sheet Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`relative z-10 w-full max-w-[390px] mx-auto bg-card rounded-t-[20px] px-4 pt-2.5 pb-6 flex flex-col gap-2 shadow-2xl transition-transform duration-200 ${className}`}
      >
        {/* Grabber */}
        <div
          aria-hidden="true"
          className="w-9 h-[5px] rounded-full bg-[#D5D8DF] self-center shrink-0 mb-1"
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
