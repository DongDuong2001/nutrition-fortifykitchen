"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The scrolling part of the Hôm nay nutrient column. While more rows wait below, its bottom edge fades out, so a
 * row cut by the edge reads as "keep scrolling" and not as a half-drawn row above the "x/N đạt" block. At the end
 * of the list (or when everything fits) there is no fade.
 */
export function ColumnScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
      setScrollable(el.scrollHeight > el.clientHeight);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const fade = "linear-gradient(to bottom, #000 calc(100% - 28px), transparent)";
  return (
    <div
      ref={ref}
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable ? "region" : undefined}
      aria-label={scrollable ? "Danh sách vi chất" : undefined}
      data-fade={more ? "" : undefined}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      style={more ? { maskImage: fade, WebkitMaskImage: fade } : undefined}
    >
      {children}
    </div>
  );
}
