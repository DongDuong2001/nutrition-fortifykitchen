"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import type { MockDayData } from "@/lib/mock/sample-day";
import { buildShareCard, shareCardAlt } from "@/lib/share-card";
import { renderShareCard } from "./share-card-canvas";

type Failure = "generate" | "share" | "save";

interface Ready {
  file: File;
  url: string;
  alt: string;
  /** Files can be handed to the share sheet of this device (iOS, Android); desktop browsers mostly cannot. */
  canShare: boolean;
}

const FAILURE_TEXT: Record<Failure, string> = {
  generate: "Không tạo được ảnh.",
  share: "Không chia sẻ được.",
  save: "Không lưu được ảnh.",
};

/**
 * Chia sẻ ngày này: draws the day-summary card as a 1080×1920 PNG when it opens (client side, no network) and
 * keeps the file ready, so Chia sẻ calls navigator.share inside the tap. Without file sharing, Lưu ảnh is the
 * primary button. A cancelled share sheet (AbortError) is not an error.
 */
export function ShareSheet({ open, onClose, day, finished }: { open: boolean; onClose: () => void; day: MockDayData; finished: boolean }) {
  const [ready, setReady] = useState<Ready | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The latest day, read when the card is drawn; a change to it while the sheet is open does not redraw it
  const dayRef = useRef({ day, finished });
  dayRef.current = { day, finished };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let url: string | null = null;
    setReady(null);
    setFailure(null);
    const model = buildShareCard({ ...dayRef.current, now: new Date() });
    renderShareCard(model)
      .then((file) => {
        if (cancelled) return;
        url = URL.createObjectURL(file);
        let canShare = false;
        try {
          canShare = typeof navigator.canShare === "function" && typeof navigator.share === "function" && navigator.canShare({ files: [file] });
        } catch {
          // Some browsers throw for a file type they do not know: no file sharing, Lưu ảnh stays
        }
        setReady({ file, url, alt: shareCardAlt(model), canShare });
      })
      .catch(() => {
        if (!cancelled) setFailure("generate");
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      // The revoked URL must not show for a frame when the sheet opens again
      setReady(null);
    };
  }, [open, attempt]);

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
          <img src={ready.url} alt={ready.alt} className="aspect-[9/16] h-full rounded-xl border border-card-border" />
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
    </Sheet>
  );
}
