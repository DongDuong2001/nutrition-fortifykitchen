"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatDayLabel } from "@/lib/format";
import { HOME_ROUTE } from "@/lib/home-route";
import { StepBars } from "@/components/ui/step-bars";
import { SyncStatus } from "@/components/sync/sync-status";

export type AppHeaderVariant = "daily" | "sub" | "tab";

export interface AppHeaderProps {
  /** "daily" screens move between days (date nav); "sub" and "tab" differ only in the default width. */
  variant?: AppHeaderVariant;
  /** The screen's name (Saira italic). One h1 per page. */
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
  /** With `wordmark`: right after the wordmark (the title from 1024 px), on the same row. The home screen's Level badge. */
  wordmarkAfter?: React.ReactNode;
  /** Desktop width: "narrow" (560 px column) or "wide" (left-aligned at the 32 px gutter). Daily defaults to wide. */
  layout?: "narrow" | "wide";
  /** Desktop: the page's main already has 32 px padding, so the header adds none. */
  flush?: boolean;
  /** Phone: a 52 px band (4 px above and below the 44 px row) and a 20 px wordmark. The home screen. */
  compact?: boolean;
  /** Phone: the date stepper moves to a second row and this sits at its right end (Hôm nay's "Ngày tập 60′ ›"). From 1024 px it sits before the stepper in the one row. */
  dateRow?: React.ReactNode;
  /** Push screens: drawn between Back and the title (V3-SPEC §3.2: a group's accent bar and 36 px tile, a nutrient's accent bar). */
  lead?: React.ReactNode;
  /** data-align-group attribute for alignment tests */
  alignGroup?: string;
  /** "page": the row shares both edges with the page body, checked from 1024 px (data-align-from="lg"); default: left edge only. */
  alignMode?: "left" | "page";
  className?: string;
}

/** The wordmark (or the title from 1024 px) and what follows it on one row; without `after`, the children as they were. */
function WordmarkRow({ after, children }: { after?: React.ReactNode; children: React.ReactNode }) {
  if (!after) return <>{children}</>;
  return (
    <div className="flex items-center gap-2">
      {children}
      {/* From 1024 px the 44 px control must not make the title's row taller (the title keeps its top on every screen) */}
      <span className="flex items-center lg:h-0">{after}</span>
    </div>
  );
}

/** V3-SPEC §4: Back and trailing actions are 44 px Liquid Glass circles on a phone; plain icon buttons from 1024 px. */
export const HEADER_ICON_BUTTON =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-text max-lg:glass no-underline cursor-pointer hover:text-cobalt active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-cobalt";
const DATE_BUTTON =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-text cursor-pointer hover:text-cobalt active:scale-[0.97] transition-press motion-reduce:active:scale-100 disabled:pointer-events-none disabled:cursor-default disabled:text-secondary disabled:opacity-50 lg:border lg:border-card-border lg:bg-card lg:text-ink lg:hover:bg-divider lg:hover:text-ink lg:disabled:text-secondary focus-visible:outline-cobalt";

/**
 * cc-72: the calendar beside the date (the icon set's Calendar path, drawn here like the chevrons: the header is on every
 * screen, and importing the icon module would put the whole icon set in every route's first load).
 */
export function CalendarGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-testid="date-calendar-icon">
      <path d="M16.5 5V3m-9 2V3M3.25 8h17.5M3 10.044c0-2.115 0-3.173.436-3.981a3.9 3.9 0 0 1 1.748-1.651C6.04 4 7.16 4 9.4 4h5.2c2.24 0 3.36 0 4.216.412.753.362 1.364.94 1.748 1.65.436.81.436 1.868.436 3.983v4.912c0 2.115 0 3.173-.436 3.981a3.9 3.9 0 0 1-1.748 1.651C17.96 21 16.84 21 14.6 21H9.4c-2.24 0-3.36 0-4.216-.412a3.9 3.9 0 0 1-1.748-1.65C3 18.128 3 17.07 3 14.955z" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

