"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getFontEmbedCSS, toSvg } from "html-to-image";
import { errorText, reportClientError } from "@/lib/client-errors";
import { Sheet } from "@/components/ui/sheet";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";
import type { HomeEntry, HomeMeal } from "@/lib/home";
import type { MockDayData } from "@/lib/mock/sample-day";
import { SHARE_CSS_WIDTH, buildShareModel, keepInShareImage, shareFontsEmbedded, shareImageSize, shareNeedsName, type ShareModel } from "@/lib/share-card";
import { cleanDisplayName, limitDisplayName } from "@/lib/display-name";
import { markUsed } from "@/lib/onboarding-store";
import { validateSetupName } from "@/lib/onboarding";
import { ShareDay } from "./share-day";
import { countedForLevel } from "@/lib/level-nutrients";
import type { Level } from "@/lib/coaching-link";
import { AlertLine } from "@/components/ui/alert-line";

type Failure = "generate" | "fonts" | "share" | "save";

interface Ready {
  file: File;
  url: string;
  alt: string;
  width: number;
  height: number;
  /** Files can be handed to the share sheet of this device (iOS, Android); desktop browsers mostly cannot. */
  canShare: boolean;
}

const FAILURE_TEXT: Record<Failure, string> = {
  generate: "Không tạo được ảnh.",
  fonts: "Không tạo được ảnh. Tải lại trang rồi thử lại.",
  share: "Không chia sẻ được.",
  save: "Không lưu được ảnh.",
};

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const FONT_WAIT_MS = 4000;

/**
 * Loads every face the page uses (Manrope, Saira Condensed, at each weight and style it draws) for the very text it
 * holds, so a glyph of a Vietnamese name or a rare weight is not drawn in the fallback face. Waits at most
 * FONT_WAIT_MS: a font that cannot load must not stop the picture.
 */
async function loadShareFonts(node: HTMLElement): Promise<void> {
  try {
    if (typeof document === "undefined" || !document.fonts?.load) return;
    const text = node.textContent ?? "";
    const faces = new Set<string>();
    node.querySelectorAll<HTMLElement>("*").forEach((el) => {
      if (![...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())) return;
      const style = getComputedStyle(el);
      if (style.fontFamily) {
        faces.add(`${style.fontStyle || "normal"} ${style.fontWeight || "400"} 16px ${style.fontFamily}`);
      }
    });
    const loading = Promise.all(
      [...faces].map((face) => document.fonts.load(face, text).catch(() => [] as FontFace[]))
    ).then(() => document.fonts?.ready);
    await Promise.race([loading, new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS))]);
  } catch {
    // A font that cannot load must not stop the picture
  }
}

/** The fonts could not be put in the picture. */
class ShareFontsError extends Error {}

/**
 * html-to-image's font CSS with every font inlined, or a ShareFontsError (then the sheet asks to reload). The second
 * try helps when the call itself fails; a font file that failed is cached empty by html-to-image until the page reloads.
 */
async function shareFontCSS(node: HTMLElement): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const css = await getFontEmbedCSS(node).catch(() => undefined);
    if (css && shareFontsEmbedded(css)) return css;
  }
  throw new ShareFontsError("share fonts not embedded");
}

/**
 * html-to-image writes every computed style into the clone, sizes included: each text box keeps the width and
 * height it had in the real fonts. If the picture is drawn in another face (a font that did not load on a phone),
 * text wraps inside those widths and runs over the next row. So in the SVG, a box with text of its own sizes to its
 * text again, and so does an inline-level box (its classes say so: a flex item's computed display is never inline),
 * like the Level badge. A box around text keeps its height only as a minimum and a grid around text loses its
 * frozen row heights, so rows grow. Boxes without text (bars, dots, dividers) keep their sizes; so does the page.
 */
