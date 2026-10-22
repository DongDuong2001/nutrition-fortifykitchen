"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { SectionTitle } from "@/components/ui/section-title";
import { IconButton } from "@/components/ui/icon-button";

/**
 * A titled horizontal carousel: scroll-snap, the next card's edge stays visible, a real list. Children are
 * <li> cards (a fixed width, shrink-0 snap-start). It bleeds 16 px to the screen edge so cards slide under the gutter.
 * `action` is a link at the right of the title ("Xem tất cả").
 * Desktop parity (23/10): a mouse wheel scrolls the page, not the row, and the scrollbar is hidden, so from 1024 px two 44 px
 * buttons beside the title page the row (the click for the phone's swipe). They show only when the row overflows, and each is
 * off at its end. Phones keep the swipe alone (the buttons are lg-only).
 */
export function Carousel({ title, children, id, action }: { title: string; children: React.ReactNode; id?: string; action?: React.ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [ends, setEnds] = useState<{ start: boolean; end: boolean; overflow: boolean }>({ start: true, end: true, overflow: false });
  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEnds({ start: el.scrollLeft <= 1, end: el.scrollLeft >= max - 1, overflow: max > 1 });
  }, []);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);
  const page = (dir: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  const heading = (
    <SectionTitle as="h3" className="flex min-h-11 items-center">
      {title}
    </SectionTitle>
  );
  const arrows = ends.overflow ? (
    <div className="hidden items-center gap-1 lg:flex">
      <IconButton label={`${title}: xem trước`} tone="card" disabled={ends.start} onClick={() => page(-1)} className="disabled:cursor-default disabled:opacity-40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </IconButton>
      <IconButton label={`${title}: xem tiếp`} tone="card" disabled={ends.end} onClick={() => page(1)} className="disabled:cursor-default disabled:opacity-40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </IconButton>
    </div>
  ) : null;
  return (
    <section aria-label={title} id={id} data-tour={id} className="flex flex-col">
      {action || arrows ? (
        <div className="flex items-center justify-between gap-2">
          {heading}
          <div className="flex items-center gap-2">
            {action}
            {arrows}
          </div>
        </div>
      ) : (
        heading
      )}
      <ul
        ref={listRef}
        role="list"
        className="m-0 -mx-4 flex snap-x snap-mandatory list-none gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none]"
      >
        {children}
      </ul>
    </section>
  );
}
