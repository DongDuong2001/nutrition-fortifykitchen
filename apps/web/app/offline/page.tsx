import type { Metadata } from "next";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { RetryButton } from "@/components/pwa/retry-button";

export const metadata: Metadata = { title: "Ngoại tuyến | H1T MICRO" };

/** Shown by the service worker when a page cannot be loaded and is not in the cache. Static, so it is precached. */
export default function OfflinePage() {
  return (
    <AppShell alignContainer="offline-page">
      <AppHeader variant="tab" title="Ngoại tuyến" layout="wide" alignGroup="offline-header" />

      <main className="mx-auto w-full max-w-[560px] px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:px-8 lg:pb-12 lg:pt-5">
        <div className="flex flex-col gap-4 lg:max-w-[560px]">
          <Card as="section" aria-labelledby="offline-title" className="flex flex-col gap-1">
            <h2 id="offline-title" className="m-0 text-base font-bold text-text">
              Bạn đang ngoại tuyến
            </h2>
            <p className="m-0 text-[15px] leading-snug text-secondary">Nhật ký trên máy này vẫn dùng được.</p>
          </Card>
          <RetryButton />
        </div>
      </main>
    </AppShell>
  );
}
