import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { CoachProfile } from "@/lib/coaches";

export function CoachCard({ coach }: { coach: CoachProfile }) {
  const initials = coach.name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <Card as="article" className="flex flex-col justify-between gap-3 p-4 transition-transform duration-150 active:scale-[0.98] motion-reduce:active:scale-100">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue/10 text-base font-extrabold text-blue border border-blue/20">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold text-text m-0">{coach.name}</h3>
            {coach.featured && (
              <span className="shrink-0 rounded-full bg-blue px-2 py-0.5 text-[11px] font-bold text-on-accent">
                Tiêu biểu
              </span>
            )}
          </div>
          <p className="m-0 truncate text-[13px] font-medium text-secondary">{coach.title}</p>
        </div>
      </div>

      <p className="m-0 line-clamp-2 text-[13px] leading-relaxed text-secondary">{coach.bio}</p>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {coach.specialties.slice(0, 2).map((s) => (
          <span
            key={s}
            className="rounded-full bg-page px-2.5 py-1 text-[11px] font-medium text-secondary border border-card-border"
          >
            {s}
          </span>
        ))}
        {coach.specialties.length > 2 && (
          <span className="rounded-full bg-page px-2 py-1 text-[11px] font-medium text-secondary">
            +{coach.specialties.length - 2}
          </span>
        )}
      </div>

      <div className="pt-2 border-t border-card-border/60">
        <Link
          href={`/explore/coaches/${coach.id}`}
          className="flex h-11 w-full items-center justify-center rounded-full bg-card border border-card-border px-4 text-[13px] font-bold text-text no-underline hover:bg-page transition-colors"
        >
          Xem hồ sơ & liên hệ
        </Link>
      </div>
    </Card>
  );
}
