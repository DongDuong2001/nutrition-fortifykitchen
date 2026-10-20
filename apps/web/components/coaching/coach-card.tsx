import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { CoachProfile } from "@/lib/coaches";
import { initialsOf } from "./coach-initials";

/** One coach in the directory: name, title, two lines of bio, the first two specialties, one link to the profile. */
export function CoachCard({ coach }: { coach: CoachProfile }) {
  return (
    <Card as="article" aria-label={coach.name} data-align-group="coach-card" className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-base font-bold text-cobalt"
        >
          {initialsOf(coach.name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-base font-bold leading-snug text-text">{coach.name}</h2>
            {coach.featured && (
              <span className="shrink-0 rounded-full bg-cobalt px-2 py-0.5 text-micro font-bold text-on-accent">
                Tiêu biểu
              </span>
            )}
          </span>
          <p className="m-0 text-cap leading-snug text-secondary">{coach.title}</p>
        </div>
      </div>

      <p className="m-0 line-clamp-2 text-cap leading-snug text-secondary">{coach.bio}</p>

      <ul role="list" aria-label="Lĩnh vực chuyên môn" className="m-0 flex list-none flex-wrap gap-2 p-0">
        {coach.specialties.slice(0, 2).map((s) => (
          <li key={s} className="rounded-full border border-card-border bg-surface px-3 py-1 text-cap text-secondary">
            {s}
          </li>
        ))}
        {coach.specialties.length > 2 && (
          <li className="rounded-full bg-surface px-3 py-1 text-cap text-secondary">
            +{coach.specialties.length - 2} lĩnh vực
          </li>
        )}
      </ul>

      <Link
        href={`/explore/coaches/${coach.id}`}
        className="flex min-h-11 w-full items-center justify-center rounded-full border border-card-border bg-card px-4 text-cap font-bold text-text no-underline hover:bg-surface hover:text-text"
      >
        Xem hồ sơ và liên hệ
      </Link>
    </Card>
  );
}
