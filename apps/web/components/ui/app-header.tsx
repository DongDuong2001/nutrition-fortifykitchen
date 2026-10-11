"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatDayLabel } from "@/lib/format";
import { StepBars } from "@/components/ui/step-bars";

export type AppHeaderVariant = "daily" | "sub" | "tab";

export interface AppHeaderProps {
  /** Variant of the header: 'daily' (Today, Vi chất), 'sub' (detail pages, setup), 'tab' (Profile, Training) */
  variant?: AppHeaderVariant;
  /** Primary title (Saira Condensed italic) */
  title?: string;
  /** One line under the title. Daily header: desktop only (the phone shows the date row). Sub and tab: all widths. */
  subtitle?: string;
  /** Date object or YYYY-MM-DD string for 'daily' header */
  date?: string | Date;
  /** Previous date handler */
  onPrev?: () => void;
  /** Next date handler */
  onNext?: () => void;
  /** Whether going to next date is allowed (disabled on today) */
  canGoNext?: boolean;
  /** Tapping the date label opens the day picker. Phone daily header only. */
  onDateTap?: () => void;
  /** Back navigation URL for 'sub' variant */
  backHref?: string;
  /** Back button handler for 'sub' variant */
  onBack?: () => void;
  /** Accessible label for back button (default: "Quay lại") */
  backLabel?: string;
  /** Sub variant: slanted step bars under the title, e.g. setup "Bước 1 / 2" */
  progress?: { current: number; total: number };
  /** Slot for summary panel (kcal/dial, micro counts, etc.) */
  summary?: React.ReactNode;
  /** Slot for right actions (desktop buttons, sub-screen step indicators, etc.) */
  actions?: React.ReactNode;
  /** Desktop-specific stat element (e.g. "8/22 vi chất đạt") */
  desktopStat?: React.ReactNode;
  /** data-align-group attribute for alignment tests */
  alignGroup?: string;
  /** Additional container classes */
  className?: string;
}

/**
 * Shared AppHeader for H1T MICRO (Cobalt Sign design system).
 * Supports 3 variants:
 * - "daily": phone ink block with logo + date nav + summary; desktop title + date buttons + actions.
 * - "sub": sub-screen with 44px back button, title, optional right action.
 * - "tab": main tabs without date nav (Profile, Training).
 */