function relayoutText(svg: string): string {
  const comma = svg.indexOf(",");
  const doc = new DOMParser().parseFromString(decodeURIComponent(svg.slice(comma + 1)), "image/svg+xml");
  doc.querySelectorAll<HTMLElement>("[data-share-root] *").forEach((el) => {
    const s = el.style;
    if (!s || !el.textContent?.trim()) return;
    const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    if (ownText || s.display.startsWith("inline") || /\binline-(flex|block|grid)\b/.test(el.getAttribute("class") ?? "")) {
      ["width", "height", "inline-size", "block-size"].forEach((p) => s.removeProperty(p));
      return;
    }
    const height = parseFloat(s.height);
    s.removeProperty("height");
    s.removeProperty("block-size");
    if (height > 0) s.minHeight = `${Math.max(height, parseFloat(s.minHeight) || 0)}px`;
    s.removeProperty("grid-template-rows");
  });
  return svg.slice(0, comma + 1) + encodeURIComponent(new XMLSerializer().serializeToString(doc));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // As html-to-image: decoded, then one frame, before it is drawn
    img.onload = () => img.decode().then(() => requestAnimationFrame(() => resolve(img)), reject);
    img.onerror = reject;
    img.decoding = "async";
    img.src = src;
  });
}

/**
 * Draws the page (a ShareDay in an off-screen portal) into a 1080-px-wide PNG and hands the file up. The page is
 * mounted only while the picture is made, so it never lingers in the DOM next to the real screen.
 */
