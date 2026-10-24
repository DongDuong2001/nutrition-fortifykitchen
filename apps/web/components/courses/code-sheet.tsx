"use client";

import React, { useEffect, useRef, useState } from "react";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { StatePill } from "@/components/courses/course-tile";
import { cue } from "@/lib/cue";
import { codeCloseDelay } from "@/lib/course-moments";
import { haptic } from "@/lib/haptics";
import { dayMonth, tileBackground, type CourseDetail, type CourseSummary } from "@/lib/course-logic";
import { coursesErrorText, type CoursesApi } from "@/lib/courses";

const FIELD = "w-full rounded-xl border-0 bg-surface text-base text-text outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]";

/**
 * "Mã truy cập" for one course (design/courses CodeSheet, CodeError): the course's tile at the top, because one code opens only that
 * course, then one field checked on the server. A wrong, lapsed, revoked or other course's code gets the same line under the field
 * and stays in the field to be fixed.
 * feat/sound-goals §5b: the tile carries the library tile's state pill (lock and "Cần mã"). An accepted code swings the shackle open on that pill,
 * the word glides to "Đã mở" and the `save` cue plays; the sheet closes 450 ms later and `onOpened` runs as before. If the person closes the
 * sheet first, `onOpened` runs at once (D-MOT-03, nothing waits on a flourish). A wrong code keeps its line under the field and vibrates, no sound.
 */
export function CodeSheet({
  course,
  api,
  onClose,
  onOpened,
}: {
  course: CourseSummary | null;
  api: CoursesApi;
  onClose: () => void;
  onOpened: (course: CourseDetail) => void;
}) {
  // The sheet keeps drawing the last course while it slides out
  const [shown, setShown] = useState<CourseSummary | null>(course);
  if (course && course !== shown) setShown(course);
  // The code was accepted and the sheet has not closed yet: what it opened, and the timer that closes it
  const [accepted, setAccepted] = useState(false);
  const pending = useRef<{ detail: CourseDetail; at: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const finish = () => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    clearTimeout(p.timer);
    onOpened(p.detail);
  };
  const accept = (detail: CourseDetail) => {
    const at = performance.now();
    setAccepted(true);
    cue("save");
    pending.current = { detail, at, timer: setTimeout(finish, codeCloseDelay({ acceptedAt: at, now: at, closed: false })) };
  };
  useEffect(() => {
    if (course === null) setAccepted(false);
  }, [course]);
  useEffect(() => () => clearTimeout(pending.current?.timer), []);
  const close = () => {
    // Closed during the pause: what the code opened opens now
    const p = pending.current;
    if (p) setTimeout(finish, codeCloseDelay({ acceptedAt: p.at, now: performance.now(), closed: true }));
    onClose();
  };
  return (
    <Sheet open={course !== null} onClose={close} title="Mã truy cập" titleId="course-code-title" desktopDialog initialFocusId="course-code">
      {/* The form is the Sheet's child, so each opening starts blank */}
      {shown && <CodeForm course={shown} api={api} accepted={accepted} onAccepted={accept} />}
    </Sheet>
  );
}

function CodeForm({ course, api, accepted, onAccepted }: { course: CourseSummary; api: CoursesApi; accepted: boolean; onAccepted: (course: CourseDetail) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setError("Nhập mã truy cập");
      return;
    }
    setChecking(true);
    try {
      onAccepted(await api.open(course.id, value.trim()));
    } catch (err) {
      setError(coursesErrorText(err));
      haptic("error");
      setChecking(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
      <div className="flex flex-col gap-2 rounded-card p-4 text-on-accent" style={{ background: tileBackground(course.tone) }}>
        <StatePill course={course} unlocking={accepted} />
        <span className="font-display text-xl font-black italic leading-none">{course.title}</span>
        <span className="text-cap font-semibold">
          {course.lessonCount} bài · cập nhật {dayMonth(course.updatedAt)}
        </span>
      </div>
      <p className="m-0 text-callout leading-snug text-secondary">Một mã mở cả {course.lessonCount} bài của khóa này. Mã chỉ mở khóa học này, hết hạn sau 30 ngày.</p>
      <FormRow label="Mã truy cập" htmlFor="course-code" error={error}>
        <input
          id="course-code"
          type="text"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(undefined);
          }}
          aria-invalid={error ? true : undefined}
          className={`${FIELD} h-12 px-3 tracking-[0.08em] ${error ? "shadow-[inset_0_0_0_2px_var(--color-destructive)]" : ""}`}
        />
      </FormRow>
      <PillButton type="submit" disabled={checking || accepted} aria-disabled={checking || accepted}>
        {accepted ? "Đã mở" : checking ? "Đang kiểm tra…" : "Mở khóa"}
      </PillButton>
      {/* D-MOT-02: the pill's word changes and this line says it */}
      <p aria-live="polite" className="sr-only">
        {accepted ? `Đã mở khóa ${course.title}` : ""}
      </p>
    </form>
  );
}
