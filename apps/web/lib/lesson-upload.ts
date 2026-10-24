import { CoursesError, type CoursesApi } from "./courses-types";

/** Thêm bài from a PDF: create the hidden lesson, upload its pages, finish it. A lesson whose pages did not all arrive is deleted again. */
export class UploadStopped extends Error {
  constructor() {
    super("stopped");
  }
}

/** A page's PUT is tried again after these waits (so three tries in all); more would only keep a coach staring at a stuck bar. */
export const PAGE_RETRY_WAITS_MS: readonly number[] = [1000, 3000];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The server said no (a page too big, no right to) or has no room (507, its disk is full): sending it again says the same. Anything
 * else (another 5xx, a dropped connection) may pass.
 */
const refused = (err: unknown) => err instanceof CoursesError && ((err.status >= 400 && err.status < 500) || err.status === 507);

export async function uploadPdfLesson(opts: {
  api: CoursesApi;
  courseId: string;
  input: { partId: string; title: string; pageCount: number };
  /** Page n (1-based) as the base64 WebP to send; throws PdfError when it cannot be made (never tried again) */
  render: (n: number) => Promise<string>;
  onPage: (n: number) => void;
  /** Page n did not go and will be tried again */
  onRetry: (n: number) => void;
  isStopped: () => boolean;
  sleep?: (ms: number) => Promise<void>;
}): Promise<string> {
  const { api, courseId, input, render, onPage, onRetry, isStopped, sleep = wait } = opts;
  let made: string | null = null;
  try {
    made = (await api.addPdfLesson(courseId, input)).id;
    for (let n = 1; n <= input.pageCount; n++) {
      if (isStopped()) throw new UploadStopped();
      onPage(n);
      // Drawn once: a retry sends the same image
      const data = await render(n);
      for (let attempt = 0; ; attempt++) {
        try {
          await api.uploadPage(courseId, made, n, data);
          break;
        } catch (err) {
          if (refused(err) || attempt >= PAGE_RETRY_WAITS_MS.length) throw err;
          onRetry(n);
          await sleep(PAGE_RETRY_WAITS_MS[attempt]);
          if (isStopped()) throw new UploadStopped();
        }
      }
    }
    if (isStopped()) throw new UploadStopped();
    await api.finishLesson(courseId, made);
    return made;
  } catch (err) {
    if (made) await api.deleteLesson(courseId, made).catch(() => {});
    throw err;
  }
}

/**
 * Whether the Thêm bài sheet holds work that an app update must not reload over: a written lesson not yet saved, a text lesson on its
 * way, or the whole PDF conversion and upload (cut halfway, the lesson is deleted and the coach starts again from page 1).
 */
export const lessonWorkInHand = (s: { kind: "pdf" | "text"; content: string; converting: boolean; saving: boolean }): boolean =>
  s.converting || s.saving || (s.kind === "text" && s.content.trim() !== "");

/** Asked when the sheet is closed while pages are on their way: Dừng stops and keeps nothing half-made, Tiếp tục tải goes on. */
export const STOP_UPLOAD_QUESTION = "Đang tải bài lên. Dừng lại?";
