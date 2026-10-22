import { NotFoundReport } from "@/components/not-found-report";
import { PillButton } from "@/components/ui/pill-button";
import { OVERVIEW_ROUTE } from "@/lib/home-route";

// A server component: the screens around it do not load its buttons with their own first-load JS (the header is plain markup, no AppHeader)
export default function NotFound() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-page font-sans text-text select-none">
      {/* V3 status screen (§3.6): the 404 mark where the circle would be, then the centred title and body; the buttons at the bottom */}
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center gap-4 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] text-center lg:justify-center">
        <div className="flex flex-col items-stretch gap-2">
          <div aria-hidden="true" className="font-display text-[5rem] font-black italic leading-[0.9] tracking-display tabular-nums text-ink">
            404
          </div>
          <div aria-hidden="true" className="h-2 rounded-full bg-ink" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-balance font-display text-display font-black italic uppercase leading-[1.1] tracking-display">Không có trang</h1>
          <p className="m-0 text-callout leading-normal text-secondary">Đường dẫn có thể đã cũ hoặc bị gõ sai.</p>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <PillButton variant="primary" href={OVERVIEW_ROUTE} fullWidth>
          Về Tổng quan
        </PillButton>
        <NotFoundReport />
      </footer>
    </div>
  );
}
