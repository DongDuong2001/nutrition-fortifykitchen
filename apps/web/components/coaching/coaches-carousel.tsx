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
        className="absolute right-0 top-0 z-10 flex min-h-11 items-center text-[13px] font-bold text-blue no-underline"
      >
        Tất cả ›
      </Link>

      <Carousel title="Huấn luyện viên tiêu biểu">
        {FEATURED_COACHES.map((c) => (
          <li key={c.id} className="w-[260px] shrink-0 snap-start">
            <Link
              href={`/explore/coaches/${c.id}`}
              className="flex h-full flex-col gap-3 rounded-[18px] border border-card-border bg-card p-4 text-text no-underline hover:bg-page"
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-page text-[15px] font-bold text-blue"
                >
                  {initialsOf(c.name)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-bold leading-snug text-text">{c.name}</span>
                  <span className="text-[13px] leading-snug text-secondary">{c.title}</span>
                </span>
              </span>
              <span className="line-clamp-2 text-[13px] leading-snug text-secondary">{c.bio}</span>
              <span className="flex items-center justify-between gap-2 border-t border-divider pt-3 text-[13px]">
                <span className="text-secondary">{c.experienceYears} năm kinh nghiệm</span>
                <span className="font-bold text-blue">Xem hồ sơ ›</span>
              </span>
            </Link>
          </li>
        ))}
      </Carousel>
    </div>
  );
}
