"use client";

import React, { useState } from "react";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { dayMonth, tileBackground, type CourseDetail, type CourseSummary } from "@/lib/course-logic";
import { coursesErrorText, type CoursesApi } from "@/lib/courses";

const FIELD = "w-full rounded-xl border-0 bg-surface text-base text-text outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]";

/**
 * "Mã truy cập" for one course (design/courses CodeSheet, CodeError): the course's tile at the top, because one code opens only that
 * course, then one field checked on the server. A wrong, lapsed, revoked or other course's code gets the same line under the field
 * and stays in the field to be fixed.
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
  return (
    <Sheet open={course !== null} onClose={onClose} title="Mã truy cập" titleId="course-code-title" desktopDialog initialFocusId="course-code">
      {/* The form is the Sheet's child, so each opening starts blank */}
      {shown && <CodeForm course={shown} api={api} onOpened={onOpened} />}
    </Sheet>
  );
}

function CodeForm({ course, api, onOpened }: { course: CourseSummary; api: CoursesApi; onOpened: (course: CourseDetail) => void }) {
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
      onOpened(await api.open(course.id, value.trim()));
    } catch (err) {
      setError(coursesErrorText(err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
      <div className="flex flex-col gap-1 rounded-card p-4 text-on-accent" style={{ background: tileBackground(course.tone) }}>
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
      <PillButton type="submit" disabled={checking} aria-disabled={checking}>
        {checking ? "Đang kiểm tra…" : "Mở khóa"}
      </PillButton>
    </form>
  );
}
