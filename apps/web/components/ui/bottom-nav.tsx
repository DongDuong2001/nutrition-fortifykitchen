"use client";

import React, { startTransition, useOptimistic } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS, tabForPath, type NavTab } from "@/lib/nav";
import { NavIcon, PlusIcon } from "@/components/ui/nav-icons";
import { rememberAddOpener } from "@/components/ui/add-opener";

export interface BottomNavProps {
  /** Overrides the tab taken from the URL. Pushed screens leave it out: the owning tab is found from the path. */
  currentTab?: NavTab;
  className?: string;
}

/**
 * H1T MICRO bottom navigation (Cobalt Sign): Hôm nay · Tổng quan · [+] · Khám phá · Cài đặt.
 * Full-bleed on <1024px with content centered at max-w-[560px] and 16px side padding.
 * The active tab gets on-dark text plus a slanted bar (skewX(-14deg)); the text itself stays unslanted.
 */
export function BottomNav({ currentTab, className = "" }: BottomNavProps) {
  const pathname = usePathname();
  const current = currentTab ?? tabForPath(pathname);
  // cc-58: the tapped tab lights up on the tap, not when the next screen is ready
  const [active, setActive] = useOptimistic(current);
  const [first, second, third, fourth] = NAV_TABS;

  const renderTab = (item: (typeof NAV_TABS)[number]) => {
    const isActive = item.tab === active;
    return (
      <Link
        key={item.tab}
        href={item.href}
        onNavigate={() => startTransition(() => setActive(item.tab))}
        data-tour={item.tab === "settings" ? "nav-settings" : item.tab === "explore" ? "nav-explore" : undefined}
        aria-current={isActive ? "page" : undefined}
        className={`relative flex flex-col items-center justify-center gap-[2px] min-h-14 text-xs font-semibold no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100 ${
          isActive ? "text-on-dark" : "text-muted-on-dark hover:text-on-dark"
        }`}
      >
        <NavIcon tab={item.tab} />
        <span className="text-micro leading-tight">{item.label}</span>
        {isActive && (
          <span
            className="absolute bottom-1 w-5 h-[3px] rounded-[1px] bg-cobalt"
            style={{ transform: "skewX(-14deg)" }}
            aria-hidden="true"
          />
        )}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Điều hướng chính"
      className={`m-vt-nav h-[calc(72px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] flex-none bg-ink w-full select-none box-border ${className}`}
    >
      <div className="w-full max-w-[560px] mx-auto px-4 h-[72px] grid grid-cols-5 items-center">
        {renderTab(first)}
        {renderTab(second)}

        <div className="flex justify-center items-center">
          <Link
            id="mobile-add-fab"
            data-testid="add-fab"
            data-tour="nav-add"
            href="/add"
            onClick={() => rememberAddOpener("mobile-add-fab")}
            aria-label="Thêm món"
            className="w-[50px] h-[50px] rounded-full bg-cobalt text-on-accent flex items-center justify-center no-underline shadow-md active:scale-[0.97] transition-press motion-reduce:active:scale-100 "
          >
            <PlusIcon />
          </Link>
        </div>

        {renderTab(third)}
        {renderTab(fourth)}
      </div>
    </nav>
  );
}