export function AppHeader({
  variant = "daily",
  title,
  subtitle,
  date,
  onPrev,
  onNext,
  canGoNext,
  onDateTap,
  backHref,
  onBack,
  backLabel = "Quay lại",
  progress,
  summary,
  actions,
  desktopStat,
  alignGroup,
  className = "",
}: AppHeaderProps) {
  const [clientNow, setClientNow] = useState<Date | null>(null);

  useEffect(() => {
    setClientNow(new Date());
  }, []);

  // Compute date label on client after mount to prevent hydration mismatch
  const resolvedDateLabel = useMemo(() => {
    if (!date) return "";
    if (clientNow) {
      return formatDayLabel(date, clientNow);
    }
    // Fallback for SSR / initial client render:
    if (typeof date === "string" && !/^\d{4}-\d{2}-\d{2}/.test(date)) {
      return date;
    }
    return "";
  }, [date, clientNow]);

  const isPrevDisabled = !onPrev;
  const isNextDisabled =
    !onNext ||
    canGoNext === false ||
    (canGoNext === undefined && resolvedDateLabel.startsWith("Hôm nay"));

  // =========================================================================
  // 1. "sub" VARIANT (Detail screens, setup steps)
  // =========================================================================
  if (variant === "sub") {
    return (
      <header
        className={`bg-ink text-white rounded-b-[20px] w-full flex-none select-none ${className}`}
      >
        <div className="w-full max-w-[560px] mx-auto px-4 pt-3 pb-5 flex flex-col gap-3">
          {/* Top row: Back button left, optional right action */}
          <div className="flex items-center justify-between min-h-[44px]">
            {backHref ? (
              <Link
                href={backHref}
                aria-label={backLabel}
                className="w-11 h-11 -ml-2 rounded-lg text-white flex items-center justify-center no-underline hover:text-sky transition-colors active:scale-[0.97]"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </Link>
            ) : onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label={backLabel}
                className="w-11 h-11 -ml-2 rounded-lg bg-transparent border-0 text-white flex items-center justify-center cursor-pointer hover:text-sky transition-colors active:scale-[0.97]"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
            ) : (
              <div className="w-11 h-11" />
            )}

            {actions}
          </div>

          {/* Title, step bars and subtitle. Title and subtitle share alignGroup for the alignment check */}
          {title && (
            <h1
              data-align-group={alignGroup}
              data-align-edge="left"
              className="m-0 font-display italic font-extrabold text-[28px] leading-tight text-white uppercase tracking-tight"
            >
              {title}
            </h1>
          )}
          {progress && <StepBars current={progress.current} total={progress.total} tone="dark" />}
          {subtitle && (
            <p
              data-align-group={alignGroup}
              data-align-edge="left"
              className="m-0 text-sm text-muted-subtitle leading-relaxed"
            >
              {subtitle}
            </p>
          )}

          {summary}
        </div>
      </header>
    );
  }

  // =========================================================================
  // 2. "tab" VARIANT (Main tabs without a date: Profile, Training)
  // =========================================================================
  if (variant === "tab") {
    return (
      <>
        {/* Mobile / Tablet ink block (<1024px) */}
        <header
          className={`bg-ink text-white rounded-b-[20px] w-full flex-none lg:hidden select-none ${className}`}
        >
          <div className="w-full max-w-[560px] mx-auto px-4 pt-3 pb-5 flex flex-col gap-2.5">
            {/* Row 1: Logo left, optional right action */}
            <div className="flex items-center justify-between min-h-[44px]">
              <div
                data-align-group={alignGroup}
                data-align-edge="left"
                className="font-display italic font-black text-xl uppercase tracking-tight"
              >
                H1T <span className="text-sky">MICRO</span>
              </div>
              {actions ? (
                <div>{actions}</div>
              ) : null}
            </div>

            {/* Title & Subtitle */}
            {title && (
              <div className="pt-0.5">
                <h1 className="m-0 font-display italic font-black text-3xl uppercase tracking-tight text-white">
                  {title}
                </h1>
                {subtitle && (
                  <div className="text-xs font-semibold text-muted-on-dark mt-1">
                    {subtitle}
                  </div>
                )}
              </div>
            )}

            {summary}
          </div>
        </header>

        {/* Desktop Header (≥1024px) */}
        <header
          className={`hidden lg:flex flex-wrap items-center justify-between gap-3 w-full max-w-[1240px] select-none ${className}`}
        >
          <div>
            <h1
              data-align-group={alignGroup}
              data-align-edge="left"
              className="m-0 font-display italic font-extrabold text-[34px] leading-tight text-text uppercase"
            >
              {title}
            </h1>
            {subtitle && (
              <div className="text-sm text-secondary mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
          {actions}
        </header>
      </>
    );
  }

  // =========================================================================
  // 3. "daily" VARIANT (Main tabs showing one day: Today, Vi chất)
  // =========================================================================
  return (
    <>
      {/* Mobile / Tablet ink block (<1024px) */}
      <header
        className={`bg-ink text-white rounded-b-[20px] w-full flex-none lg:hidden select-none ${className}`}
      >
        <div className="w-full max-w-[560px] mx-auto px-4 pt-3 pb-4 flex flex-col gap-2.5">
          {/* Row 1: Logo left; Date nav right (44px hit targets) */}
          <div
            data-align-group={alignGroup}
            className="flex items-center justify-between min-h-[44px] w-full"
          >
            <div className="font-display italic font-black text-xl uppercase tracking-tight">
              H1T <span className="text-sky">MICRO</span>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={onPrev}
                disabled={isPrevDisabled}
                aria-label="Ngày trước"
                aria-disabled={isPrevDisabled}
                className={`w-11 h-11 rounded-lg bg-transparent border-0 flex items-center justify-center transition-colors ${
                  !isPrevDisabled
                    ? "text-white cursor-pointer hover:text-sky active:scale-[0.97]"
                    : "text-secondary opacity-50 cursor-default"
                }`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              {onDateTap ? (
                <button
                  type="button"
                  onClick={onDateTap}
                  aria-haspopup="dialog"
                  aria-label={`Chọn ngày, ${resolvedDateLabel}`}
                  className="text-sm font-semibold tracking-tight inline-flex items-center justify-center min-w-[104px] min-h-[44px] px-1 text-center bg-transparent border-0 text-white cursor-pointer rounded-lg hover:text-sky active:scale-[0.97] transition-colors"
                >
                  {resolvedDateLabel || <span aria-hidden="true" className="inline-block w-[104px] h-5" />}
                </button>
              ) : (
                <span className="text-sm font-semibold tracking-tight inline-flex items-center justify-center min-w-[104px] text-center">
                  {resolvedDateLabel || (
                    <span aria-hidden="true" className="inline-block w-[104px] h-5" />
                  )}
                </span>
              )}
              <button
                type="button"
                onClick={onNext}
                disabled={isNextDisabled}
                aria-label="Ngày sau"
                aria-disabled={isNextDisabled}
                className={`w-11 h-11 rounded-lg bg-transparent border-0 flex items-center justify-center transition-colors ${
                  !isNextDisabled
                    ? "text-white cursor-pointer hover:text-sky active:scale-[0.97]"
                    : "text-secondary opacity-50 cursor-default"
                }`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Optional Title (e.g. "VI CHẤT") between Row 1 and Summary */}
          {title && (
            <div className="font-display italic font-extrabold text-2xl uppercase tracking-tight text-white">
              {title}
            </div>
          )}

          {/* Row 2: Page summary slot (Option B inset panel) */}
          {summary && (
            <div className="w-full bg-surface-dark rounded-2xl p-3.5 sm:p-4">
              {summary}
            </div>
          )}
        </div>
      </header>

      {/* Desktop Header (≥1024px) */}
      <header
        className={`hidden lg:flex flex-wrap items-center gap-3 w-full max-w-[1240px] select-none ${className}`}
      >
        <div className="flex-1 min-w-[260px]">
          <h1
            data-align-group={alignGroup}
            data-align-edge="left"
            className="m-0 font-display italic font-extrabold text-[34px] leading-tight text-text uppercase"
          >
            {title || "HÔM NAY"}
          </h1>
          {subtitle && (
            <div className="text-sm text-secondary">
              {subtitle}
            </div>
          )}
        </div>

        {/* Optional desktop stat (e.g. Vi chất 8/22) */}
        {desktopStat}

        {/* Date nav buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            disabled={isPrevDisabled}
            aria-label="Ngày trước"
            aria-disabled={isPrevDisabled}
            className={`w-11 h-11 border border-card-border rounded-xl bg-card flex items-center justify-center transition-colors ${
              !isPrevDisabled
                ? "text-ink cursor-pointer hover:bg-divider active:scale-[0.97]"
                : "text-secondary opacity-50 cursor-default"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={isNextDisabled}
            aria-label="Ngày sau"
            aria-disabled={isNextDisabled}
            className={`w-11 h-11 border border-card-border rounded-xl bg-card flex items-center justify-center transition-colors ${
              !isNextDisabled
                ? "text-ink cursor-pointer hover:bg-divider active:scale-[0.97]"
                : "text-secondary opacity-50 cursor-default"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Desktop actions slot (e.g. "Chép hôm qua", "+ Thêm món") */}
        {actions}
      </header>
    </>
  );
}
