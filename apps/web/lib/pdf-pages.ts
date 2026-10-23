/**
 * The coach's PDF becomes page images in the browser (Q13): each page is drawn at about 1600 px wide and saved as WebP, and only
 * those images are uploaded; the PDF itself never leaves the coach's device. pdfjs-dist is loaded when the coach picks a file,
 * never by a learner's screen. The legacy build is used so Safari before 17.4 can open the file.
 */
import { MAX_LESSON_PAGES, MAX_PAGE_BYTES } from "./courses-types";

/** The width a page is drawn at (a phone shows it at about 360 CSS px, 1600 keeps it sharp at 3x and zoomed). */
export const PAGE_WIDTH_PX = 1600;
const QUALITIES = [0.82, 0.7, 0.55, 0.4];

export interface OpenedPdf {
  pageCount: number;
  /** Page n (1-based) as a base64 WebP of at most MAX_PAGE_BYTES; throws PdfError. */
  render(n: number): Promise<string>;
  destroy(): void;
}

/** `kind`: not-pdf (a file that is not a PDF or is damaged), too-long (over 60 pages), password, no-webp (this browser cannot save WebP), too-big (a page stays over 1 MiB). */
export class PdfError extends Error {
  constructor(public readonly kind: "not-pdf" | "too-long" | "password" | "no-webp" | "too-big") {
    super(PDF_MESSAGES[kind]);
  }
}

const PDF_MESSAGES: Record<PdfError["kind"], string> = {
  "not-pdf": "Không đọc được tệp này. Chọn một tệp PDF còn nguyên.",
  "too-long": `PDF dài quá ${MAX_LESSON_PAGES} trang. Tách thành hai bài rồi tải lên.`,
  password: "PDF này có mật khẩu. Bỏ mật khẩu rồi tải lên lại.",
  "no-webp": "Trình duyệt này chưa tạo được ảnh trang. Dùng Chrome hoặc Edge để thêm bài từ PDF.",
  "too-big": "Một trang quá nặng (trên 1 MB). Xuất PDF với ảnh nhỏ hơn rồi tải lên lại.",
};

/** Scale that makes a page `width` px wide. */
export const scaleFor = (pageWidth: number, width = PAGE_WIDTH_PX): number => (pageWidth > 0 ? width / pageWidth : 1);

/** Standard base64 of the bytes (the API's page upload takes base64 in JSON). */
export async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

export async function openPdf(file: File): Promise<OpenedPdf> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (error) {
    throw new PdfError((error as { name?: string })?.name === "PasswordException" ? "password" : "not-pdf");
  }
  if (doc.numPages > MAX_LESSON_PAGES) {
    void doc.destroy();
    throw new PdfError("too-long");
  }
  return {
    pageCount: doc.numPages,
    async render(n) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: scaleFor(page.getViewport({ scale: 1 }).width) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new PdfError("no-webp");
      await page.render({ canvasContext: context, viewport }).promise;
      page.cleanup();
      for (const quality of QUALITIES) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
        // A browser that cannot encode WebP answers with a PNG: the API would refuse it, so say so now
        if (!blob || blob.type !== "image/webp") throw new PdfError("no-webp");
        if (blob.size <= MAX_PAGE_BYTES) return toBase64(blob);
      }
      throw new PdfError("too-big");
    },
    destroy: () => void doc.destroy(),
  };
}
