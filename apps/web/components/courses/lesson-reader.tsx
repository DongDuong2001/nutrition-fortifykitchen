"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { useBack } from "@/hooks/use-back";
import { useCourse, useCoursesApi } from "@/hooks/use-courses";
import { nextLesson, pairBackground, partToneIndex, type CourseDetail, type LessonView } from "@/lib/course-logic";
import { CoursesError, type CoursesApi } from "@/lib/courses";
import { rememberCourse } from "@/lib/course-recent";
import { parseMarkdown, type Span } from "@/lib/mini-markdown";
import { CheckGlyph, ChevronGlyph, LessonTile } from "@/components/courses/course-glyphs";
import { GoalLabel } from "@/components/ui/goal-label";
import { cue } from "@/lib/cue";
import { courseMomentDue, loadFinishedCourses, saveFinishedCourses, withFinishedCourse } from "@/lib/course-moments";
import { playFx, prefersReducedMotion } from "@/lib/goal-fx";
import { ANNOUNCE_MS, GOAL_LABEL_HOLD_MS } from "@/lib/goal-moments";
import { ProtectedSurface, Watermark } from "@/components/courses/protected-surface";

const PROGRESS_DELAY_MS = 700;
/** A scroll counts as the reader's own for this long after the last wheel, finger move or scroll key (a fling keeps scrolling). */
const SCROLL_INPUT_MS = 1500;
const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);

/** True while `ref` is inside the viewport grown by `margin` (and, with `threshold`, that much of it is inside). */
function useInView(ref: React.RefObject<Element | null>, margin: string, threshold: number, onChange?: (inView: boolean) => void): boolean {
  const [inView, setInView] = useState(false);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        cb.current?.(entry.isIntersecting);
      },
      { rootMargin: margin, threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, threshold]);
  return inView;
}

/** One page of a PDF lesson: loaded when it is near the screen, drawn under the reader's watermark, and reported when it is on screen. */
function PageFigure({
  n,
  total,
  courseId,
  lessonId,
  api,
  ratio,
  onRatio,
  onLastVisible,
}: {
  n: number;
  total: number;
  courseId: string;
  lessonId: string;
  api: CoursesApi;
  ratio: number;
  onRatio: (ratio: number) => void;
  /** Given to the last page only: it finishes the lesson once it has been on screen. */
  onLastVisible?: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const near = useInView(ref, "100% 0px", 0);
  useInView(ref, "0px", 0.3, (v) => v && onLastVisible?.());

  useEffect(() => {
    if (!near || src || failed) return;
    let live = true;
    let revoke = () => {};
    api.page(courseId, lessonId, n).then(
      (page) => {
        revoke = page.revoke;
        if (live) setSrc(page.src);
        else page.revoke();
      },
      () => live && setFailed(true)
    );
    return () => {
      live = false;
      revoke();
    };
    // The page stays loaded once fetched: leaving the screen's neighbourhood does not drop it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, api, courseId, lessonId, n, failed]);

  return (
    <figure ref={ref} id={`trang-${n}`} data-page={n} className="m-0 flex scroll-mt-20 flex-col gap-1">
      <div role="img" aria-label={`Trang ${n} trên ${total}`} className="relative flex items-center justify-center overflow-hidden rounded-card border border-transparent bg-card shadow-ring" style={{ aspectRatio: ratio }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => onRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        ) : failed ? (
          <button type="button" onClick={() => setFailed(false)} className="min-h-11 cursor-pointer border-0 bg-transparent px-4 text-callout font-semibold text-cobalt">
            Không tải được trang. Chạm để thử lại
          </button>
        ) : (
          <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-divider motion-reduce:animate-none" />
        )}
        <Watermark />
      </div>
      <figcaption className="text-right text-cap text-secondary">
        Trang {n}/{total}
      </figcaption>
    </figure>
  );
}

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) => (s.bold ? <strong key={i}>{s.text}</strong> : <React.Fragment key={i}>{s.text}</React.Fragment>))}
    </>
  );
}

