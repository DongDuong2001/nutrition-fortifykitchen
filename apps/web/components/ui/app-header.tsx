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
  subtitle?: React.ReactNode;
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
  /** Row under the summary on the phone daily header (e.g. a link to a related page) */
  footer?: React.ReactNode;
  /** Slot for right actions (desktop buttons, sub-screen step indicators, etc.) */
  actions?: React.ReactNode;
  /** Desktop-specific stat element (e.g. "8/22 vi chất đạt") */
  desktopStat?: React.ReactNode;
  /** Daily header, phone only: show the H1T MICRO wordmark in the ink band (Tổng quan, `/`). The title stays as a sr-only h1. */
  wordmark?: boolean;
  /** Desktop title row width: "narrow" (560 px column, default) or "wide" (left-aligned at the 32 px gutter). */
  layout?: "narrow" | "wide";
  /** Desktop: the page's main already has 32 px padding, so the row adds none. */
  flush?: boolean;
  /** data-align-group attribute for alignment tests */
  alignGroup?: string;
  /** Additional container classes */
  className?: string;
}

/**
 * Shared AppHeader for H1T MICRO (Cobalt Sign design system), IA v2 "Headers" rules.
 * - "daily": the screens with an ink hero (Tổng quan, Nhật ký). Phone: ink band with the date nav and either the
 *   wordmark (`wordmark`, Tổng quan only) or the screen's name. Desktop: plain title row on paper with date buttons.
 * - "sub": pushed screens. Paper title row: 44 px back inline before the title, one subtitle line, actions right.
 * - "tab": tab screens. Same row without a back button.
 * `summary` (sub, tab) is an ink card below the row. Desktop never has an ink band.
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
  footer,
  actions,
  desktopStat,
  wordmark = false,
  layout = "narrow",
  flush = false,
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

  // Back button, inline before the title (44 px target) on every screen and width.
  const backClass =
    "-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-text no-underline cursor-pointer hover:text-blue transition-colors active:scale-[0.97]";
  const backIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
  const back = backHref ? (
    <Link href={backHref} aria-label={backLabel} className={backClass}>
      {backIcon}
    </Link>
  ) : onBack ? (
    <button type="button" onClick={onBack} aria-label={backLabel} className={backClass}>
      {backIcon}
    </button>
  ) : null;

  // Width of the title row. "narrow" follows the 560 px column (a phone, and centred pages on desktop); "wide"
  // is left-aligned at the 32 px content gutter of the desktop grid. "flush" is for a page whose main already pads.
  const rowWidth = layout === "wide" ? "max-w-[560px] mx-auto px-4 lg:max-w-[1240px] lg:mx-0 lg:px-8" : "max-w-[560px] mx-auto px-4";
  const deskPad = flush ? "lg:max-w-none lg:mx-0 lg:px-0 lg:pt-0" : "lg:pt-8";

  // =========================================================================
  // 1. "sub" and "tab" VARIANTS: a plain title row on paper, phone and desktop.
  //    sub: pushed screens (back before the title). tab: a tab screen (no back, unless one is passed).
  //    The wordmark never appears here; the title is the screen's name. An optional summary is an ink card below.
  // =========================================================================
  if (variant === "sub" || variant === "tab") {
    return (
      <header className={`w-full flex-none select-none bg-page text-text ${className}`}>
        <div className={`w-full pt-3 pb-3 flex flex-col gap-3 ${rowWidth} ${deskPad}`}>
          {/* The row's left edge is the content edge, so it is the alignment member (the title sits after the back) */}
          <div data-align-group={alignGroup} data-align-edge="left" className="flex items-center gap-2 min-h-[44px]">
            {back}
            <div className="min-w-0 flex-1">
              {title && (
                <h1
                  className="m-0 font-display italic font-extrabold text-2xl lg:text-[32px] leading-tight uppercase tracking-tight text-text line-clamp-2"
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <div className="m-0 mt-0.5 text-[13px] lg:text-sm leading-snug text-secondary">{subtitle}</div>
              )}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
          {progress && <StepBars current={progress.current} total={progress.total} tone="light" />}
          {summary && <div className="w-full rounded-2xl bg-ink p-4 text-on-dark">{summary}</div>}
          {footer}
        </div>
      </header>
    );
  }

  // =========================================================================
  // 3. "daily" VARIANT (Main tabs showing one day: Today, Vi chất)
  // =========================================================================
  return (
    <>
      {/* Mobile / Tablet ink block (<1024px) */}
      <header
        className={`bg-ink text-on-dark rounded-b-[20px] w-full flex-none lg:hidden select-none ${className}`}
      >
        <div className="w-full max-w-[560px] mx-auto px-4 pt-3 pb-4 flex flex-col gap-2.5">
          {/* Row 1: Logo left; Date nav right (44px hit targets) */}
          <div
            data-align-group={alignGroup}
            className="flex items-center justify-between min-h-[44px] w-full"
          >
            {wordmark ? (
              <>
                <div aria-hidden="true" className="font-display italic font-black text-xl uppercase tracking-tight">
                  H1T <span className="text-sky">MICRO</span>
                </div>
                {title && <h1 className="sr-only">{title}</h1>}
              </>
            ) : (
              <h1 className="m-0 font-display italic font-extrabold text-2xl leading-tight uppercase tracking-tight text-on-dark">
                {title}
              </h1>
            )}
            <div className="flex items-center">
              <button
                type="button"
                onClick={onPrev}
                disabled={isPrevDisabled}
                aria-label="Ngày trước"
                aria-disabled={isPrevDisabled}
                className={`w-11 h-11 rounded-lg bg-transparent border-0 flex items-center justify-center transition-colors ${
                  !isPrevDisabled
                    ? "text-on-dark cursor-pointer hover:text-sky active:scale-[0.97]"
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
                  aria-busy={resolvedDateLabel ? undefined : true}
                  className="text-sm font-semibold tracking-tight inline-flex items-center justify-center min-w-[104px] min-h-[44px] px-1 text-center bg-transparent border-0 text-on-dark cursor-pointer rounded-lg hover:text-sky active:scale-[0.97] transition-colors"
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
                    ? "text-on-dark cursor-pointer hover:text-sky active:scale-[0.97]"
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

          {/* Row 2: Page summary slot (Option B inset panel) */}
          {summary && (
            <div className="w-full bg-surface-dark rounded-2xl p-3.5 sm:p-4">
              {summary}
            </div>
          )}
          {footer}
        </div>
      </header>

      {/* Desktop Header (≥1024px) */}
      <header
        className={`hidden lg:flex flex-wrap items-center gap-3 w-full max-w-[1240px] select-none bg-page ${
          flush ? "" : "px-8 pt-8"
        } ${className}`}
      >
        <div
          data-align-group={alignGroup}
          data-align-edge="left"
          className="flex flex-1 min-w-[260px] items-center gap-2"
        >
          {back}
          <div className="min-w-0">
            <h1
              className="m-0 font-display italic font-extrabold text-[32px] leading-tight text-text uppercase"
            >
              {title}
            </h1>
            {subtitle && <div className="mt-0.5 text-sm text-secondary">{subtitle}</div>}
          </div>
        </div>

        {/* Optional desktop stat (e.g. Vi chất 8/22) */}
        {desktopStat}

        {/* Date nav buttons (only on screens that move between days) */}
        {(onPrev || onNext) && (
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
        )}

        {/* Desktop actions slot (e.g. "Chép hôm qua", "+ Thêm món") */}
        {actions}
      </header>
    </>
  );
}
