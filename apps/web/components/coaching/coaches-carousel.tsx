import React from "react";
import Link from "next/link";
import { SectionTitle } from "@/components/ui/section-title";
import { FEATURED_COACHES } from "@/lib/coaches";

export function CoachesCarousel() {
  return (
    <section aria-label="Huấn luyện viên tiêu biểu" className="flex flex-col">
      <div className="flex min-h-[44px] items-center justify-between">
        <SectionTitle as="h3" className="flex items-center">
          Huấn luyện viên tiêu biểu
        </SectionTitle>
        <Link
          href="/explore/coaches"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-end text-xs font-semibold text-blue no-underline hover:underline px-2 py-1"
        >
          Tất cả &rsaquo;
        </Link>
      </div>

      <ul
        role="list"
        className="m-0 -mx-4 flex snap-x snap-mandatory list-none gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none]"
      >
        {FEATURED_COACHES.map((c) => {
          const initials = c.name
            .split(" ")
            .map((w) => w[0])
            .slice(-2)
            .join("")
            .toUpperCase();

          return (
            <li key={c.id} className="w-[260px] shrink-0 snap-start">
              <Link
                href={`/explore/coaches/${c.id}`}
                className="flex flex-col gap-2 rounded-[18px] bg-card border border-card-border p-4 no-underline text-text hover:bg-page transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue/10 text-sm font-extrabold text-blue border border-blue/20">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-text">{c.name}</span>
                    <span className="block truncate text-xs text-secondary">{c.title}</span>
                  </div>
                </div>

                <p className="m-0 line-clamp-2 text-xs leading-relaxed text-secondary">{c.bio}</p>

                <div className="flex items-center justify-between pt-1 border-t border-card-border/60 text-[11px] font-medium text-secondary">
                  <span>{c.experienceYears} năm KN</span>
                  <span className="font-semibold text-blue">Xem hồ sơ &rsaquo;</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

