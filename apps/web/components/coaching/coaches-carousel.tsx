import React from "react";
import Link from "next/link";
import { Carousel } from "@/components/ui/carousel";
import { FEATURED_COACHES } from "@/lib/coaches";

export function CoachesCarousel() {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-secondary">
          Huấn luyện viên tiêu biểu
        </span>
        <Link
          href="/explore/coaches"
          className="text-xs font-semibold text-blue no-underline hover:underline py-1"
        >
          Tất cả &rsaquo;
        </Link>
      </div>

      <Carousel title="Huấn luyện viên tiêu biểu">
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
                className="flex flex-col gap-2.5 rounded-[18px] bg-card border border-card-border p-4 no-underline text-text hover:bg-page transition-colors"
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
      </Carousel>
    </div>
  );
}