/**
 * The one header of H1T MICRO (V3-SPEC §3.1–3.3; the brief's ScreenHeader). No ink slab: it sits on the grey page.
 * - Tab roots (variant "tab"): a 34 px Saira italic large title, controls under it (search, sub-tabs, period).
 * - Push screens ("sub"): one row with the 44 px glass Back circle, the 28 px title 12 px after it (24 px when it is
 *   long, two lines at most), then the trailing actions; the subtitle sits under the title, aligned to it. A 24 px
 *   fade from the page colour sits at the top, under the floating circles.
 * - Hôm nay ("daily"): the wordmark, the date stepper and the actions.
 * Desktop (>= 1024 px): the same row on the page (Saira 32), ink only in the summary card. One DOM, one h1.
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
  wordmarkAfter,
  layout,
  flush = false,
  compact = false,
  dateRow,
  lead,
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
  const showSync = variant !== "sub" && Title === "h1";
  const prevDisabled = !onPrev;
  const nextDisabled = !onNext || canGoNext === false || (canGoNext === undefined && dateLabel.startsWith("Hôm nay"));

  // fix/training-close-motion: a header's back link is a push to the parent (Hôm nay for Ngày tập and Đủ 22 vi chất), which
  // lib/nav-direction would play as a tab change, with no slide. The mark makes it play the Back slide (the push in reverse). It
  // stays a link: going Back in the history instead could land on a form the in-app history only took for the parent.
  const backLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    document.documentElement.dataset.navBack = "1";
  };

  const back = backHref ? (
    <Link href={backHref} onClick={backLink} aria-label={backLabel} className={HEADER_ICON_BUTTON}>
      <Chevron dir="left" />
    </Link>
  ) : onBack ? (
    <button type="button" onClick={onBack} aria-label={backLabel} className={HEADER_ICON_BUTTON}>
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
  // V3 push screens: 8 px above the Back row and nothing under the header (the page's own 16 px follows), as on the boards
  const phonePad = compact
    ? "pt-[max(4px,env(safe-area-inset-top))] pb-1"
    : back
      ? "pt-[max(8px,env(safe-area-inset-top))] pb-0"
      : "pt-[max(12px,env(safe-area-inset-top))] pb-4";

  return (
    <header
      className={`relative w-full flex-none select-none bg-page text-text ${variant === "tab" || variant === "daily" ? "max-lg:bg-transparent" : ""} ${className}`}
    >
      {back && <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-sticky h-6 bg-linear-to-b from-page to-transparent lg:hidden" />}
      <div
        className={`flex w-full flex-col gap-3 ${phonePad} box-border ${column} ${deskPad}`}
      >
        <div
          data-align-group={alignGroup}
          data-align-edge={alignMode === "left" ? "left" : undefined}
          data-align-from={alignMode === "page" ? "lg" : undefined}
          className={`group/hdr flex min-h-11 gap-3 ${back ? "items-start" : "items-center"} ${dateRow ? "max-lg:grid max-lg:grid-cols-[minmax(0,1fr)_auto] max-lg:gap-x-2 max-lg:gap-y-0" : ""}`}
        >
          {back}
          {lead && <div className="flex min-h-11 shrink-0 items-center gap-3">{lead}</div>}
          {/* The phone wordmark is a logo: it never shrinks or wraps; at large text sizes the date gives way instead. While the sync status
              has something to say (Chưa lưu, Ngoại tuyến) the row has no room for both on a phone: the logo steps aside, so the status
              never lands on the day arrows (hotfix 20/10). The page title (sr-only on a phone) is not hidden with them: it stays in the
              accessibility tree, so the page keeps its h1 */}
          <div className={`min-w-0 flex-1 ${dateRow ? "max-lg:col-start-1 max-lg:row-start-1" : ""} ${wordmark ? "max-lg:min-w-fit group-has-[[data-sync-state=unsaved],[data-sync-state=offline]]/hdr:max-lg:min-w-0 group-has-[[data-sync-state=unsaved],[data-sync-state=offline]]/hdr:max-lg:*:not-data-sr-title:hidden" : ""}`}>
            {wordmark ? (
              <WordmarkRow after={wordmarkAfter}>
                {phoneStart ? (
                  <div className="lg:hidden">{phoneStart}</div>
                ) : (
                  // The wordmark is the way back to Hôm nay from any screen that shows it (Hao, 20/10)
                  <Link
                    href={HOME_ROUTE}
                    aria-label="H1T MICRO, về Hôm nay"
                    data-tour="home-logo"
                    className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-md font-display italic font-black text-text no-underline ${compact ? "text-[20px]" : "text-[20px] leading-[28px]"} uppercase tracking-tight active:scale-[0.97] transition-press motion-reduce:active:scale-100 lg:hidden`}
                  >
                    <span aria-hidden="true">
                      H1T <span className="text-cobalt">MICRO</span>
                    </span>
                  </Link>
                )}
                {title && (
                  <Title data-sr-title="" className="sr-only lg:not-sr-only m-0 font-display italic font-extrabold text-2xl lg:text-display-sm leading-tight uppercase tracking-display">
                    {title}
                  </Title>
                )}
              </WordmarkRow>
            ) : (
              title && (
                <div className={back ? "flex min-h-11 items-center" : undefined}>
                  <Title
                    title={typeof title === "string" ? title : undefined}
                    // Saira's marks (Ụ, Ề, dấu nặng) and the slant of the italic reach past the line box, which the clamp cuts: 0.2em of padding above and
                    // below and 0.15em on the right keep them, and the same negative margins leave the layout where it was
                    className={`-my-[0.2em] -mr-[0.15em] break-words py-[0.2em] pr-[0.15em] font-display italic font-extrabold leading-tight uppercase tracking-display line-clamp-2 lg:text-display-sm ${
                      back ? (typeof title === "string" && title.length > 18 ? "text-2xl" : "text-headline") : variant === "tab" ? "text-display" : "text-2xl"
                    }`}
                  >
                    {title}
                  </Title>
                </div>
              )
            )}
            {subtitle && (
              <div
                className={`m-0 mt-0.5 text-callout leading-snug text-secondary lg:text-sm ${
                  variant === "daily" ? "hidden lg:block" : ""
                }`}
              >
                {subtitle}
              </div>
            )}
          </div>

          {desktopStat ? <div className="hidden lg:flex">{desktopStat}</div> : null}

          {dateRow && <div className="flex min-w-0 items-center max-lg:col-start-2 max-lg:row-start-2 max-lg:justify-self-end lg:shrink-0">{dateRow}</div>}

          {hasDateNav && (
            <div className={`flex min-w-0 items-center lg:shrink-0 lg:gap-1.5 ${dateRow ? "max-lg:col-start-1 max-lg:row-start-2 max-lg:-ml-3" : ""}`}>
              <button type="button" onClick={onPrev} disabled={prevDisabled} aria-label="Ngày trước" data-tour="day-prev" data-testid="day-prev" className={DATE_BUTTON}>
                <Chevron dir="left" />
              </button>
              {onDateTap ? (
                <button
                  type="button"
                  onClick={onDateTap}
                  aria-haspopup="dialog"
                  aria-label={`Chọn ngày, ${dateLabel}`}
                  data-tour="day-date"
                  aria-busy={dateLabel ? undefined : true}
                  className="inline-flex min-h-11 min-w-[76px] shrink items-center justify-center rounded-full border-0 bg-transparent px-1 text-center text-body-lg font-bold leading-tight tracking-tight text-text cursor-pointer hover:text-cobalt focus-visible:outline-cobalt active:scale-[0.97] transition-press motion-reduce:active:scale-100 lg:hidden"
                >
                  {dateLabel ? (
                    // cc-72: the calendar glyph says the date opens the calendar (the date stays the one control)
                    // At large text sizes the label wraps before its last word, which keeps the glyph
                    <span>
                      {dateLabel.slice(0, dateLabel.lastIndexOf(" ") + 1)}
                      <span className="inline-flex items-center gap-1 whitespace-nowrap align-top">
                        {dateLabel.slice(dateLabel.lastIndexOf(" ") + 1)}
                        <CalendarGlyph size={16} />
                      </span>
                    </span>
                  ) : (
                    <span aria-hidden="true" className="inline-block h-5 w-[76px]" />
                  )}
                </button>
              ) : (
                <span className="inline-flex min-w-[76px] items-center justify-center text-center text-sm font-semibold tracking-tight lg:hidden">
                  {dateLabel || <span aria-hidden="true" className="inline-block h-5 w-[76px]" />}
                </span>
              )}
              <button type="button" onClick={onNext} disabled={nextDisabled} aria-label="Ngày sau" data-testid="day-next" className={DATE_BUTTON}>
                <Chevron dir="right" />
              </button>
            </div>
          )}

          {/* cc-68 (S13): the one sync status sits in the header of every tab (not a sub-screen, not the picture behind /add) */}
          {actions || showSync ? (
            <div className={`flex shrink-0 items-center gap-2 ${dateRow ? "max-lg:col-start-2 max-lg:row-start-1 max-lg:justify-self-end" : ""}`}>
              {showSync && <SyncStatus />}
              {actions}
            </div>
          ) : null}
        </div>

        {progress && <StepBars current={progress.current} total={progress.total} tone="light" />}
        {tabs}
        {search}
        {summary && (
          <div
            className={`w-full rounded-card bg-ink p-4 text-on-dark ${summaryPhoneOnly ? "lg:hidden" : ""}`}
          >
            {summary}
          </div>
        )}
        {footer}
      </div>
    </header>
  );
}
