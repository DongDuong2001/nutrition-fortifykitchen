import type { Metadata } from "next";
import Link from "next/link";
import { StatusGlyph, StatusScreen } from "@/components/onboarding/status-screen";
import { RetryButton } from "@/components/pwa/retry-button";
import { HOME_ROUTE } from "@/lib/home-route";

export const metadata: Metadata = { title: "Ngoại tuyến | H1T MICRO" };

/**
 * Shown by the service worker when a page cannot be loaded and is not in the cache. Static, so it is precached.
 * V3 status screen (§3.6): no header and no navigation, the amber circle, the title, the saved-data note, then the two buttons.
 */
export default function OfflinePage() {
  return (
    <StatusScreen
      tone="amber"
      icon={
        <StatusGlyph>
          <path d="M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 3.4-2.1M12 7.5a14 14 0 0 1 9 3.4M2 10.9A14 14 0 0 1 5.5 8.2M12 20h.01" />
        </StatusGlyph>
      }
      title="Ngoại tuyến"
      body={
        <p role="status" className="m-0 rounded-xl bg-warning-bg px-3 py-2 text-cap font-semibold text-warning-text">
          Đang ngoại tuyến · dữ liệu đã lưu
        </p>
      }
      actions={
        <>
          <RetryButton />
          <Link
            href={HOME_ROUTE}
            className="box-border flex h-[52px] items-center justify-center rounded-full border border-transparent bg-card text-base font-bold text-text no-underline shadow-ring transition-press active:scale-[0.97] motion-reduce:active:scale-100"
          >
            Mở Hôm nay
          </Link>
        </>
      }
    >
      <section aria-labelledby="offline-title" className="mt-4 flex flex-col items-center gap-2 text-center">
        <h2 id="offline-title" className="m-0 text-body-lg font-bold text-text">
          Bạn đang ngoại tuyến
        </h2>
        <p className="m-0 text-callout leading-snug text-secondary">Dữ liệu đã ghi trên máy này vẫn dùng được.</p>
        <p className="m-0 text-cap leading-snug text-secondary">Trang bạn vừa mở chưa được lưu trên máy, nên cần có mạng mới xem được.</p>
      </section>
    </StatusScreen>
  );
}
