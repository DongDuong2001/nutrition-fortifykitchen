"use client";

import React from "react";
import { PillButton } from "@/components/ui/pill-button";

/**
 * "Thử lại" on the offline screen. The service worker answers any failed page load with /offline, so the
 * address bar still shows the page that was asked for: reloading tries that page again. Opened directly
 * at /offline, there is nothing to retry and it goes to the app.
 */
export function RetryButton() {
  const retry = () => {
    if (window.location.pathname === "/offline") window.location.replace("/");
    else window.location.reload();
  };
  return (
    <PillButton type="button" onClick={retry}>
      Thử lại
    </PillButton>
  );
}
