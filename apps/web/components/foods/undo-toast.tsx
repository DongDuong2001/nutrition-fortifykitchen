"use client";

import React, { useEffect, useState } from "react";
import { Toast } from "@/components/ui/toast";
import { useDiary } from "@/lib/diary-store";

/** The undo window, as on the design (EditEntry: "trong 5 giây"). */
const UNDO_MS = 5000;
const TICK_MS = 100;

/**
 * "Đã xoá {tên món}" with Hoàn tác, for the last delete. Shown on every page, so it
 * still appears after the edit screen goes back to Today. It counts down, then goes.
 */
export function UndoToast() {
  const { lastDelete, undoLastDelete, dismissUndo } = useDiary();
  const [percent, setPercent] = useState(100);

  useEffect(() => {
    if (!lastDelete) return;
    const started = Date.now();
    setPercent(100);
    const timer = setInterval(() => {
      const left = 100 - ((Date.now() - started) / UNDO_MS) * 100;
      if (left <= 0) {
        clearInterval(timer);
        dismissUndo();
      } else {
        setPercent(left);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [lastDelete, dismissUndo]);

  if (!lastDelete) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 px-3">
      <div className="pointer-events-auto">
        <Toast
          message={`Đã xoá ${lastDelete.name}`}
          actionLabel="Hoàn tác"
          onAction={undoLastDelete}
          progressPercent={percent}
        />
      </div>
    </div>
  );
}
