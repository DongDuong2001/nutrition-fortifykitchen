"use client";

import React from "react";
import Link from "next/link";
import { LevelBadge } from "@/components/profile/level-badge";
import { toLevel } from "@/lib/coaching-link";
import { dayMonth, progressText, segmentsOn, tileBackground, type CourseSummary } from "@/lib/course-logic";
import { LockGlyph, OpenGlyph } from "@/components/courses/course-glyphs";

/** UI-RULES §6: 10 slanted segments (skewX −14°, 4 px apart), white filled and white 30 % empty, on a coloured tile. */
export function ProgressSegments({ done, total }: { done: number; total: number }) {
  const on = segmentsOn(done, total);
  return (
    <span aria-hidden="true" className="flex h-2 gap-1 px-0.5" data-segments={on}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`flex-1 -skew-x-[14deg] rounded-xs ${i < on ? "bg-on-accent" : "bg-on-accent/30"}`} />
      ))}
    </span>
  );
}

/** What the state pill of a tile says. A word and a glyph, never colour alone (D-COL-04). */
export function stateOf(c: CourseSummary): "code" | "level" | "done" | "learning" | "open" {
  if (!c.unlocked) return c.lock === "level" ? "level" : "code";
  if (c.lessonCount > 0 && c.doneCount >= c.lessonCount) return "done";
  return c.doneCount > 0 ? "learning" : "open";
}

const STATE_WORDS = { code: "Cần mã", level: "Mở ở", done: "Xong", learning: "Đang học", open: "Đã mở" } as const;

const PILL = "inline-flex h-7 items-center gap-1 self-start whitespace-nowrap rounded-full bg-ink/20 px-2.5 text-cap font-semibold text-on-accent";

/** `simple`: an open course says only "Đã mở" (the Khám phá carousel), not how far the user is. */
export function StatePill({ course, simple = false, className = "" }: { course: CourseSummary; simple?: boolean; className?: string }) {
  const state = stateOf(course);
  const shown = simple && state !== "code" && state !== "level" ? "open" : state;
  return (
    <span className={`${PILL} ${className}`}>
      {shown === "code" || shown === "level" ? <LockGlyph /> : <OpenGlyph />}
      {STATE_WORDS[shown]}
      {/* The badge is the Level tag at pill size (13 px text, 20 px high), as the design board */}
      {shown === "level" && <LevelBadge level={toLevel(course.minLevel)} className="px-1.5! py-0.5! text-cap!" />}
    </span>
  );
}

/** The words a screen reader gets for a tile, so the lock and the progress are heard, not only seen. */
export function tileLabel(c: CourseSummary): string {
  const state = stateOf(c);
  const where =
    state === "code" ? "cần mã" : state === "level" ? `mở khi bạn lên Level ${c.minLevel ?? 1}` : `đã học ${c.doneCount} trên ${c.lessonCount}`;
  return `${c.title}, ${c.lessonCount} bài, ${where}`;
}

const TILE = "m-hover flex flex-col justify-between gap-3 rounded-card p-4 text-left text-on-accent no-underline transition-press active:scale-[0.97] motion-reduce:active:scale-100";

/**
 * A course as a tile of the "Món giàu vi chất" pattern: its gradient pair under the 12 % shade, the state pill, the Saira title and
 * the line under it. `wide` is the newest course on the library (bigger title, "cập nhật"), `card` the Khám phá carousel's (200 px).
 * A course the user cannot open yet is a button: the screen decides what its tap does (the code sheet, or a word about the Level).
 */
export function CourseTile({
  course,
  size = "grid",
  isNew = false,
  onLocked,
  onTap,
}: {
  course: CourseSummary;
  size?: "wide" | "grid" | "card";
  isNew?: boolean;
  /** The tap on a tile that is still shut. */
  onLocked?: (course: CourseSummary) => void;
  /** Runs on the tap of an open tile before it navigates (a tour or tip marks itself used). */
  onTap?: () => void;
}) {
  const open = course.unlocked;
  const shown = stateOf(course);
  const meta =
    size === "wide"
      ? `${course.lessonCount} bài · cập nhật ${dayMonth(course.updatedAt)}`
      : size === "card"
        ? `${course.lessonCount} bài${isNew ? " · mới" : ""}`
        : open
          ? progressText(course.doneCount, course.lessonCount)
          : `${course.lessonCount} bài`;
  const withProgress = open && size !== "card";
  const body = (
    <>
      <span className="flex items-start gap-2">
        {isNew && size === "wide" && <span className="inline-flex h-7 items-center rounded-full bg-card px-2.5 text-cap font-bold text-cobalt">Mới</span>}
        <StatePill course={course} simple={size === "card"} />
      </span>
      <span className="flex flex-col gap-2">
        <span className="flex flex-col gap-1">
          <span className={`font-display font-black italic leading-none tracking-[-0.01em] ${size === "wide" ? "text-title" : "text-xl"}`}>{course.title}</span>
          <span className="text-cap font-semibold">{meta}</span>
        </span>
        {withProgress && shown !== "open" && <ProgressSegments done={course.doneCount} total={course.lessonCount} />}
      </span>
    </>
  );
  const cls = `${TILE} ${size === "wide" ? "min-h-[152px]" : size === "card" ? "h-full min-h-[136px]" : "min-h-[152px]"}`;
  const style = { background: tileBackground(course.tone) };
  const label = tileLabel(course);
  if (!open) {
    return (
      <button type="button" aria-label={label} onClick={() => onLocked?.(course)} className={`${cls} w-full cursor-pointer border-0`} style={style} data-course={course.id} data-lock={course.lock}>
        {body}
      </button>
    );
  }
  return (
    <Link href={`/explore/documents/${course.id}`} aria-label={label} onClick={onTap} className={cls} style={style} data-course={course.id}>
      {body}
    </Link>
  );
}
