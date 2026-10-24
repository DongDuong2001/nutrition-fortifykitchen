"use client";

import React, { useState } from "react";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import type { CourseDetail } from "@/lib/course-logic";
import { coursesErrorText, type CoursesApi } from "@/lib/courses";

/** What the ⋯ was tapped on: a part, or a lesson (with the part it sits in). */
export type ManageTarget = { kind: "part"; partId: string } | { kind: "lesson"; partId: string; lessonId: string };

const FIELD = "w-full rounded-xl border-0 bg-surface text-base text-text outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]";
const ROW = "m-tint flex min-h-12 w-full cursor-pointer items-center border-0 bg-transparent px-0 text-left text-body-lg transition-press disabled:cursor-default disabled:opacity-40";
const INK = "text-text";
const DANGER = "text-destructive-text";

/** The array with the item at `from` moved by `by` places, or null at the edge. */
export function moved<T>(items: T[], from: number, by: -1 | 1): T[] | null {
  const to = from + by;
  if (from < 0 || to < 0 || to >= items.length) return null;
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

type Step = "menu" | "rename" | "move" | "confirm";

/**
 * The ⋯ menu of a part or a lesson in the coach's view (design/courses CoachCourse): Đổi tên, Lên trên, Xuống dưới, Xóa, and for a
 * lesson Chuyển sang phần…. Reordering is two taps, never a drag (D-CTL-09). Delete asks once more.
 */
export function ManageSheet({
  target,
  course,
  api,
  onClose,
  onChanged,
}: {
  target: ManageTarget | null;
  course: CourseDetail;
  api: CoursesApi;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const [shown, setShown] = useState<ManageTarget | null>(target);
  if (target && target !== shown) setShown(target);
  const part = course.parts.find((p) => p.id === shown?.partId);
  const lesson = shown?.kind === "lesson" ? part?.lessons.find((l) => l.id === shown.lessonId) : undefined;
  const title = !shown ? "" : shown.kind === "part" ? (part?.title ?? "Phần") : (lesson?.title ?? "Bài");
  return (
    <Sheet open={target !== null} onClose={onClose} title={title} titleId="course-manage-title" desktopDialog>
      {shown && part && (shown.kind === "part" || lesson) && <ManageBody key={`${shown.kind}:${shown.partId}:${shown.kind === "lesson" ? shown.lessonId : ""}`} target={shown} course={course} api={api} onChanged={onChanged} />}
    </Sheet>
  );
}

function ManageBody({ target, course, api, onChanged }: { target: ManageTarget; course: CourseDetail; api: CoursesApi; onChanged: (message: string) => void }) {
  const [step, setStep] = useState<Step>("menu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const partAt = course.parts.findIndex((p) => p.id === target.partId);
  const part = course.parts[partAt];
  const lessonAt = target.kind === "lesson" ? part.lessons.findIndex((l) => l.id === target.lessonId) : -1;
  const name = target.kind === "part" ? part.title : part.lessons[lessonAt].title;
  const [text, setText] = useState(name);

  const run = async (job: () => Promise<void>, done: string) => {
    setBusy(true);
    setError(undefined);
    try {
      await job();
      onChanged(done);
    } catch (err) {
      setError(coursesErrorText(err));
      setBusy(false);
    }
  };

  const shift = (by: -1 | 1) => {
    if (target.kind === "part") {
      const next = moved(course.parts.map((p) => p.id), partAt, by);
      if (next) void run(() => api.reorderParts(course.id, next), "Đã đổi thứ tự");
    } else {
      const next = moved(part.lessons.map((l) => l.id), lessonAt, by);
      if (next) void run(() => api.reorderLessons(course.id, part.id, next), "Đã đổi thứ tự");
    }
  };
  const at = target.kind === "part" ? partAt : lessonAt;
  const size = target.kind === "part" ? course.parts.length : part.lessons.length;

  if (step === "rename") {
    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!text.trim()) return setError("Nhập tên");
      void run(() => (target.kind === "part" ? api.renamePart(course.id, part.id, text) : api.updateLesson(course.id, target.lessonId, { title: text })), "Đã đổi tên");
    };
    return (
      <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
        <FormRow label={target.kind === "part" ? "Tên phần" : "Tên bài"} htmlFor="course-rename" error={error}>
          <input id="course-rename" autoFocus type="text" autoComplete="off" maxLength={100} value={text} onChange={(e) => setText(e.target.value)} className={`${FIELD} h-12 px-3`} />
        </FormRow>
        <PillButton type="submit" disabled={busy} aria-disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu"}
        </PillButton>
      </form>
    );
  }

  if (step === "move" && target.kind === "lesson") {
    return (
      <div className="flex flex-col pt-2">
        <p className="m-0 pb-2 text-callout leading-snug text-secondary">Chuyển bài này sang phần nào? Bài nằm cuối phần đó.</p>
        {course.parts
          .filter((p) => p.id !== part.id)
          .map((p, i) => (
            <button key={p.id} type="button" disabled={busy} onClick={() => void run(() => api.updateLesson(course.id, target.lessonId, { partId: p.id }), `Đã chuyển sang ${p.title}`)} className={`${ROW} ${INK} ${i > 0 ? "border-t border-divider" : ""}`}>
              {p.title}
            </button>
          ))}
        {error && <p role="alert" className="m-0 pt-2 text-xs font-semibold text-destructive-text">{error}</p>}
      </div>
    );
  }

  if (step === "confirm") {
    const what = target.kind === "part" ? `Xóa phần này? ${part.lessons.length} bài trong phần cũng mất, cùng tiến độ của học viên.` : "Xóa bài này? Tiến độ của học viên ở bài này cũng mất.";
    return (
      <div className="flex flex-col gap-3 pt-2">
        <p className="m-0 text-callout leading-snug">{what}</p>
        {error && <p role="alert" className="m-0 text-xs font-semibold text-destructive-text">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <PillButton type="button" size="md" variant="tertiary" onClick={() => setStep("menu")}>
            Hủy
          </PillButton>
          <PillButton
            type="button"
            size="md"
            variant="danger"
            disabled={busy}
            onClick={() => void run(() => (target.kind === "part" ? api.deletePart(course.id, part.id) : api.deleteLesson(course.id, target.lessonId)), target.kind === "part" ? "Đã xóa phần" : "Đã xóa bài")}
          >
            {target.kind === "part" ? "Xóa phần" : "Xóa bài"}
          </PillButton>
        </div>
      </div>
    );
  }

  const noun = target.kind === "part" ? "phần" : "";
  return (
    <div className="flex flex-col pt-2">
      <button type="button" className={`${ROW} ${INK}`} onClick={() => setStep("rename")}>
        {target.kind === "part" ? "Đổi tên phần" : "Đổi tên"}
      </button>
      {target.kind === "lesson" && course.parts.length > 1 && (
        <button type="button" className={`${ROW} ${INK} border-t border-divider`} onClick={() => setStep("move")}>
          Chuyển sang phần…
        </button>
      )}
      <button type="button" className={`${ROW} ${INK} border-t border-divider`} disabled={busy || at <= 0} onClick={() => shift(-1)}>
        Lên trên
      </button>
      <button type="button" className={`${ROW} ${INK} border-t border-divider`} disabled={busy || at >= size - 1} onClick={() => shift(1)}>
        Xuống dưới
      </button>
      <button type="button" className={`${ROW} ${DANGER} border-t border-divider`} onClick={() => setStep("confirm")}>
        {target.kind === "part" ? `Xóa ${noun}` : "Xóa"}
      </button>
      {error && <p role="alert" className="m-0 pt-2 text-xs font-semibold text-destructive-text">{error}</p>}
    </div>
  );
}
