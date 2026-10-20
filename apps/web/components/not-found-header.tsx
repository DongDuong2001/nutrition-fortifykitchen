"use client";

import { Suspense, lazy } from "react";

/**
 * The 404 page's header. The root 404 is part of every screen's payload, so a static AppHeader import would put the
 * header (and its date formatting) in the first-load JS of /landing and /signin too. Loaded lazily, its chunk comes only
 * when a 404 is shown: the server still renders it (nothing appears late) and the client hydrates it when the chunk is
 * in. React.lazy, not next/dynamic: dynamic's preload tag is refused by the service worker (a console warning).
 */
const AppHeader = lazy(() => import("@/components/ui/app-header").then((m) => ({ default: m.AppHeader })));

export function NotFoundHeader() {
  return (
    <Suspense fallback={null}>
      <AppHeader variant="tab" title="Không tìm thấy trang" />
    </Suspense>
  );
}
