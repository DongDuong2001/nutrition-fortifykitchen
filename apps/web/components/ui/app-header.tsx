"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatDayLabel } from "@/lib/format";
import { StepBars } from "@/components/ui/step-bars";

export type AppHeaderVariant = "daily" | "sub" | "tab";

export interface AppHeaderProps {
  /** "daily" screens move between days (date nav); "sub" and "tab" differ only in the default width. */
  variant?: AppHeaderVariant;
  /** The screen's name (Saira Condensed). One h1 per page. */
  title?: string;
  /** cc-55b: "p" when the screen is only a picture behind another one (Hôm nay behind /add): one h1 per page. */
  titleAs?: "h1" | "p";
  /** One line under the title. On the daily header it shows from 1024 px up only (the phone has the date label). */
  subtitle?: React.ReactNode;
  /** Date object or YYYY-MM-DD string for the daily header */
  date?: string | Date;
  onPrev?: () => void;
  onNext?: () => void;
  /** Whether going to next date is allowed (disabled on today) */
  canGoNext?: boolean;
  /** Tapping the date label opens the day picker. Phone only. */
  onDateTap?: () => void;
  backHref?: string;
  onBack?: () => void;
  /** Accessible label for the back button (default: "Quay lại") */
  backLabel?: string;
  /** Slanted step bars in the header, e.g. setup "Bước 1 / 2" */
  progress?: { current: number; total: number };
  /** Day summary or a screen's key figure. An inset panel in the ink header on a phone, an ink card on desktop. */
  summary?: React.ReactNode;
  /** The summary shows on a phone only (the desktop page has its own hero). */
  summaryPhoneOnly?: boolean;
  /** A row under the summary (a link to a related page). */
  footer?: React.ReactNode;
  /** Second row inside the header: the Tổng quan sub-tab bar. */
  tabs?: React.ReactNode;
  /** Second row inside the header: the Khám phá search field. */
  search?: React.ReactNode;
  /** Up to two 44 px icon actions (or one desktop control) on the right of the title row. */
  actions?: React.ReactNode;
  /** Desktop stat element next to the title (e.g. "8/22 vi chất đạt") */
  desktopStat?: React.ReactNode;
  /** Phone: the H1T MICRO wordmark in the title position; the title stays as a sr-only h1 (Tổng quan). */
  wordmark?: boolean;
  /** Phone, with `wordmark`: takes the wordmark's place (the home screen's "Về hôm nay" on a past day). */
  phoneStart?: React.ReactNode;
  /** Desktop width: "narrow" (560 px column) or "wide" (left-aligned at the 32 px gutter). Daily defaults to wide. */
  layout?: "narrow" | "wide";
  /** Desktop: the page's main already has 32 px padding, so the header adds none. */
  flush?: boolean;
  /** Phone: a 52 px band (4 px above and below the 44 px row) and a 21 px wordmark. The home screen. */
  compact?: boolean;
  /** data-align-group attribute for alignment tests */
  alignGroup?: string;
  /** "page": the row shares both edges with the page body, checked from 1024 px (data-align-from="lg"); default: left edge only. */
  alignMode?: "left" | "page";
  className?: string;
}

export const HEADER_ICON_BUTTON =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-on-dark lg:text-text no-underline cursor-pointer hover:text-sky lg:hover:text-blue active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-sky lg:focus-visible:outline-blue";
const DATE_BUTTON =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-on-dark cursor-pointer hover:text-sky active:scale-[0.97] transition-press motion-reduce:active:scale-100 disabled:cursor-default disabled:text-secondary disabled:opacity-50 lg:border lg:border-card-border lg:bg-card lg:text-ink lg:hover:bg-divider lg:hover:text-ink lg:disabled:text-secondary focus-visible:outline-sky lg:focus-visible:outline-blue";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

/**
 * The one header of H1T MICRO (design/UI-RULES.md, IA v2 "Headers and UI unity").
 * Phone: `bg-ink`, bottom corners 20 px, safe-area top, 16 px sides, one 44 px title row (back, Saira 24 title,
 * up to two icon actions), plus an optional second row INSIDE the same header (tabs, date summary, search).
 * Desktop (>= 1024 px): no ink band; the same row sits on paper (Saira 32), ink only in the summary card.
 * It is one DOM for both, so there is exactly one h1.
 */
