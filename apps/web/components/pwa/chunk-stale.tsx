"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// The toast is loaded only when it is needed
const ChunkOffer = dynamic(() => import("@/components/pwa/chunk-offer"), { ssr: false });

/** What the script said (window.h1tChunkState): "error" raises the app's error screen, "toast" offers the update, anything else is nothing. */
export function ChunkStaleView({ state }: { state: string }) {
  if (state === "error") throw Object.assign(new Error("Loading chunk failed"), { name: "ChunkLoadError" });
  return state === "toast" ? <ChunkOffer /> : null;
}

/**
 * Mounted once in the root layout. lib/chunk-reload-script reloads a page whose chunks are gone by itself; when it may not it says so
 * here (the "h1t:chunk" event, or window.h1tChunkState if that came before this mounted): "toast" offers the update while something is
 * typed, or for a bare rejection (a background import) on a second failure; "error" is a failed <script> of the build on a second
 * failure inside 60 s, shown as the app's error screen (app/global-error.tsx) with Tải lại, never a loop.
 */
export function ChunkStale() {
  const [state, setState] = useState("");
  useEffect(() => {
    const read = () => setState(window.h1tChunkState ?? "");
    read();
    window.addEventListener("h1t:chunk", read);
    return () => window.removeEventListener("h1t:chunk", read);
  }, []);
  return <ChunkStaleView state={state} />;
}
