"use client";

import React, { useEffect, useRef, useState } from "react";
import { Toast } from "@/components/ui/toast";
import { shouldRegisterServiceWorker } from "@/lib/pwa";

/**
 * Registers /sw.js in production and offers an update when a new version is waiting.
 * The new worker never takes over by itself: it activates only after "Tải lại" is tapped, so a person
 * in the middle of an edit is never reloaded. Mounted once in the root layout.
 */
export function PwaRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const applying = useRef(false);

  useEffect(() => {
    if (!shouldRegisterServiceWorker(process.env.NODE_ENV, "serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;

    const onControllerChange = () => {
      // Only a tap on "Tải lại" reloads; the first install claiming the page must not.
      if (applying.current) window.location.reload();
    };
    container.addEventListener("controllerchange", onControllerChange);

    let registration: ServiceWorkerRegistration | undefined;
    const watch = (worker: ServiceWorker) => {
      worker.addEventListener("statechange", () => {
        // "installed" with an existing controller means this is an update, not the first install.
        if (worker.state === "installed" && container.controller) setWaiting(worker);
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    };

    container
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        registration = reg;
        if (reg.waiting && container.controller) setWaiting(reg.waiting);
        if (reg.installing) watch(reg.installing);
        reg.addEventListener("updatefound", () => reg.installing && watch(reg.installing));
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch(() => {
        /* the app works without it */
      });

    return () => {
      container.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!waiting) return null;

  const reload = () => {
    applying.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(168px+env(safe-area-inset-bottom))] z-50 px-3 lg:inset-x-auto lg:bottom-24 lg:right-8 lg:w-[400px]">
      <div className="pointer-events-auto">
        <Toast message="Có bản mới" actionLabel="Tải lại" onAction={reload} />
      </div>
    </div>
  );
}
