"use client";

import React, { useEffect, useRef, useState } from "react";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import type { CourseDetail } from "@/lib/course-logic";
import { MAX_TEXT_BYTES, coursesErrorText, type CoursesApi } from "@/lib/courses";
import { STOP_UPLOAD_QUESTION, UploadStopped, lessonWorkInHand, uploadPdfLesson } from "@/lib/lesson-upload";
import { PdfError, openPdf, type OpenedPdf } from "@/lib/pdf-pages";
import { useUnsavedWork } from "@/lib/unsaved-work";

const FIELD = "w-full rounded-xl border-0 bg-surface text-base text-text outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]";

type Kind = "pdf" | "text";

const sizeText = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`);

/**
 * "Thêm bài" (design/courses AddLesson): a PDF or a lesson written in the app. A PDF is turned into one image per page on this
 * device (lib/pdf-pages), the pages are uploaded one by one with the count inside the button (D-CTL-07), and the lesson shows to
 * learners only once the last page is in. Closing the sheet while pages are on their way asks first (Dừng / Tiếp tục tải); Dừng
 * keeps nothing half-made. A page that does not go is tried again twice before the upload gives up (lib/lesson-upload).
 */
export function AddLessonSheet({
  open,
  course,
  partId,
  api,
  onClose,
  onAdded,
}: {
  open: boolean;
  course: CourseDetail;
  /** The part the lesson goes in; the first one when the coach came from the top button. */
  partId: string | null;
  api: CoursesApi;
  onClose: () => void;
  onAdded: (title: string) => void;
}) {
  // While pages are on their way the form answers a close with a question instead: `guard` returns true when it took the close
  const guard = useRef<(() => boolean) | null>(null);
  const close = () => {
    if (guard.current?.()) return;
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title="Thêm bài" titleId="course-add-lesson-title" desktopDialog initialFocusId="course-lesson-title">
      <LessonForm course={course} partId={partId} api={api} guardRef={guard} onClose={onClose} onAdded={onAdded} />
    </Sheet>
  );
}

function LessonForm({
  course,
  partId,
  api,
  guardRef,
  onClose,
  onAdded,
}: {
  course: CourseDetail;
  partId: string | null;
  api: CoursesApi;
  guardRef: React.MutableRefObject<(() => boolean) | null>;
  onClose: () => void;
  onAdded: (title: string) => void;
}) {
  const [kind, setKind] = useState<Kind>("pdf");
  const [part, setPart] = useState(partId ?? course.parts[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<{ name: string; size: number; pdf: OpenedPdf } | null>(null);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<{ page: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // A page that did not go and is being tried again; asking: the close was asked for while pages were on their way
  const [retrying, setRetrying] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const stopped = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const busy = progress !== null || saving;

  // An update never reloads over a lesson in the making: the whole conversion and upload, or a written lesson not yet saved
  useUnsavedWork("course-add-lesson", lessonWorkInHand({ kind, content, converting: progress !== null, saving }));
  guardRef.current =
    progress !== null
      ? () => {
          setAsking(true);
          return true;
        }
      : null;
  useEffect(() => {
    if (progress === null) setAsking(false);
  }, [progress]);
  // The sheet leaving the screen (a Back that took its entry) ends the upload too: the half lesson is deleted, nothing keeps sending, and the
  // PDF (with its canvas and its encoder worker) is let go
  const openPdfRef = useRef<OpenedPdf | null>(null);
  openPdfRef.current = file?.pdf ?? null;
  useEffect(
    () => () => {
      stopped.current = true;
      openPdfRef.current?.destroy();
    },
    []
  );

  const pick = async (picked: File) => {
    setError(undefined);
    setReading(true);
    try {
      file?.pdf.destroy();
      const pdf = await openPdf(picked);
      setFile({ name: picked.name, size: picked.size, pdf });
      // The name of the file, without ".pdf", is a fair first name for the lesson
      setTitle((t) => t || picked.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " "));
    } catch (err) {
      setFile(null);
      setError(err instanceof PdfError ? err.message : "Không đọc được tệp này.");
    } finally {
      setReading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!part) return setError("Thêm một phần trước, rồi thêm bài vào phần đó.");
    if (!title.trim()) return setError("Nhập tên bài");
    setError(undefined);
    stopped.current = false;
    if (kind === "text") {
      if (!content.trim()) return setError("Viết nội dung bài");
      if (new Blob([content]).size > MAX_TEXT_BYTES) return setError("Bài dài quá (tối đa 1 MB chữ).");
      setSaving(true);
      try {
        await api.addTextLesson(course.id, { partId: part, title, content });
        onAdded(title.trim());
      } catch (err) {
        setError(coursesErrorText(err));
        setSaving(false);
      }
      return;
    }
    if (!file) return setError("Chọn một tệp PDF");
    const total = file.pdf.pageCount;
    setProgress({ page: 1, total });
    try {
      await uploadPdfLesson({
        api,
        courseId: course.id,
        input: { partId: part, title, pageCount: total },
        render: (n) => file.pdf.render(n),
        onPage: (n) => {
          setRetrying(null);
          setProgress({ page: n, total });
        },
        onRetry: setRetrying,
        isStopped: () => stopped.current,
      });
      file.pdf.destroy();
      onAdded(title.trim());
    } catch (err) {
      // Nothing half-made: uploadPdfLesson has already removed a lesson whose pages did not all arrive
      if (!(err instanceof UploadStopped)) setError(err instanceof PdfError ? err.message : coursesErrorText(err));
      setRetrying(null);
      setProgress(null);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
      <div role="tablist" aria-label="Loại bài" className="grid grid-cols-2 gap-2">
        {(["pdf", "text"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            disabled={busy}
            onClick={() => setKind(k)}
            className={`min-h-11 cursor-pointer rounded-full border-0 text-cap transition-press active:scale-[0.97] disabled:cursor-default motion-reduce:active:scale-100 ${kind === k ? "bg-ink font-bold text-on-dark" : "bg-surface font-semibold text-text"}`}
          >
            {k === "pdf" ? "Tải lên PDF" : "Viết bài"}
          </button>
        ))}
      </div>

      {course.parts.length > 1 && (
        <FormRow label="Phần" htmlFor="course-lesson-part">
          <select id="course-lesson-part" value={part} disabled={busy} onChange={(e) => setPart(e.target.value)} className={`${FIELD} h-12 px-3`}>
            {course.parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </FormRow>
      )}

      <FormRow label="Tên bài" htmlFor="course-lesson-title">
        <input id="course-lesson-title" type="text" autoComplete="off" maxLength={100} value={title} disabled={busy} onChange={(e) => setTitle(e.target.value)} className={`${FIELD} h-12 px-3`} />
      </FormRow>

      {kind === "pdf" ? (
        <div className="flex flex-col gap-2">
          <span className="text-cap font-semibold">Tệp PDF</span>
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            tabIndex={-1}
            aria-label="Chọn tệp PDF"
            data-testid="course-pdf-input"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              e.target.value = "";
              if (picked) void pick(picked);
            }}
          />
          {file ? (
            <div className="flex min-h-16 items-center gap-3 rounded-xl bg-surface px-3 py-2">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-ink text-micro font-bold text-on-dark">
                PDF
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="break-words text-callout">{file.name}</span>
                <span className="text-cap text-secondary">
                  {file.pdf.pageCount} trang · {sizeText(file.size)}
                </span>
              </span>
              <button type="button" disabled={busy} onClick={() => input.current?.click()} className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-callout font-semibold text-cobalt disabled:opacity-50">
                Đổi tệp
              </button>
            </div>
          ) : (
            <PillButton type="button" variant="secondary" size="md" disabled={reading} onClick={() => input.current?.click()}>
              {reading ? "Đang đọc tệp…" : "Chọn tệp PDF"}
            </PillButton>
          )}
          <p className="m-0 text-cap leading-snug text-secondary">Tệp PowerPoint? Lưu thành PDF trước (Tệp › Xuất › PDF). Học viên chỉ thấy các trang, không tải được tệp gốc.</p>
        </div>
      ) : (
        <FormRow label="Nội dung" htmlFor="course-lesson-text" hint="Dùng # cho tiêu đề, - cho gạch đầu dòng, **chữ đậm**.">
          <textarea id="course-lesson-text" value={content} disabled={busy} onChange={(e) => setContent(e.target.value)} spellCheck={false} className={`${FIELD} min-h-[30vh] resize-y p-3 leading-relaxed`} />
        </FormRow>
      )}

      {error && !busy && (
        <p role="alert" className="m-0 text-xs font-semibold text-destructive-text">
          {error}
        </p>
      )}

      {/* D-CTL-07: the progress is inside the button, which stays put and cannot be tapped twice */}
      <PillButton type="submit" aria-disabled={busy} className={busy ? "cursor-default" : ""} data-tour="course-add-lesson-go">
        {progress ? `Đang chuyển trang ${progress.page}/${progress.total}…` : saving ? "Đang lưu…" : "Thêm vào khóa"}
      </PillButton>
      {progress && retrying !== null && (
        <p role="status" className="m-0 text-center text-cap font-semibold text-text">
          Trang {retrying} chưa lên được. Đang thử lại…
        </p>
      )}
      {progress && !asking && <p className="m-0 text-center text-cap text-secondary">Đóng cửa sổ này để dừng. Bài chưa đủ trang sẽ không được giữ lại.</p>}
      {progress && asking && (
        // The question is in the sheet, under the button that shows the progress: no second sheet over it. Tiếp tục tải comes first
        // and holds the focus (the safe answer), Dừng, the one that throws the half lesson away, is last.
        <div role="alertdialog" aria-labelledby="course-stop-upload" className="flex flex-col gap-3 rounded-card bg-surface p-4">
          <p id="course-stop-upload" className="m-0 text-callout font-bold">
            {STOP_UPLOAD_QUESTION}
          </p>
          <p className="m-0 text-cap leading-snug text-secondary">Bài chưa đủ trang sẽ không được giữ lại.</p>
          <PillButton type="button" variant="tertiary" autoFocus onClick={() => setAsking(false)}>
            Tiếp tục tải
          </PillButton>
          <PillButton
            type="button"
            variant="destructive"
            onClick={() => {
              stopped.current = true;
              setAsking(false);
              onClose();
            }}
          >
            Dừng
          </PillButton>
        </div>
      )}
    </form>
  );
}
