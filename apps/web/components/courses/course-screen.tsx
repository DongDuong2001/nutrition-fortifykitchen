"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { LevelBadge } from "@/components/profile/level-badge";
import { useBack } from "@/hooks/use-back";
import { useCourse, useCoursesApi } from "@/hooks/use-courses";
import { toLevel } from "@/lib/coaching-link";
import { markUsed } from "@/lib/onboarding-store";
import { rememberCourse } from "@/lib/course-recent";
import { useDiary } from "@/lib/diary-store";
import { CoursesError, type CoursesApi } from "@/lib/courses";
import { accentBackground, lessonMeta, pairBackground, partTone, partToneIndex, tileBackground, type CourseDetail, type CoursePart, type CourseSummary } from "@/lib/course-logic";
import { CheckGlyph, ChevronGlyph, LessonTile, MoreGlyph, PlayGlyph, PlusGlyph } from "@/components/courses/course-glyphs";
import { CodeSheet } from "@/components/courses/code-sheet";
import { CourseCodes } from "@/components/courses/course-codes";
import { CourseSheet } from "@/components/courses/course-sheet";
import { ManageSheet, type ManageTarget } from "@/components/courses/manage-sheet";
import { AddLessonSheet } from "@/components/courses/add-lesson-sheet";
import { FormRow } from "@/components/ui/form-row";
import { Sheet } from "@/components/ui/sheet";

const lessonHref = (courseId: string, lessonId: string, page?: number) => `/explore/documents/${courseId}/${lessonId}${page ? `?trang=${page}` : ""}`;

/** The 4 × 28 px accent bar before the title: the course's own gradient (the design's tile colour). */
function AccentBar({ tone }: { tone: number }) {
  return <span aria-hidden="true" className="h-7 w-1 shrink-0 rounded-sm" style={{ background: accentBackground(tone) }} />;
}

/** The finished check: the success token with the words for a screen reader (D-COL-04). */
function DoneMark() {
  return (
    <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-on-accent">
      <CheckGlyph size={14} />
      <span className="sr-only">Đã xong</span>
    </span>
  );
}

function PartHeader({ dot, title, count, children }: { dot: string; title: string; count: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-2">
      <h2 className="m-0 flex items-center gap-2 font-display text-callout font-extrabold italic uppercase leading-tight tracking-label text-cobalt">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
        {title}
      </h2>
      <span className="flex items-center gap-1">
        <span className="text-cap text-secondary">{count}</span>
        {children}
      </span>
    </div>
  );
}

function partCount(part: CoursePart): string {
  const done = part.lessons.filter((l) => l.done).length;
  return part.lessons.length > 0 && done === part.lessons.length ? `${done}/${part.lessons.length} xong` : `${part.lessons.length} bài`;
}

/** Lessons are numbered across the whole course ("Bài 3" in Phần 2 follows "Bài 2" of Phần 1). */
function numbered(parts: CoursePart[]): Map<string, number> {
  const out = new Map<string, number>();
  parts.flatMap((p) => p.lessons).forEach((l, i) => out.set(l.id, i + 1));
  return out;
}

