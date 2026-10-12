"use client";

import React from "react";
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
 * H1T MICRO bottom navigation (Cobalt Sign): Tổng quan · Nhật ký · [+] · Khám phá · Cài đặt.
 * Full-bleed on <1024px with content centered at max-w-[560px] and 16px side padding.
 * The active tab gets on-dark text plus a slanted bar (skewX(-14deg)); the text itself stays unslanted.
 */
export function BottomNav({ currentTab, className = "" }: BottomNavProps) {
  const pathname = usePathname();
  const active = currentTab ?? tabForPath(pathname);
  const [first, second, third, fourth] = NAV_TABS;

  const renderTab = (item: (typeof NAV_TABS)[number]) => {
    const isActive = item.tab === active;
    return (
      <Link
        key={item.tab}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={`relative flex flex-col items-center justify-center gap-[2px] min-h-[56px] text-xs font-semibold no-underline transition-colors active:scale-[0.97] motion-reduce:active:scale-100 ${
          isActive ? "text-on-dark" : "text-muted-on-dark hover:text-on-dark"
        }`}
      >
        <NavIcon tab={item.tab} />
        <span className="text-[11px] leading-tight">{item.label}</span>
        {isActive && (
          <span
            className="absolute bottom-1 w-5 h-[3px] rounded-[1px] bg-blue"
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
      className={`h-[calc(72px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] flex-none bg-ink w-full select-none box-border ${className}`}
    >
      <div className="w-full max-w-[560px] mx-auto px-4 h-[72px] grid grid-cols-5 items-center">
        {renderTab(first)}
        {renderTab(second)}

        <div className="flex justify-center items-center">
          <Link
            id="mobile-add-fab"
            href="/add"
            onClick={() => rememberAddOpener("mobile-add-fab")}
            aria-label="Thêm món"
            className="w-[50px] h-[50px] rounded-[14px] bg-blue text-on-accent flex items-center justify-center no-underline shadow-md active:scale-[0.97] motion-reduce:active:scale-100 transition-transform"
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
