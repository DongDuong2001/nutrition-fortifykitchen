"use client";

import React, { useState } from "react";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { COURSE_TONES, pairBackground, type CourseAccess, type CourseSummary } from "@/lib/course-logic";
import { coursesErrorText, type CourseInput, type CoursesApi } from "@/lib/courses";
import { CheckGlyph } from "@/components/courses/course-glyphs";

const FIELD = "w-full rounded-xl border-0 bg-surface text-base text-text outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]";

const ACCESS: { key: CourseAccess; label: string; hint: string }[] = [
  { key: "open", label: "Mọi người", hint: "Ai đăng nhập cũng mở được." },
  { key: "code", label: "Cần mã", hint: "Học viên nhập mã bạn gửi. Một mã mở cả khóa, dùng 30 ngày." },
  { key: "level", label: "Theo Level", hint: "Mở khi Level của học viên đạt mức bạn chọn." },
];

/**
 * The coach's sheet for one course: "Khóa mới" or "Sửa khóa" (design/courses CoachCourse, "Sửa khóa"). Name, the line under it,
 * one of the eight colours, and who may open it. Editing also deletes the course, after one more tap.
 */
export function CourseSheet({
  open,
  course,
  api,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  /** The course being edited, or null for a new one. */
  course: CourseSummary | null;
  api: CoursesApi;
  onClose: () => void;
  onSaved: (course: CourseSummary) => void;
  onDeleted?: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={course ? "Sửa khóa" : "Khóa mới"} titleId="course-edit-title" desktopDialog initialFocusId="course-title">
      <CourseForm course={course} api={api} onSaved={onSaved} onDeleted={onDeleted} />
    </Sheet>
  );
}

function CourseForm({ course, api, onSaved, onDeleted }: { course: CourseSummary | null; api: CoursesApi; onSaved: (c: CourseSummary) => void; onDeleted?: () => void }) {
  const [title, setTitle] = useState(course?.title ?? "");
  const [subtitle, setSubtitle] = useState(course?.subtitle ?? "");
  const [tone, setTone] = useState(course?.tone ?? 0);
  const [access, setAccess] = useState<CourseAccess>(course?.access ?? "open");
  const [minLevel, setMinLevel] = useState(course?.minLevel ?? 2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [sure, setSure] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Nhập tên khóa");
      return;
    }
    setBusy(true);
    setError(undefined);
    const input: CourseInput = { title, subtitle, tone, access, ...(access === "level" ? { minLevel } : {}) };
    try {
      onSaved(course ? await api.updateCourse(course.id, input) : await api.createCourse(input));
    } catch (err) {
      setError(coursesErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!course) return;
    setBusy(true);
    try {
      await api.deleteCourse(course.id);
      onDeleted?.();
    } catch (err) {
      setError(coursesErrorText(err));
      setSure(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
      <FormRow label="Tên khóa" htmlFor="course-title" error={error}>
        <input id="course-title" type="text" autoComplete="off" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} className={`${FIELD} h-12 px-3`} />
      </FormRow>
      <FormRow label="Dòng dưới tên" htmlFor="course-subtitle" hint="Ví dụ: HLV Lê Hồng Khánh">
        <input id="course-subtitle" type="text" autoComplete="off" maxLength={200} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={`${FIELD} h-12 px-3`} />
      </FormRow>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-cap font-semibold text-text">Màu của khóa</legend>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Màu của khóa">
          {COURSE_TONES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={tone === i}
              aria-label={`Màu ${i + 1}`}
              onClick={() => setTone(i)}
              className="m-hover flex h-11 cursor-pointer items-center justify-center rounded-xl border-0 p-0 text-on-accent transition-press active:scale-[0.97] motion-reduce:active:scale-100"
              style={{ background: pairBackground(i) }}
            >
              {tone === i && <CheckGlyph />}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-cap font-semibold text-text">Ai mở được</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Ai mở được">
          {ACCESS.map((a) => (
            <button
              key={a.key}
              type="button"
              role="radio"
              aria-checked={access === a.key}
              onClick={() => setAccess(a.key)}
              className={`min-h-11 cursor-pointer rounded-full border-0 text-cap transition-press active:scale-[0.97] motion-reduce:active:scale-100 ${access === a.key ? "bg-ink font-bold text-on-dark" : "bg-surface font-semibold text-text"}`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <p className="m-0 text-cap leading-snug text-secondary">{ACCESS.find((a) => a.key === access)?.hint}</p>
        {access === "level" && (
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Level thấp nhất">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={minLevel === n}
                aria-label={`Level ${n}`}
                onClick={() => setMinLevel(n)}
                className={`min-h-11 cursor-pointer rounded-full border-0 text-callout tabular-nums transition-press active:scale-[0.97] motion-reduce:active:scale-100 ${minLevel === n ? "bg-ink font-bold text-on-dark" : "bg-surface font-semibold text-text"}`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <PillButton type="submit" disabled={busy} aria-disabled={busy}>
        {busy ? "Đang lưu…" : course ? "Lưu" : "Tạo khóa"}
      </PillButton>

      {course &&
        (sure ? (
          <div className="flex flex-col gap-2 rounded-card bg-surface p-4">
            <p className="m-0 text-callout leading-snug">Xóa khóa này? Các phần, bài, mã và tiến độ của học viên đều mất.</p>
            <div className="grid grid-cols-2 gap-2">
              <PillButton type="button" size="md" variant="tertiary" onClick={() => setSure(false)}>
                Hủy
              </PillButton>
              <PillButton type="button" size="md" variant="danger" onClick={() => void remove()} disabled={busy}>
                Xóa khóa
              </PillButton>
            </div>
          </div>
        ) : (
          <PillButton type="button" size="md" variant="tertiary" onClick={() => setSure(true)}>
            Xóa khóa
          </PillButton>
        ))}
    </form>
  );
}
