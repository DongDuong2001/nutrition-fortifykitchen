"use client";

import { startTransition, useOptimistic } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS, tabForPath, type NavTab } from "@/lib/nav";
import { NavIcon, PlusIcon } from "@/components/ui/nav-icons";
import { rememberAddOpener } from "@/components/ui/add-opener";

/**
 * Left column from 1024 px up (the phone uses BottomNav): logo, the primary "Thêm món" button, then the four tabs
 * in the same order, with the same icons and labels, as the bottom nav.
 */
export function DesktopSidebar({ currentTab }: { currentTab?: NavTab }) {
  const pathname = usePathname();
  // cc-58: the tapped tab lights up on the tap, not when the next screen is ready
  const [active, setActive] = useOptimistic(currentTab ?? tabForPath(pathname));

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-6 bg-ink p-6 text-on-dark box-border lg:flex">
      <div className="px-2 font-display italic font-black text-2xl">
        H1T <span className="text-sky">MICRO</span>
      </div>
      <Link
        id="desktop-add-btn"
        data-tour="nav-add"
        href="/add"
        onClick={() => rememberAddOpener("desktop-add-btn")}
        className="no-underline flex h-12 items-center justify-center gap-2 rounded-full bg-blue text-on-accent text-[15px] font-bold hover:bg-blue/90 active:scale-[0.97] motion-reduce:active:scale-100 transition-press"
      >
        <PlusIcon size={18} />
        Thêm món
      </Link>
      <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
        {NAV_TABS.map((item) => {
          const isActive = item.tab === active;
          return (
            <Link
              key={item.tab}
              href={item.href}
              onNavigate={() => startTransition(() => setActive(item.tab))}
              data-tour={item.tab === "settings" ? "nav-settings" : item.tab === "explore" ? "nav-explore" : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`no-underline flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors ${
                isActive ? "bg-card/10 text-on-dark" : "text-muted-on-dark hover:bg-card/5 hover:text-on-dark"
              }`}
            >
              <NavIcon tab={item.tab} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
