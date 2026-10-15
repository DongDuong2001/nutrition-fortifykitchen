"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getFontEmbedCSS, toBlob } from "html-to-image";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import type { HomeEntry, HomeMeal } from "@/lib/home";
import type { MockDayData } from "@/lib/mock/sample-day";
import { SHARE_CSS_WIDTH, SHARE_SCALE, SHARE_WIDTH, buildShareModel, shareImageHeight, type ShareModel } from "@/lib/share-card";
import { ShareDay } from "./share-day";
import { countedForLevel } from "@/lib/level-nutrients";
import type { Level } from "@/lib/coaching-link";

type Failure = "generate" | "share" | "save";

interface Ready {
  file: File;
  url: string;
  alt: string;
  height: number;
  /** Files can be handed to the share sheet of this device (iOS, Android); desktop browsers mostly cannot. */
  canShare: boolean;
}

const FAILURE_TEXT: Record<Failure, string> = {
  generate: "Không tạo được ảnh.",
  share: "Không chia sẻ được.",
  save: "Không lưu được ảnh.",
};

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Draws the page (a ShareDay in an off-screen portal) into a 1080-px-wide PNG and hands the file up. The page is
 * mounted only while the picture is made, so it never lingers in the DOM next to the real screen.
 */
function ShareCapture({ model, onDone, onError }: { model: ShareModel; onDone: (file: File, height: number) => void; onError: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onDone, onError });
  callbacks.current = { onDone, onError };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const node = hostRef.current?.querySelector<HTMLElement>("[data-share-root]");
      if (!node) throw new Error("no share root");
      // Fonts first: a size measured before they load would be wrong, and the image would use the fallback face
      await document.fonts.ready;
      await nextFrame();
      await nextFrame();
      const cssHeight = node.getBoundingClientRect().height;
      const height = shareImageHeight(cssHeight);
      const fontEmbedCSS = await getFontEmbedCSS(node);
      // The page is scaled by layout (transform on the clone), so text stays vector-sharp at 1080 px
      const blob = await toBlob(node, {
        width: SHARE_WIDTH,
        height,
        pixelRatio: 1,
        fontEmbedCSS,
        // A page height that is not a whole number of image rows must not leave a see-through last row
        backgroundColor: getComputedStyle(node).backgroundColor,
        style: {
          transform: `scale(${SHARE_SCALE})`,
          transformOrigin: "top left",
          width: `${SHARE_CSS_WIDTH}px`,
          height: `${height / SHARE_SCALE}px`,
          minHeight: `${height / SHARE_SCALE}px`,
        },
      });
      if (!blob) throw new Error("no image");
      if (!cancelled) callbacks.current.onDone(new File([blob], model.filename, { type: "image/png" }), height);
    })().catch(() => {
      if (!cancelled) callbacks.current.onError();
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
}) {
  const [ready, setReady] = useState<Ready | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [job, setJob] = useState<ShareModel | null>(null);
  // The latest day, read when the page is drawn; a change to it while the sheet is open does not redraw it
  const latest = useRef({ day, entries, meals, finished, displayName, level });
  latest.current = { day, entries, meals, finished, displayName, level };

  useEffect(() => {
    if (!open) return;
    setReady(null);
    setFailure(null);
    const { level: current, ...rest } = latest.current;
    setJob(buildShareModel({ ...rest, level: current, now: new Date(), nutrientIds: countedForLevel(current) }));
    return () => {
      setJob(null);
      // The revoked URL must not show for a frame when the sheet opens again
      setReady(null);
    };
  }, [open, attempt]);

  const urlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  const onDone = useCallback(
    (file: File, height: number) => {
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
      setReady({ file, url, alt, height, canShare });
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
      navigator.share({ files: [ready.file], title: "H1T MICRO" }).catch(failed);
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
    } catch {
      setFailure("save");
    }
  }, [ready]);

  const retry = () => {
    if (failure === "share") share();
    else if (failure === "save") save();
    else setAttempt((n) => n + 1);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Chia sẻ ngày này" titleId="share-sheet-title" desktopDialog>
      <div className="mx-auto flex h-[min(50dvh,440px)] w-full items-center justify-center">
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element -- a blob URL made in the page, not a file to optimise
          <img
            src={ready.url}
            alt={ready.alt}
            width={SHARE_WIDTH}
            height={ready.height}
            className="h-auto max-h-full w-auto max-w-full rounded-xl border border-card-border object-contain"
          />
        ) : failure === "generate" ? (
          <div className="aspect-[9/16] h-full rounded-xl border border-card-border bg-page" />
        ) : (
          <div role="status" className="aspect-[9/16] h-full rounded-xl bg-level-empty motion-safe:animate-pulse">
            <span className="sr-only">Đang tạo ảnh…</span>
          </div>
        )}
      </div>

      {failure && (
        <div role="alert" className="flex items-center justify-between gap-3 px-1">
          <p className="m-0 text-[13px] leading-snug text-destructive-text">{FAILURE_TEXT[failure]}</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center rounded-full border-0 bg-transparent px-3 text-[13px] font-bold text-blue active:scale-[0.97] motion-reduce:active:scale-100"
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
          onError={() => {
            setJob(null);
            setFailure("generate");
          }}
        />
      )}
    </Sheet>
  );
}
