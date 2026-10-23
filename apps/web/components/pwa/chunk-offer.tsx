"use client";

import React, { useEffect, useState } from "react";
import { Toast } from "@/components/ui/toast";
import { reloadPage } from "@/lib/chunk-reload";
import { setUpdateBar } from "@/lib/update-bar";
import { useHasUnsavedWork } from "@/lib/unsaved-work";

/**
 * The page asked for files a new version removed, and the person has something typed or open (lib/unsaved-work), so it does not reload
 * by itself. Same place and rule as the "Có bản mới" toast (components/pwa/update-offer): a tap on Tải lại reloads at once, or, while
 * something is still in hand, as soon as they are done with it.
 */
export default function ChunkOffer() {
  const [tapped, setTapped] = useState(false);
  const editing = useHasUnsavedWork();

  useEffect(() => {
    if (tapped && !editing) reloadPage();
  }, [tapped, editing]);
  useEffect(() => {
    setUpdateBar(true);
    return () => setUpdateBar(false);
  }, []);

  const waiting = tapped && editing;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-sheet px-3 pb-2 lg:inset-x-auto lg:bottom-24 lg:right-8 lg:w-[400px] lg:pb-0">
      <div className="pointer-events-auto">
        <Toast
          message={waiting ? "Có bản cập nhật · bạn xong việc đang làm là tải lại" : "Có bản cập nhật"}
          actionLabel={waiting ? undefined : "Tải lại"}
          onAction={() => setTapped(true)}
        />
      </div>
    </div>
  );
}
