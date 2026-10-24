"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { Segmented } from "@/components/ui/segmented";
import { SwitchGlide } from "@/components/ui/switch-glide";
import { useBack } from "@/hooks/use-back";
import { useCourseList, useCoursesApi } from "@/hooks/use-courses";
import { onProgressSaved } from "@/lib/courses";
import { useDiary } from "@/lib/diary-store";
import { markUsed } from "@/lib/onboarding-store";
import { recentCourse } from "@/lib/course-recent";
import { pairBackground, resumeOf, type CourseDetail, type CourseSummary } from "@/lib/course-logic";
import { CodeSheet } from "@/components/courses/code-sheet";
import { CourseSheet } from "@/components/courses/course-sheet";
import { CourseTile } from "@/components/courses/course-tile";
import { ChevronGlyph, PlayGlyph, PlusGlyph } from "@/components/courses/course-glyphs";

type Tab = "all" | "open" | "locked";
const TABS: Tab[] = ["all", "open", "locked"];

/** "New" for two weeks after a course is made. */
const NEW_MS = 14 * 24 * 60 * 60 * 1000;
const isNew = (c: CourseSummary) => Date.now() - Date.parse(c.createdAt) < NEW_MS;

/** The course to offer "Học tiếp" for: the one the user was last in, else the first one in progress. */
function resumeCandidate(list: CourseSummary[]): CourseSummary | null {
  const open = list.filter((c) => c.unlocked && c.lessonCount > 0 && c.doneCount < c.lessonCount);
  const last = recentCourse();
  return open.find((c) => c.id === last) ?? open.find((c) => c.doneCount > 0) ?? null;
}

function ResumeRow({ course, detail }: { course: CourseSummary; detail: CourseDetail }) {
  const at = resumeOf(detail.parts);
  if (!at) return null;
  const all = detail.parts.flatMap((p) => p.lessons);
  const n = all.findIndex((l) => l.id === at.lessonId) + 1;
  const lesson = all[n - 1];
  const where = lesson.kind === "pdf" ? `Trang ${at.page}/${lesson.pageCount}` : "Bài viết";
  return (
    <Link
      href={`/explore/documents/${course.id}/${at.lessonId}?trang=${at.page}`}
      aria-label={`Học tiếp ${course.title}, bài ${n}, ${where.toLowerCase()}`}
      onClick={() => markUsed("course-resume")}
      data-tour="course-resume"
      data-align-group="library"
      className="m-tint flex min-h-16 items-center gap-3 rounded-card border border-transparent bg-card px-4 py-2 text-text no-underline shadow-ring transition-press"
    >
      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-on-accent shadow-tile" style={{ background: pairBackground(course.tone) }}>
        <PlayGlyph />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-cap font-bold text-cobalt">Học tiếp · {course.title}</span>
        <span className="text-callout leading-snug">
          Bài {n} · {lesson.title}
        </span>
        <span className="text-cap text-secondary">{where}</span>
      </span>
      <ChevronGlyph className="shrink-0 text-secondary" />
    </Link>
  );
}

/**
 * Tài liệu, the course library (design/courses Main, a pushed screen of Khám phá): the newest course as one wide tile, the others in
 * two columns, a Segmented filter, and Học tiếp on top for the course in progress. The list never needs access (lib/course-logic);
 * a shut tile opens the code sheet, or says which Level opens it. A coach also gets "Khóa mới".
 */