function LearnerCourse({ course }: { course: CourseDetail }) {
  const goBack = useBack();
  const nums = useMemo(() => numbered(course.parts), [course.parts]);
  const resume = course.resume;
  const resumeAt = resume ? nums.get(resume.lessonId) : undefined;
  const sub = [`${course.doneCount}/${course.lessonCount} bài đã xong`, course.subtitle].filter(Boolean).join(" · ");
  return (
    <AppShell>
      <AppHeader variant="sub" layout="wide" title={course.title} subtitle={sub} onBack={goBack} lead={<AccentBar tone={course.tone} />} />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:px-8">
        {resume && resumeAt ? (
          <PillButton href={lessonHref(course.id, resume.lessonId, resume.page)} onClick={() => markUsed("course-resume")} className="gap-2 lg:max-w-[560px]" data-tour="course-resume">
            <PlayGlyph size={20} />
            Học tiếp: Bài {resumeAt}
          </PillButton>
        ) : (
          course.lessonCount > 0 && <p className="m-0 text-callout text-secondary">Bạn đã học xong khóa này.</p>
        )}
        {course.parts.length === 0 || course.lessonCount === 0 ? (
          <Card>
            <EmptyState title="Khóa này chưa có bài">HLV đang soạn. Quay lại sau nhé.</EmptyState>
          </Card>
        ) : (
          course.parts
            .filter((p) => p.lessons.length > 0)
            .map((part) => {
              const idx = course.parts.indexOf(part);
              return (
                <section key={part.id} aria-label={part.title} className="flex flex-col gap-1 lg:max-w-[560px]">
                  <PartHeader dot={partTone(partToneIndex(course.tone, idx))} title={part.title} count={partCount(part)} />
                  <Card as="section" padding={false} className="px-4">
                    <ol className="m-0 list-none p-0">
                      {part.lessons.map((l, i) => (
                        <li key={l.id} className={i > 0 ? "border-t border-divider" : ""}>
                          <Link href={lessonHref(course.id, l.id, l.lastPage > 1 && !l.done ? l.lastPage : undefined)} data-align-group="lessons" className="m-tint flex min-h-16 items-center gap-3 py-2 text-text no-underline transition-press">
                            <LessonTile kind={l.kind} background={pairBackground(partToneIndex(course.tone, idx))} />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="text-body-lg leading-snug">{l.title}</span>
                              <span className="text-cap text-secondary">{lessonMeta(nums.get(l.id) ?? 0, l)}</span>
                            </span>
                            {l.done && <DoneMark />}
                            <ChevronGlyph className="shrink-0 text-secondary" />
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </Card>
                </section>
              );
            })
        )}
      </main>
    </AppShell>
  );
}

/** The coach's view of the same course (design/courses CoachCourse): the actions on top, the code card, parts and lessons with ⋯. */
function CoachCourse({ course, api, reload }: { course: CourseDetail; api: CoursesApi; reload: () => void }) {
  const goBack = useBack();
  const { notify } = useDiary();
  const nums = useMemo(() => numbered(course.parts), [course.parts]);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<{ partId: string | null } | null>(null);
  const [managing, setManaging] = useState<ManageTarget | null>(null);
  const [newPart, setNewPart] = useState(false);
  const changed = (message: string) => {
    setManaging(null);
    notify(message);
    reload();
  };
  return (
    <AppShell>
      <AppHeader variant="sub" layout="wide" title={course.title} subtitle={[`${course.lessonCount} bài`, course.subtitle].filter(Boolean).join(" · ")} onBack={goBack} lead={<AccentBar tone={course.tone} />} />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:px-8">
        <div className="flex gap-2">
          <PillButton size="md" onClick={() => setAdding({ partId: null })} disabled={course.parts.length === 0} data-tour="course-add-lesson">
            Thêm bài
          </PillButton>
          <PillButton size="md" variant="secondary" onClick={() => setEditing(true)}>
            Sửa khóa
          </PillButton>
        </div>
        {course.parts.length === 0 && <p className="m-0 text-cap leading-snug text-secondary">Thêm một phần trước, rồi thêm bài vào phần đó.</p>}

        {course.access === "code" && (
          <div className="lg:max-w-[560px]">
            <CourseCodes courseId={course.id} api={api} />
          </div>
        )}

        {course.parts.map((part, idx) => (
          <section key={part.id} aria-label={part.title} className="flex flex-col gap-1 lg:max-w-[560px]">
            <PartHeader dot={partTone(partToneIndex(course.tone, idx))} title={part.title} count={partCount(part)}>
              <button type="button" aria-label={`Tùy chọn cho ${part.title}`} aria-haspopup="dialog" onClick={() => setManaging({ kind: "part", partId: part.id })} className="-mr-2.5 flex h-11 w-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-secondary">
                <MoreGlyph />
              </button>
            </PartHeader>
            <Card as="section" padding={false} className="px-4">
              {part.lessons.length === 0 ? (
                <p className="m-0 py-4 text-cap text-secondary">Phần này chưa có bài.</p>
              ) : (
                <ol className="m-0 list-none p-0">
                  {part.lessons.map((l, i) => (
                    <li key={l.id} data-align-group="coach-lessons" className={`flex min-h-16 items-center gap-3 py-2 ${i > 0 ? "border-t border-divider" : ""}`}>
                      <Link href={lessonHref(course.id, l.id)} className="m-tint flex min-w-0 flex-1 items-center gap-3 text-text no-underline transition-press">
                        <LessonTile kind={l.kind} background={pairBackground(partToneIndex(course.tone, idx))} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-body-lg leading-snug">{l.title}</span>
                          <span className="text-cap text-secondary">{l.ready ? lessonMeta(nums.get(l.id) ?? 0, { ...l, done: true }) : "Chưa đủ trang, học viên chưa thấy"}</span>
                        </span>
                      </Link>
                      <button type="button" aria-label={`Tùy chọn cho ${l.title}`} aria-haspopup="dialog" onClick={() => setManaging({ kind: "lesson", partId: part.id, lessonId: l.id })} className="-mr-2.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-secondary">
                        <MoreGlyph />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </section>
        ))}

        <PillButton variant="secondary" className="gap-2 border-0! shadow-[inset_0_0_0_2px_var(--color-text)] lg:max-w-[560px]" onClick={() => setNewPart(true)} data-tour="course-add-part">
          <PlusGlyph />
          Thêm phần
        </PillButton>
      </main>

      <CourseSheet
        open={editing}
        course={course}
        api={api}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          notify("Đã lưu khóa");
          reload();
        }}
        onDeleted={() => {
          setEditing(false);
          notify("Đã xóa khóa");
          goBack();
        }}
      />
      <AddLessonSheet
        open={adding !== null}
        course={course}
        partId={adding?.partId ?? null}
        api={api}
        onClose={() => setAdding(null)}
        onAdded={(title) => {
          setAdding(null);
          notify(`Đã thêm ${title}`);
          reload();
        }}
      />
      <ManageSheet target={managing} course={course} api={api} onClose={() => setManaging(null)} onChanged={changed} />
      <NewPartSheet
        open={newPart}
        onClose={() => setNewPart(false)}
        onAdd={async (title) => {
          await api.addPart(course.id, title);
          setNewPart(false);
          notify("Đã thêm phần");
          reload();
        }}
      />
    </AppShell>
  );
}

function NewPartSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (title: string) => Promise<void> }) {
  return (
    <Sheet open={open} onClose={onClose} title="Phần mới" titleId="course-part-title" desktopDialog initialFocusId="course-part-name">
      <PartForm onAdd={onAdd} />
    </Sheet>
  );
}

function PartForm({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Nhập tên phần");
    setBusy(true);
    try {
      await onAdd(title);
    } catch {
      setError("Chưa thêm được. Thử lại sau.");
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
      <FormRow label="Tên phần" htmlFor="course-part-name" error={error} hint="Ví dụ: Phần 1 · Mục tiêu của bạn">
        <input id="course-part-name" type="text" autoComplete="off" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 w-full rounded-xl border-0 bg-surface px-3 text-base text-text outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]" />
      </FormRow>
      <PillButton type="submit" disabled={busy} aria-disabled={busy}>
        {busy ? "Đang thêm…" : "Thêm phần"}
      </PillButton>
    </form>
  );
}

/** A course the user cannot open: the code sheet for a code course, a word about the Level for a Level course. */
function LockedCourse({ id, lock }: { id: string; lock: NonNullable<CoursesError["lock"]> }) {
  const goBack = useBack();
  const { api } = useCoursesApi();
  const [summary, setSummary] = useState<CourseSummary | null>(null);
  const [asking, setAsking] = useState<CourseSummary | null>(null);
  const { notify } = useDiary();
  useEffect(() => {
    let live = true;
    api.list().then((all) => live && setSummary(all.find((c) => c.id === id) ?? null), () => {});
    return () => {
      live = false;
    };
  }, [api, id]);
  return (
    <AppShell>
      <AppHeader variant="sub" layout="wide" title={summary?.title ?? "Khóa học"} onBack={goBack} />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:px-8">
        {summary && <div className="flex flex-col gap-1 rounded-card p-4 text-on-accent" style={{ background: tileBackground(summary.tone) }}><span className="font-display text-title font-black italic leading-none">{summary.title}</span><span className="text-cap font-semibold">{summary.lessonCount} bài</span></div>}
        {lock.kind === "level" ? (
          <Card>
            <EmptyState title="Khóa này chưa mở" icon={<LevelBadge level={toLevel(lock.minLevel)} />}>
              Mở khi bạn lên Level {lock.minLevel}.
            </EmptyState>
          </Card>
        ) : (
          <Card>
            <EmptyState
              title="Khóa này cần mã"
              actions={
                <PillButton size="md" onClick={() => summary && setAsking(summary)} disabled={!summary}>
                  Nhập mã
                </PillButton>
              }
            >
              HLV gửi mã cho bạn. Một mã mở cả khóa.
            </EmptyState>
          </Card>
        )}
      </main>
      <CodeSheet
        course={asking}
        api={api}
        onClose={() => setAsking(null)}
        onOpened={() => {
          setAsking(null);
          notify("Đã mở khóa");
          window.location.reload();
        }}
      />
    </AppShell>
  );
}

/** One course (design/courses Course, CoachCourse): the learner's list of lessons by part, or the coach's editor. */
export function CourseScreen({ id }: { id: string }) {
  const goBack = useBack();
  const { api, canManage } = useCoursesApi();
  const { data: course, error, reload } = useCourse(id);
  useEffect(() => {
    if (course) rememberCourse(course.id);
  }, [course]);

  if (error instanceof CoursesError && error.kind === "locked" && error.lock) return <LockedCourse id={id} lock={error.lock} />;
  if (course) return canManage ? <CoachCourse course={course} api={api} reload={reload} /> : <LearnerCourse course={course} />;
  return (
    <AppShell>
      <AppHeader variant="sub" layout="wide" title="Khóa học" onBack={goBack} />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:px-8">
        {error ? (
          <Card>
            <EmptyState
              title={error instanceof CoursesError && error.status === 404 ? "Không có khóa này" : "Không tải được khóa học"}
              actions={
                <PillButton size="md" variant="secondary" onClick={error instanceof CoursesError && error.status === 404 ? goBack : reload}>
                  {error instanceof CoursesError && error.status === 404 ? "Quay lại" : "Thử lại"}
                </PillButton>
              }
            >
              {error instanceof CoursesError ? error.message : "Kiểm tra mạng rồi thử lại."}
            </EmptyState>
          </Card>
        ) : (
          <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-card bg-divider motion-reduce:animate-none" />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
