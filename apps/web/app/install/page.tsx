import type { Metadata } from "next";
import { AppHeader } from "@/components/ui/app-header";
import { StatusMark } from "@/components/onboarding/status-screen";
import { InstallPanel } from "@/components/pwa/install-panel";

export const metadata: Metadata = { title: "Cài ứng dụng | H1T MICRO" };

/**
 * Cài ứng dụng: the install state of this device (components/pwa/install-panel). Linked from Cài đặt.
 * V3 (§3.6): the large title with Back, the app's icon in a 72 px tinted circle, the line about it, then the state of this
 * device; the button of a browser that can install sits at the bottom. No bottom nav, as design/IA-v2.md decided for /install;
 * the bottom padding keeps the last card above the gesture bar.
 */
export default function InstallAppPage() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-page font-sans text-text" data-align-container="install-page">
      <AppHeader variant="sub" title="Cài ứng dụng" backHref="/settings" layout="wide" alignGroup="install-header" />

      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-2 lg:mx-0 lg:max-w-[1240px] lg:px-8 lg:pb-12 lg:pt-5">
        <div className="flex flex-1 flex-col gap-4 lg:max-w-[560px] lg:flex-none">
          <section aria-label="H1T MICRO" className="flex flex-col items-center gap-4 text-center">
            <StatusMark tone="cobalt">
              <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-[11px]" />
            </StatusMark>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="m-0 text-body-lg font-bold leading-tight text-text">H1T MICRO</p>
              <p className="m-0 text-callout leading-normal text-secondary">Mở nhanh như ứng dụng, dùng được cả khi mất mạng</p>
            </div>
          </section>
          <InstallPanel />
        </div>
      </main>
    </div>
  );
}
