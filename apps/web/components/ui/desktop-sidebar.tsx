import Link from "next/link";

export type SidebarTab = "today" | "micros" | "training" | "profile";

const ITEMS: { tab: SidebarTab; href: string; label: string; icon: string }[] = [
  { tab: "today", href: "/today", label: "Hôm nay", icon: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { tab: "micros", href: "/micros", label: "Vi chất", icon: "M5 20V11M12 20V4M19 20v-6" },
  { tab: "training", href: "/training", label: "Ngày tập", icon: "M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" },
  { tab: "profile", href: "/profile", label: "Hồ sơ", icon: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" },
];

/** Left column from 1024 px up. Phone uses BottomNav instead. */
export function DesktopSidebar({ currentTab }: { currentTab: SidebarTab }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-6 bg-ink p-6 text-on-dark box-border lg:flex">
      <div className="px-2 font-display italic font-black text-2xl">
        H1T <span className="text-sky">MICRO</span>
      </div>
      <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const active = item.tab === currentTab;
          return (
            <Link
              key={item.tab}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`no-underline flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors ${
                active ? "bg-card/10 text-on-dark" : "text-muted-on-dark hover:bg-card/5 hover:text-on-dark"
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