export function AppHeader({
  variant = "daily",
  title,
  titleAs: Title = "h1",
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
  summaryPhoneOnly = false,
  tabs,
  search,
  footer,
  actions,
  desktopStat,
  wordmark = false,
  phoneStart,
  layout,
  flush = false,
  compact = false,
  alignGroup,
  alignMode = "left",
  className = "",
}: AppHeaderProps) {
  const [clientNow, setClientNow] = useState<Date | null>(null);
  // Read again when the date shown changes, so a day that rolls over at midnight is labelled against the new now
  useEffect(() => {
    setClientNow(new Date());
  }, [date]);

  // The label is computed after mount so the server and first client render agree.
  const dateLabel = useMemo(() => {
    if (!date) return "";
    if (clientNow) return formatDayLabel(date, clientNow);
    if (typeof date === "string" && !/^\d{4}-\d{2}-\d{2}/.test(date)) return date;
    return "";
  }, [date, clientNow]);

  const hasDateNav = Boolean(onPrev || onNext);
  const prevDisabled = !onPrev;
  const nextDisabled = !onNext || canGoNext === false || (canGoNext === undefined && dateLabel.startsWith("Hôm nay"));

  const back = backHref ? (
    <Link href={backHref} aria-label={backLabel} className={`${HEADER_ICON_BUTTON} -ml-2`}>
      <Chevron dir="left" />
    </Link>
  ) : onBack ? (
    <button type="button" onClick={onBack} aria-label={backLabel} className={`${HEADER_ICON_BUTTON} -ml-2`}>
      <Chevron dir="left" />
    </button>
  ) : null;

  const wide = (layout ?? (variant === "daily" ? "wide" : "narrow")) === "wide";
  // Desktop: flush = the page already pads (no side padding, no top padding); wide = left-aligned at the 32 px gutter.
  const column = flush
    ? "max-w-[560px] mx-auto px-4 lg:max-w-none lg:mx-0 lg:px-0 lg:pt-0"
    : wide
      ? "max-w-[560px] mx-auto px-4 lg:max-w-[1240px] lg:mx-0 lg:px-8 lg:pt-8"
      : "max-w-[560px] mx-auto px-4 lg:pt-8";
  const deskPad = "lg:pb-0";
  const phonePad = compact ? "pt-[max(4px,env(safe-area-inset-top))] pb-1" : "pt-[max(12px,env(safe-area-inset-top))] pb-4";

  return (
    <header
      className={`w-full flex-none select-none bg-ink text-on-dark rounded-b-[20px] lg:rounded-none lg:bg-page lg:text-text ${className}`}
    >
      <div
        className={`flex w-full flex-col gap-3 ${phonePad} box-border ${column} ${deskPad}`}
      >
        <div
          data-align-group={alignGroup}
          data-align-edge={alignMode === "left" ? "left" : undefined}
          data-align-from={alignMode === "page" ? "lg" : undefined}
          className="flex min-h-[44px] items-center gap-2"
        >
          {back}
          <div className="min-w-0 flex-1">
            {wordmark ? (
              <>
                {phoneStart ? (
                  <div className="lg:hidden">{phoneStart}</div>
                ) : (
                  <div aria-hidden="true" className={`font-display italic font-black ${compact ? "text-[21px]" : "text-xl"} uppercase tracking-tight lg:hidden`}>
                    H1T <span className="text-sky">MICRO</span>
                  </div>
                )}
                {title && (
                  <Title className="sr-only lg:not-sr-only m-0 font-display italic font-extrabold text-2xl lg:text-[32px] leading-tight uppercase tracking-tight">
                    {title}
                  </Title>
                )}
              </>
            ) : (
              title && (
                <Title title={typeof title === "string" ? title : undefined} className="m-0 break-words font-display italic font-extrabold text-2xl lg:text-[32px] leading-tight uppercase tracking-tight line-clamp-2">
                  {title}
                </Title>
              )
            )}
            {subtitle && (
              <div
                className={`m-0 mt-0.5 text-[13px] leading-snug text-muted-subtitle lg:text-sm lg:text-secondary ${
                  variant === "daily" ? "hidden lg:block" : ""
                }`}
              >
                {subtitle}
              </div>
            )}
          </div>

          {desktopStat ? <div className="hidden lg:flex">{desktopStat}</div> : null}

          {hasDateNav && (
            <div className="flex shrink-0 items-center lg:gap-1.5">
              <button type="button" onClick={onPrev} disabled={prevDisabled} aria-label="Ngày trước" data-tour="day-prev" className={DATE_BUTTON}>
                <Chevron dir="left" />
              </button>
              {onDateTap ? (
                <button
                  type="button"
                  onClick={onDateTap}
                  aria-haspopup="dialog"
                  aria-label={`Chọn ngày, ${dateLabel}`}
                  aria-busy={dateLabel ? undefined : true}
                  className="inline-flex min-h-[44px] min-w-[104px] items-center justify-center rounded-full border-0 bg-transparent px-1 text-center text-sm font-semibold tracking-tight text-on-dark cursor-pointer hover:text-sky focus-visible:outline-sky active:scale-[0.97] transition-press motion-reduce:active:scale-100 lg:hidden"
                >
                  {dateLabel || <span aria-hidden="true" className="inline-block h-5 w-[104px]" />}
                </button>
              ) : (
                <span className="inline-flex min-w-[104px] items-center justify-center text-center text-sm font-semibold tracking-tight lg:hidden">
                  {dateLabel || <span aria-hidden="true" className="inline-block h-5 w-[104px]" />}
                </span>
              )}
              <button type="button" onClick={onNext} disabled={nextDisabled} aria-label="Ngày sau" className={DATE_BUTTON}>
                <Chevron dir="right" />
              </button>
            </div>
          )}

          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>

        {progress && <StepBars current={progress.current} total={progress.total} tone="dark" />}
        {tabs}
        {search}
        {summary && (
          <div
            className={`w-full rounded-[18px] bg-surface-dark p-4 text-on-dark lg:bg-ink ${summaryPhoneOnly ? "lg:hidden" : ""}`}
          >
            {summary}
          </div>
        )}
        {footer}
      </div>
    </header>
  );
}
