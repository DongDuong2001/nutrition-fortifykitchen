"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { startInstallCapture } from "@/lib/install-browser";
import { shouldRegisterServiceWorker } from "@/lib/pwa";
import { whenIdle } from "@/lib/idle";
import { getSyncSummary, isSyncBusy, subscribeSyncSummary } from "@/lib/sync-ui";
import { hasUnsavedWork, subscribeUnsavedWork } from "@/lib/unsaved-work";
import { shouldReloadStaleTab } from "@/lib/update-phase";

// The toast and its wait for the outbox are loaded when an update is waiting
const UpdateOffer = dynamic(() => import("@/components/pwa/update-offer"), { ssr: false });

/**
 * Registers /sw.js in production and offers an update when a new version is waiting.
 * The new worker takes over when the person taps "Tải lại", or (components/pwa/update-offer) when the app is in the background;
 * either way only with nothing waiting in the outbox and nothing in hand (lib/unsaved-work: a tray, a portion sheet, a form), so a
 * person in the middle of an edit is never reloaded. Mounted once in the root layout.
 *
 * Every tab of the app is taken over at once. A tab that did not ask for it keeps running the old code until it reloads itself, and
 * does that only while it is in the background with nothing waiting or held, on its own next visibilitychange; the tab that asked
 * checks again at the takeover, because something may have been started since it asked.
 */
export function PwaRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const applying = useRef(false);
  const apply = useRef(() => {
    applying.current = true;
  }).current;

  useEffect(() => {
    startInstallCapture();
  }, []);

  useEffect(() => {
    if (!shouldRegisterServiceWorker(process.env.NODE_ENV, "serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;

    // The page runs old code once a new worker has taken over: it reloads when that is safe (see the comment above the component)
    let controlled = !!container.controller;
    let stale = false;
    const maybeReload = () => {
      if (!stale) return;
      const busy = isSyncBusy(getSyncSummary());
      const editing = hasUnsavedWork();
      const asked = applying.current && !busy && !editing;
      if (asked || shouldReloadStaleTab({ stale, hidden: document.visibilityState === "hidden", busy, editing })) {
        stale = false;
        window.location.reload();
      }
    };
    const onControllerChange = () => {
      // The first install claiming the page is not an update
      const wasControlled = controlled;
      controlled = !!container.controller;
      if (!wasControlled) return;
      stale = true;
      maybeReload();
    };
    container.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", maybeReload);
    const unsubscribeSync = subscribeSyncSummary(maybeReload);
    const unsubscribeUnsaved = subscribeUnsavedWork(maybeReload);

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

    // cc-58: the worker registers after the page has loaded and the browser is idle, not during hydration, so its
    // first install does not compete with the first paint
    let cancelled = false;
    let cancelIdle = () => {};
    const register = () => {
      if (cancelled) return;
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
    };
    const afterLoad = () => {
      cancelIdle = whenIdle(register, 5000);
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });

    return () => {
      cancelled = true;
      cancelIdle();
      window.removeEventListener("load", afterLoad);
      container.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", maybeReload);
      document.removeEventListener("visibilitychange", onVisible);
      unsubscribeSync();
      unsubscribeUnsaved();
    };
  }, []);

  return waiting ? <UpdateOffer worker={waiting} onApply={apply} /> : null;
}