function ShareCapture({
  model,
  onDone,
  onError,
}: {
  model: ShareModel;
  onDone: (file: File, width: number, height: number) => void;
  onError: (failure: "generate" | "fonts") => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onDone, onError });
  callbacks.current = { onDone, onError };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const node = hostRef.current?.querySelector<HTMLElement>("[data-share-root]");
      if (!node) throw new Error("no share root");
      // Fonts first: a size measured before they load would be wrong, and the image would use the fallback face
      await loadShareFonts(node);
      await nextFrame();
      await nextFrame();
      const cssHeight = node.getBoundingClientRect().height;
      const { scale, width, height } = shareImageSize(cssHeight);
      const fontEmbedCSS = await shareFontCSS(node);
      const footer = node.querySelector<HTMLElement>("[data-share-footer]");
      const ink = getComputedStyle(footer ?? node).backgroundColor;
      // The page is scaled by layout (transform on the clone), so text stays vector-sharp at 1080 px
      const svg = await toSvg(node, {
        // Buttons marked data-export="hide" (the + Thêm pills) never reach the image
        filter: keepInShareImage,
        width,
        height,
        fontEmbedCSS,
        // A page height that is not a whole number of image rows leaves a last row the page only partly covers: the
        // canvas fill gives it the footer's ink. html-to-image also paints this colour on the page, so `style` puts the
        // page's white back, with ink under the footer so the blended last row stays ink to the corners.
        backgroundColor: ink,
        style: {
          backgroundColor: getComputedStyle(node).backgroundColor,
          backgroundImage: `linear-gradient(to top, ${ink} ${footer?.offsetHeight ?? 0}px, transparent 0)`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${SHARE_CSS_WIDTH}px`,
          height: `${height / scale}px`,
          minHeight: `${height / scale}px`,
        },
      });
      const img = await loadImage(relayoutText(svg));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no canvas");
      context.fillStyle = ink;
      context.fillRect(0, 0, width, height);
      context.drawImage(img, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("no image");
      if (!cancelled) callbacks.current.onDone(new File([blob], model.filename, { type: "image/png" }), width, height);
    })().catch((error: unknown) => {
      reportClientError({ kind: "share", message: errorText(error) });
      if (!cancelled) callbacks.current.onError(error instanceof ShareFontsError ? "fonts" : "generate");
    });
    return () => {
      cancelled = true;
    };
  }, [model]);

  return createPortal(
    <div ref={hostRef} aria-hidden="true" inert style={{ position: "fixed", top: 0, left: -10000, width: SHARE_CSS_WIDTH, pointerEvents: "none" }}>
      <ShareDay model={model} />
    </div>,
    document.body
  );
}

/**
 * Chia sẻ ngày này: draws the Hôm nay screen (without the header and tab bar) as a 1080-px-wide PNG when it opens
 * (client side, no network) and keeps the file ready, so Chia sẻ calls navigator.share inside the tap. Without file
 * sharing, Lưu ảnh is the primary button. A cancelled share sheet (AbortError) is not an error.
 */
export function ShareSheet({
  open,
  onClose,
  day,
  entries,
  meals,
  finished,
  displayName,
  level,
  onSaveName,
}: {
  open: boolean;
  onClose: () => void;
  day: MockDayData;
  entries: HomeEntry[];
  meals: HomeMeal[];
  finished: boolean;
  displayName: string;
  /** The Level badge on the name row and the list of nutrients in the column. */
  level: Level;
  /** Saves the name typed in the name step (profile.displayName). Resolves false when the API did not take it. */
  onSaveName: (name: string) => Promise<boolean>;
}) {
  const [ready, setReady] = useState<Ready | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Fonts that failed stay failed until the page reloads (html-to-image's cache): after a retry, Thử lại reloads
  const [fontFailures, setFontFailures] = useState(0);
  const [job, setJob] = useState<ShareModel | null>(null);
  // The latest day, read when the page is drawn; a change to it while the sheet is open does not redraw it
  const latest = useRef({ day, entries, meals, finished, displayName, level });
  latest.current = { day, entries, meals, finished, displayName, level };

  const urlRef = useRef<string | null>(null);
  const needsName = shareNeedsName(displayName);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  // The name is kept on this device either way; true when the API could not take it
  const [nameSyncFailed, setNameSyncFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || needsName) return;
    setReady(null);
    setFailure(null);
    const { level: current, ...rest } = latest.current;
    setJob(buildShareModel({ ...rest, level: current, now: new Date(), nutrientIds: countedForLevel(current) }));
    return () => {
      setJob(null);
      // The revoked URL must not show for a frame when the sheet opens again
      setReady(null);
      // The picture lives only while the sheet is open
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, [open, attempt, needsName]);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  const onDone = useCallback(
    (file: File, width: number, height: number) => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      let canShare = false;
      try {
        canShare = typeof navigator.canShare === "function" && typeof navigator.share === "function" && navigator.canShare({ files: [file] });
      } catch {
        // Some browsers throw for a file type they do not know: no file sharing, Lưu ảnh stays
      }
      const alt = job?.alt ?? "";
      setJob(null);
      setReady({ file, url, alt, width, height, canShare });
    },
    [job]
  );

  // No await before navigator.share: iOS drops the share when the tap has finished
  const share = useCallback(() => {
    if (!ready) return;
    setFailure(null);
    const failed = (error: unknown) => {
      if ((error as { name?: string } | null)?.name === "AbortError") return;
      setFailure("share");
    };
    try {
      navigator
        .share({ files: [ready.file], title: "H1T MICRO" })
        .then(() => markUsed("share-day"))
        .catch(failed);
    } catch (error) {
      failed(error);
    }
  }, [ready]);

  const save = useCallback(() => {
    if (!ready) return;
    setFailure(null);
    try {
      const link = document.createElement("a");
      link.href = ready.url;
      link.download = ready.file.name;
      document.body.append(link);
      link.click();
      link.remove();
      markUsed("share-day");
    } catch {
      setFailure("save");
    }
  }, [ready]);

  const retry = () => {
    if (failure === "share") share();
    else if (failure === "save") save();
    else if (failure === "fonts" && fontFailures > 1) window.location.reload();
    else setAttempt((n) => n + 1);
  };

  // Never draw an image without a name: ask for it first
  if (needsName) {
    const draftError = validateSetupName(nameDraft);
    const valid = draftError === null;
    // Tiếp tục is off while the name cannot be used: say why as soon as something is typed (blank needs no message yet)
    const shownError = nameError ?? (nameDraft.trim() === "" ? null : draftError);
    return (
      <Sheet open={open} onClose={onClose} title="Chia sẻ ngày này" titleId="share-sheet-title" desktopDialog>
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (isSaving) return;
            const message = validateSetupName(nameDraft);
            setNameError(message);
            if (!message) {
              setIsSaving(true);
              try {
                const ok = await onSaveName(cleanDisplayName(nameDraft));
                setNameSyncFailed(!ok);
              } finally {
                setIsSaving(false);
              }
            }
          }}
          className="flex flex-col gap-3"
        >
          <FormRow label="Tên hiện trên ảnh" htmlFor="share-name" error={shownError ?? undefined}>
            <input
              id="share-name"
              type="text"
              autoComplete="nickname"
              value={nameDraft}
              onChange={(e) => {
                setNameDraft(limitDisplayName(e.target.value));
                if (nameError) setNameError(null);
              }}
              placeholder="Tên của bạn"
              aria-invalid={nameError ? true : undefined}
              className={`h-[52px] w-full rounded-xl border-2 bg-surface px-4 text-base font-semibold text-text outline-none focus:border-cobalt ${
                nameError ? "border-destructive" : "border-card-border"
              }`}
            />
          </FormRow>
          <PillButton type="submit" variant="primary" disabled={!valid || isSaving} data-align-group="share-actions">
            {isSaving ? "Đang lưu…" : "Tiếp tục"}
          </PillButton>
        </form>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Chia sẻ ngày này" titleId="share-sheet-title" desktopDialog>
      <div className="mx-auto flex h-[min(50dvh,440px)] w-full items-center justify-center">
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element -- a blob URL made in the page, not a file to optimise
          <img
            data-share-image
            src={ready.url}
            alt={ready.alt}
            width={ready.width}
            height={ready.height}
            className="h-auto max-h-full w-auto max-w-full rounded-xl border border-card-border object-contain"
          />
        ) : failure === "generate" ? (
          <div className="aspect-[9/16] h-full rounded-xl border border-card-border bg-surface" />
        ) : (
          <div role="status" className="aspect-[9/16] h-full rounded-xl bg-level-empty motion-safe:animate-pulse">
            <span className="sr-only">Đang tạo ảnh…</span>
          </div>
        )}
      </div>

      <AlertLine show={nameSyncFailed} gap={3} className="m-0 px-1 text-cap leading-snug text-destructive-text">
        Đã lưu tên trên máy này, chưa gửi lên máy chủ được.
      </AlertLine>

      {failure && (
        <div role="alert" className="flex items-center justify-between gap-3 px-1">
          <p className="m-0 text-cap leading-snug text-destructive-text">{FAILURE_TEXT[failure]}</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border-0 bg-transparent px-3 text-cap font-bold text-cobalt active:scale-[0.97] transition-press motion-reduce:active:scale-100"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {ready?.canShare ? (
          <>
            <PillButton type="button" variant="primary" onClick={share} data-align-group="share-actions">
              Chia sẻ
            </PillButton>
            <PillButton type="button" variant="secondary" onClick={save} data-align-group="share-actions">
              Lưu ảnh
            </PillButton>
          </>
        ) : (
          <PillButton type="button" variant="primary" disabled={!ready} onClick={save} data-align-group="share-actions">
            {ready || failure ? "Lưu ảnh" : "Đang tạo ảnh…"}
          </PillButton>
        )}
      </div>

      {open && job && (
        <ShareCapture
          key={attempt}
          model={job}
          onDone={onDone}
          onError={(reason) => {
            setJob(null);
            setFailure(reason);
            if (reason === "fonts") setFontFailures((n) => n + 1);
          }}
        />
      )}
    </Sheet>
  );
}
