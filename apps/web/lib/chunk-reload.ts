// The page side of lib/chunk-reload-script (the inline script in the root layout's <head>). Kept to a few lines: the root layout's
// first-load JS carries this file, so the matching and the 60 s rule live in the script, not here.

declare global {
  interface Window {
    /** Set by the script: "reload" | "toast" | "error", once this page had a chunk error the script caught itself. */
    h1tChunkState?: string;
    /** Set by the script: a chunk error React caught → what the script did ("reload" | "toast" | "error"), "" when it is not a chunk error. */
    h1tChunk?: (error: unknown) => string;
    /** Set by the script: stamps the time and reloads (Tải lại on a screen that is already showing the problem). */
    h1tChunkReload?: () => void;
    /** Set by components/unsaved-work-watch: something typed or held that a reload would lose. */
    h1tUnsaved?: () => boolean;
  }
}

/** A chunk error React caught (an error screen): reloads once when it may, and answers what happened; "" when it is not a chunk error. */
export const chunkOutcome = (error: unknown): string => (typeof window === "undefined" ? "" : (window.h1tChunk?.(error) ?? ""));

/** Tải lại: the person asked, so it reloads whatever the 60 s stamp says (and stamps, so a page that still fails shows the error screen). */
export const reloadPage = (): void => (window.h1tChunkReload ? window.h1tChunkReload() : window.location.reload());
