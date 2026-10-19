import React from "react";
import Link from "next/link";
import { Carousel } from "@/components/ui/carousel";
import { FEATURED_COACHES } from "@/lib/coaches";
import { initialsOf } from "./coach-initials";

/** Khám phá: the featured coaches. The title comes from the Carousel; "Tất cả" opens the full list. */
export function CoachesCarousel() {
  return (
    <div className="relative">
      <Link
        href="/explore/coaches"
        className="absolute right-0 top-0 z-sticky flex min-h-11 items-center text-cap font-bold text-cobalt no-underline"
      >
        Tất cả ›
      </Link>

      <Carousel title="Huấn luyện viên tiêu biểu">
        {FEATURED_COACHES.map((c) => (
          <li key={c.id} className="w-[260px] shrink-0 snap-start">
            <Link
              href={`/explore/coaches/${c.id}`}
              className="flex h-full flex-col gap-3 rounded-card lg:shadow-card border border-card-border bg-card p-4 text-text no-underline hover:bg-surface"
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-callout font-bold text-cobalt"
                >
                  {initialsOf(c.name)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-callout font-bold leading-snug text-text">{c.name}</span>
                  <span className="text-cap leading-snug text-secondary">{c.title}</span>
                </span>
              </span>
              <span className="line-clamp-2 text-cap leading-snug text-secondary">{c.bio}</span>
              <span className="flex items-center justify-between gap-2 border-t border-divider pt-3 text-cap">
                {c.experienceYears ? <span className="text-secondary">{c.experienceYears} năm kinh nghiệm</span> : null}
                <span className="ml-auto font-bold text-cobalt">Xem hồ sơ ›</span>
              </span>
            </Link>
          </li>
        ))}
      </Carousel>
    </div>
  );
}