export function CoursesLibrary() {
  const goBack = useBack();
  const router = useRouter();
  const { notify } = useDiary();
  const { api, canManage } = useCoursesApi();
  const { data: list, error, reload } = useCourseList();
  const [tab, setTab] = useState<Tab>("all");
  const [asking, setAsking] = useState<CourseSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [resume, setResume] = useState<{ course: CourseSummary; detail: CourseDetail } | null>(null);

  const candidate = useMemo(() => (list ? resumeCandidate(list) : null), [list]);
  const [saves, setSaves] = useState(0);
  useEffect(() => onProgressSaved(() => setSaves((n) => n + 1)), []);
  useEffect(() => {
    if (!candidate) {
      setResume(null);
      return;
    }
    let live = true;
    api.get(candidate.id).then(
      (detail) => live && setResume({ course: candidate, detail }),
      () => live && setResume(null)
    );
    return () => {
      live = false;
    };
  }, [api, candidate, saves]);

  const counts = { all: list?.length ?? 0, open: list?.filter((c) => c.unlocked).length ?? 0, locked: list?.filter((c) => !c.unlocked).length ?? 0 };
  const shown = list?.filter((c) => tab === "all" || (tab === "open") === c.unlocked) ?? [];
  const [newest, ...others] = shown;

  const onLocked = (c: CourseSummary) => {
    if (c.lock === "level") notify(`Khóa này mở khi bạn lên Level ${c.minLevel ?? 1}.`);
    else setAsking(c);
  };

  return (
    <AppShell>
      <AppHeader variant="sub" layout="wide" title="Tài liệu" onBack={goBack} />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-2 lg:mx-0 lg:max-w-[1240px] lg:px-8">
        <p className="m-0 text-cap leading-snug text-secondary">Khóa học của HLV. Mỗi khóa mở bằng một mã HLV gửi cho bạn, hoặc khi bạn đủ Level.</p>

        {canManage && (
          <PillButton size="md" onClick={() => setCreating(true)} className="gap-2 self-start" data-tour="course-new">
            <PlusGlyph size={18} />
            Khóa mới
          </PillButton>
        )}

        <Segmented
          as="tabs"
          label="Lọc khóa học"
          alignGroup="library-tabs"
          value={tab}
          onChange={setTab}
          items={[
            { key: "all", label: `Tất cả · ${counts.all}` },
            { key: "open", label: `Đã mở · ${counts.open}` },
            { key: "locked", label: `Chưa mở · ${counts.locked}` },
          ]}
        />

        {resume && <ResumeRow course={resume.course} detail={resume.detail} />}

        <SwitchGlide id={tab} order={TABS.indexOf(tab)} className="flex flex-col gap-4">
          {list === null && !error ? (
            <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
              <div className="min-h-[152px] animate-pulse rounded-card bg-divider motion-reduce:animate-none" />
              <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3 lg:grid-cols-4">
                {[0, 1].map((i) => (
                  <div key={i} className="min-h-[152px] animate-pulse rounded-card bg-divider motion-reduce:animate-none" />
                ))}
              </div>
            </div>
          ) : error ? (
            <EmptyState
              title="Không tải được khóa học"
              actions={
                <PillButton size="md" variant="secondary" onClick={reload}>
                  Thử lại
                </PillButton>
              }
            >
              Kiểm tra mạng rồi thử lại.
            </EmptyState>
          ) : shown.length === 0 ? (
            <Card>
              <EmptyState title={tab === "all" ? "Chưa có khóa học" : tab === "open" ? "Chưa mở khóa nào" : "Bạn đã mở hết các khóa"}>
                {tab === "all" ? (canManage ? "Chạm Khóa mới để thêm khóa đầu tiên." : "HLV chưa thêm khóa nào.") : tab === "open" ? "Nhập mã HLV gửi hoặc lên Level để mở khóa." : "Học tiếp từ đầu trang."}
              </EmptyState>
            </Card>
          ) : (
            <>
              <div className="lg:max-w-[560px]">
                <CourseTile course={newest} size="wide" isNew={isNew(newest)} onLocked={onLocked} />
              </div>
              {others.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3 lg:grid-cols-4">
                  {others.map((c) => (
                    <CourseTile key={c.id} course={c} onLocked={onLocked} />
                  ))}
                </div>
              )}
            </>
          )}
        </SwitchGlide>
      </main>

      <CodeSheet
        course={asking}
        api={api}
        onClose={() => setAsking(null)}
        onOpened={(opened) => {
          setAsking(null);
          router.push(`/explore/documents/${opened.id}`);
        }}
      />
      <CourseSheet
        open={creating}
        course={null}
        api={api}
        onClose={() => setCreating(false)}
        onSaved={(made) => {
          setCreating(false);
          router.push(`/explore/documents/${made.id}`);
        }}
      />
    </AppShell>
  );
}
