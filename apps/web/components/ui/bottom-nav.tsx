"use client";

import React, { startTransition, useOptimistic } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NAV_TABS, type NavTab } from "@/lib/nav";
import { useActiveTab } from "@/lib/use-active-tab";
import { NavIcon, PlusIcon } from "@/components/ui/nav-icons";
import { openAddFrom } from "@/components/ui/add-opener";

export interface BottomNavProps {
  /** Overrides the tab taken from the URL. Pushed screens leave it out: the owning tab is found from the path. */
  currentTab?: NavTab;
  className?: string;
}

/**
 * H1T MICRO tab bar (V3-SPEC §4): Hôm nay · Tổng quan · [+] · Khám phá · Cài đặt, a floating Liquid Glass capsule
 * 16 px in from the sides and 24 px above the bottom (safe area added), 64 px tall; content scrolls under it.
 * Labels in --color-glass-tab-off; the selected tab's icon is filled and it and its label are cobalt. The + is a 52 px
 * cobalt tinted-glass circle with its glow (D-NAV-07: an action, never selected like a tab).
 */
export function BottomNav({ currentTab, className = "" }: BottomNavProps) {
  const router = useRouter();
  const current = useActiveTab(currentTab);
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
        className={`m-tint relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-full text-micro leading-tight no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100 ${
          isActive ? "font-bold text-cobalt" : "font-semibold text-glass-tab-off hover:text-text"
        }`}
      >
        <NavIcon tab={item.tab} filled={isActive} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <nav aria-label="Điều hướng chính" className={`m-vt-nav w-full select-none box-border ${className}`}>
      <div className="glass mx-auto grid h-16 w-full max-w-[528px] grid-cols-5 items-center rounded-full px-1">
        {renderTab(first)}
        {renderTab(second)}

        <div className="flex items-center justify-center">
          <Link
            id="mobile-add-fab"
            data-testid="add-fab"
            data-tour="nav-add"
            href="/add"
            onClick={(e) => openAddFrom("mobile-add-fab", e, router)}
            aria-label="Thêm món"
            className="glass-cobalt flex h-[52px] w-[52px] items-center justify-center rounded-full text-on-accent no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100"
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