function WrittenLesson({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);
  return (
    <Card className="relative flex flex-col gap-3 overflow-hidden">
      {blocks.map((b, i) =>
        b.type === "heading" ? (
          <h2 key={i} className="m-0 font-display text-body-lg font-extrabold italic uppercase leading-tight tracking-label">
            {b.text}
          </h2>
        ) : b.type === "list" ? (
          <ul key={i} className="m-0 flex list-disc flex-col gap-1 pl-5 text-callout leading-relaxed">
            {b.items.map((item, j) => (
              <li key={j}>
                <Spans spans={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="m-0 text-callout leading-relaxed">
            <Spans spans={b.spans} />
          </p>
        )
      )}
      <Watermark />
    </Card>
  );
}

/**
 * A lesson as its own pushed screen (design/courses Reader): the PDF's pages one under another, or the written text in a card, each
 * under the reader's watermark. It opens at the page asked for (?trang=) or where the user stopped, remembers the page as it is read,
 * counts the lesson as finished once its last page (or the end of the text) has been on screen, and offers "Đã xong bài này" by hand.
 */
export function LessonReader({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const goBack = useBack();
  const { api, ready } = useCoursesApi();
  const { data: course, error: courseError } = useCourse(courseId, false);
  const [lesson, setLesson] = useState<LessonView | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const asked = Number(useSearchParams()?.get("trang")) || 0;

  useEffect(() => {
    if (!ready) return;
    let live = true;
    setLesson(null);
    api.lesson(courseId, lessonId).then(
      (l) => live && setLesson(l),
      (e: Error) => live && setError(e)
    );
    return () => {
      live = false;
    };
  }, [api, ready, courseId, lessonId]);
  useEffect(() => rememberCourse(courseId), [courseId]);

  const failure = error ?? courseError;
  const header = (title: string, subtitle?: string) => <AppHeader variant="sub" layout="wide" title={title} subtitle={subtitle} onBack={goBack} />;

  if (failure) {
    const locked = failure instanceof CoursesError && failure.kind === "locked";
    return (
      <AppShell>
        {header("Bài học")}
        <main className="mx-auto w-full max-w-[560px] px-4 pb-6 pt-4 lg:mx-0 lg:px-8">
          <Card>
            <EmptyState
              title={locked ? "Khóa này chưa mở" : "Không mở được bài này"}
              actions={
                <PillButton size="md" variant="secondary" href={`/explore/documents/${courseId}`}>
                  Về khóa học
                </PillButton>
              }
            >
              {failure instanceof CoursesError ? failure.message : "Kiểm tra mạng rồi thử lại."}
            </EmptyState>
          </Card>
        </main>
      </AppShell>
    );
  }
  if (!lesson || !course) {
    return (
      <AppShell>
        {header("Bài học")}
        <main className="mx-auto w-full max-w-[560px] px-4 pb-6 pt-4 lg:mx-0 lg:px-8">
          <div aria-busy="true" aria-live="polite" className="aspect-video animate-pulse rounded-card bg-divider motion-reduce:animate-none" />
        </main>
      </AppShell>
    );
  }
  return <Reading key={lesson.id} course={course} lesson={lesson} api={api} startPage={asked || lesson.lastPage || 1} header={header} />;
}

function Reading({
  course,
  lesson,
  api,
  startPage,
  header,
}: {
  course: CourseDetail;
  lesson: LessonView;
  api: CoursesApi;
  startPage: number;
  header: (title: string, subtitle?: string) => React.ReactNode;
}) {
  const pdf = lesson.kind === "pdf";
  const total = pdf ? lesson.pageCount : 1;
  const all = course.parts.flatMap((p) => p.lessons);
  const number = all.findIndex((l) => l.id === lesson.id) + 1;
  const partAt = course.parts.findIndex((p) => p.id === lesson.partId);
  const next = nextLesson(course.parts, lesson.id);
  const [done, setDone] = useState(lesson.done);
  const [ratio, setRatio] = useState(16 / 9);
  const current = useRef(Math.min(Math.max(1, startPage), total));
  const sent = useRef<{ page: number; done: boolean }>({ page: lesson.lastPage, done: lesson.done });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touched = useRef(false);
  // When the reader last scrolled themself (wheel, finger, keys). A scroll the page makes (opening at ?trang=, the reset when Back
  // leaves) is not reading and never moves the saved place.
  const inputAt = useRef(0);
  // Only a reader who moved or finished sends anything: a screen opened and left (or opened twice while the viewer loads) must never write the place back to page 1
  const dirty = useRef(false);
  const doneRef = useRef(done);
  doneRef.current = done;

  // feat/sound-goals §5b. Marked done: the check draws in once and the success ring fades in (the ring is data-done on the button); a tap
  // plays the `save` cue, the reader marking it by itself (the last page on screen) looks the same and makes no sound (D-A11Y-04).
  // The mark that makes every lesson of the course done also rings the button and says "Xong khóa học" for 2,4 s (once per course per account).
  const [drawn, setDrawn] = useState(0);
  const [finished, setFinished] = useState<{ key: number; text: boolean } | null>(null);
  const [announce, setAnnounce] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const moments = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => moments.current.forEach(clearTimeout), []);
  // The ring is a class for one run: added once the button has rendered its new state (its className follows `done`, which would wipe it)
  useEffect(() => {
    if (finished?.text && !prefersReducedMotion() && buttonRef.current) playFx(buttonRef.current, "m-goal-ring");
  }, [finished]);
  const markedDone = (byTap: boolean) => {
    setDrawn((n) => n + 1);
    const lessons = course.parts.flatMap((p) => p.lessons).map((l) => ({ id: l.id, done: l.id === lesson.id ? false : l.done }));
    const last = courseMomentDue(lessons, lesson.id, course.id, loadFinishedCourses());
    let said = "Đã xong bài này";
    if (last) {
      saveFinishedCourses(withFinishedCourse(loadFinishedCourses(), course.id));
      said = `Xong khóa học ${course.title}`;
      setFinished({ key: Date.now(), text: true });
      moments.current.push(setTimeout(() => setFinished({ key: Date.now(), text: false }), GOAL_LABEL_HOLD_MS));
      if (byTap) cue("day");
    } else if (byTap) {
      cue("save");
    }
    setAnnounce(said);
    moments.current.push(setTimeout(() => setAnnounce(""), ANNOUNCE_MS));
  };

  const save = useCallback(
    (force = false) => {
      const page = current.current;
      if (!force && (!dirty.current || (sent.current.page === page && sent.current.done === doneRef.current))) return;
      // `completed` goes only when it changed here: the server completes a PDF at its last page by itself, and a stale false would undo it
      const changed = sent.current.done !== doneRef.current;
      sent.current = { page, done: doneRef.current };
      void api.progress(course.id, lesson.id, { lastPage: page, ...(changed ? { completed: doneRef.current } : {}) }).catch(() => {});
    },
    [api, course.id, lesson.id]
  );
  const later = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(), PROGRESS_DELAY_MS);
  }, [save]);

  // The last page on screen finishes the lesson, however it got there
  const onLastVisible = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    dirty.current = true;
    setDone(true);
    markedDone(false);
    later();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [later]);

  // The place is the page under a line a fifth of the way down the screen (the one at the top of it)
  useEffect(() => {
    if (!pdf) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      if (Date.now() - inputAt.current > SCROLL_INPUT_MS) return;
      const line = window.innerHeight * 0.2;
      for (const fig of document.querySelectorAll<HTMLElement>("figure[data-page]")) {
        if (fig.getBoundingClientRect().bottom > line) {
          const n = Number(fig.dataset.page);
          if (n !== current.current) {
            current.current = n;
            dirty.current = true;
            later();
          }
          return;
        }
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pdf, later]);

  // Open at the page asked for; images change the page heights as they load, so scroll again until the reader scrolls themself
  const scrollToStart = useCallback(() => {
    if (!pdf || touched.current) return;
    document.getElementById(`trang-${current.current}`)?.scrollIntoView({ block: "start" });
  }, [pdf]);
  useEffect(() => {
    scrollToStart();
    let moving = false;
    const mark = () => {
      touched.current = true;
      inputAt.current = Date.now();
    };
    const move = () => {
      moving = true;
      mark();
    };
    const lift = () => {
      if (moving) mark();
      moving = false;
    };
    const key = (e: KeyboardEvent) => SCROLL_KEYS.has(e.key) && mark();
    const opts = { passive: true } as const;
    window.addEventListener("wheel", mark, opts);
    window.addEventListener("touchmove", move, opts);
    window.addEventListener("touchend", lift, opts);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", lift);
      window.removeEventListener("keydown", key);
    };
  }, [scrollToStart]);
  useEffect(scrollToStart, [ratio, scrollToStart]);

  // The place is sent when the reader leaves, hides the tab, or stops for a moment
  useEffect(() => {
    const hide = () => document.hidden && save();
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      if (timer.current) clearTimeout(timer.current);
      save();
    };
  }, [save]);
  // A lesson opened and finished without moving (a short text) is finished once it has been shown
  const end = useRef<HTMLDivElement>(null);
  useInView(end, "0px", 0.5, (v) => {
    if (!v || (pdf && !touched.current)) return;
    if (!pdf) {
      if (doneRef.current) return;
      doneRef.current = true;
      dirty.current = true;
      setDone(true);
      markedDone(false);
      later();
    }
  });

  const toggle = () => {
    const nextDone = !done;
    doneRef.current = nextDone;
    dirty.current = true;
    setDone(nextDone);
    if (nextDone) markedDone(true);
    if (timer.current) clearTimeout(timer.current);
    save(true);
  };

  const subtitle = `${course.title} · bài ${number}/${all.length} · ${pdf ? `${lesson.pageCount} trang` : `${lesson.minutes} phút đọc`}`;
  return (
    <AppShell>
      {header(lesson.title, subtitle)}
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pb-24 pt-3 lg:mx-0 lg:max-w-[760px] lg:px-8">
        <p className="m-0 text-cap leading-snug text-secondary">Tài liệu của HLV chỉ đọc trong app, không tải về hay sao chép.</p>
        <ProtectedSurface>
          {pdf ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: total }, (_, i) => (
                <PageFigure key={i + 1} n={i + 1} total={total} courseId={course.id} lessonId={lesson.id} api={api} ratio={ratio} onRatio={setRatio} onLastVisible={i + 1 === total ? onLastVisible : undefined} />
              ))}
            </div>
          ) : (
            <WrittenLesson content={lesson.content ?? ""} />
          )}
        </ProtectedSurface>

        <section ref={end} aria-label="Kết thúc bài" className="flex flex-col gap-3 pt-1">
          <button
            ref={buttonRef}
            type="button"
            aria-pressed={done}
            onClick={toggle}
            data-done={done || undefined}
            // The ink ring stays under the success overlay (m-done-ring), so a box-shadow never animates
            className={`m-done-ring flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-card text-body-lg font-bold shadow-[inset_0_0_0_2px_var(--color-text)] transition-press active:scale-[0.97] motion-reduce:active:scale-100 ${done ? "text-success" : "text-text"}`}
          >
            {done && <CheckGlyph key={drawn} size={20} draw={drawn > 0} />}
            {finished?.text ? (
              <GoalLabel key={finished.key} plain>
                Xong khóa học
              </GoalLabel>
            ) : finished ? (
              <GoalLabel key={finished.key} plain>
                {done ? "Đã xong bài này" : "Đánh dấu đã xong"}
              </GoalLabel>
            ) : done ? (
              "Đã xong bài này"
            ) : (
              "Đánh dấu đã xong"
            )}
          </button>
          {/* D-MOT-02: marked done says so in words, for a screen reader too */}
          <p aria-live="polite" className="sr-only">
            {announce}
          </p>
          {next ? (
            <Link href={`/explore/documents/${course.id}/${next.id}`} data-align-group="reader-end" className="m-tint flex min-h-16 items-center gap-3 rounded-card border border-transparent bg-card px-4 py-2 text-text no-underline shadow-ring transition-press">
              <LessonTile kind={next.kind} background={pairBackground(partToneIndex(course.tone, Math.max(0, partAt)))} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-cap font-bold text-cobalt">
                  Bài tiếp · bài {all.findIndex((l) => l.id === next.id) + 1}/{all.length}
                </span>
                <span className="text-body-lg leading-snug">{next.title}</span>
              </span>
              <ChevronGlyph className="shrink-0 text-secondary" />
            </Link>
          ) : (
            <PillButton variant="secondary" size="md" href={`/explore/documents/${course.id}`}>
              Về khóa học
            </PillButton>
          )}
        </section>
      </main>
    </AppShell>
  );
}
