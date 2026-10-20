import type { Metadata } from "next";
import { AppHeader } from "@/components/ui/app-header";
import { Card } from "@/components/ui/card";
import { InstallPanel } from "@/components/pwa/install-panel";

export const metadata: Metadata = { title: "Cài ứng dụng | H1T MICRO" };

/**
 * Cài ứng dụng: the install state of this device (components/pwa/install-panel). Linked from Cài đặt.
 * No bottom nav, as design/IA-v2.md decided for /install; the bottom padding keeps the last card above the gesture bar.
 */
export default function InstallAppPage() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-page font-sans text-text" data-align-container="install-page">
      <AppHeader variant="sub" title="Cài ứng dụng" backHref="/settings" layout="wide" alignGroup="install-header" />

      <main className="mx-auto w-full max-w-[560px] px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 lg:mx-0 lg:max-w-[1240px] lg:px-8 lg:pb-12 lg:pt-5">
        <div className="flex flex-col gap-4 lg:max-w-[560px]">
          <Card as="section" aria-label="H1T MICRO" className="flex items-center gap-4">
            <img src="/icons/icon-192.png" alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-card" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="m-0 text-base font-bold leading-tight text-text">H1T MICRO</p>
              <p className="m-0 text-cap leading-snug text-secondary">Mở nhanh như ứng dụng, dùng được cả khi mất mạng</p>
            </div>
          </Card>
          <InstallPanel />
        </div>
      </main>
    </div>
  );
}
