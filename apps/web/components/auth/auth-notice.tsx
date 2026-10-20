"use client";

import { useEffect, useState } from "react";
import { Presence } from "@/components/ui/presence";
import { Toast } from "@/components/ui/toast";
import { takeAuthNotice } from "@/lib/auth-actions";

const SHOW_MS = 3000;

/** The toast for an auth or account action that finished on the previous screen (see setAuthNotice). */
export function AuthNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const notice = takeAuthNotice();
    if (notice) setMessage(notice);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <Presence>
      {message && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-sheet px-3 lg:inset-x-auto lg:bottom-8 lg:right-8 lg:w-[400px]">
          <div className="pointer-events-auto">
            <Toast message={message} />
          </div>
        </div>
      )}
    </Presence>
  );
}
