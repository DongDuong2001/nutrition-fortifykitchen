"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAccount } from "@/components/settings/use-account";
import { useDiary } from "@/lib/diary-store";

const Mark = createContext("H1T MICRO");

/**
 * A coach's lesson made hard to take away (what Tài liệu did for its text, now for the pages too): nothing in it can be selected,
 * copied, dragged, saved or printed, it blurs while the app is not in front (an app switcher's preview, a screen tool taking focus),
 * and the reader's account runs across every page, so a photo of the screen still says whose it was. A browser cannot stop the
 * phone's own screenshot.
 */
export function ProtectedSurface({ children }: { children: React.ReactNode }) {
  const { account } = useAccount();
  const { profile } = useDiary();
  const [away, setAway] = useState(false);
  const owner = account?.email || profile.displayName || "H1T MICRO";
  const mark = `${owner} · ${new Date().toLocaleDateString("vi-VN")}`;

  useEffect(() => {
    const leave = () => setAway(true);
    const back = () => setAway(document.hidden);
    const onVisibility = () => setAway(document.hidden);
    // The save, print and copy shortcuts do nothing while a lesson is open
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["p", "s", "c", "a", "x"].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === "PrintScreen") setAway(true);
    };
    window.addEventListener("blur", leave);
    window.addEventListener("focus", back);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", back);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  const block = (e: React.SyntheticEvent) => e.preventDefault();
  return (
    <Mark.Provider value={mark}>
      <div
        data-protected
        data-away={away || undefined}
        onCopy={block}
        onCut={block}
        onContextMenu={block}
        onDragStart={block}
        className={`select-none transition-[filter] duration-150 print:hidden [-webkit-touch-callout:none] [-webkit-user-select:none] ${away ? "blur-md" : ""}`}
      >
        {children}
      </div>
      <p className="m-0 hidden text-callout print:block">Tài liệu này không in được.</p>
    </Mark.Provider>
  );
}

/** The reader's account, repeated across a page at an angle (design/courses Reader): quiet enough to read through. */
export function Watermark() {
  const mark = useContext(Mark);
  return (
    <div aria-hidden="true" data-watermark className="pointer-events-none absolute -inset-8 flex -rotate-[20deg] flex-col justify-around overflow-hidden text-cap font-semibold text-text opacity-[0.09]">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="w-max whitespace-nowrap">
          {`${mark}   ${mark}   ${mark}`}
        </span>
      ))}
    </div>
  );
}
