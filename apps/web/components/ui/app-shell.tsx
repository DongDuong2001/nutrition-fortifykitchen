"use client";

import React, { createContext, useContext, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/ui/bottom-nav";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";

/**
 * The page frame for a screen with the main navigation: the desktop sidebar on the left (from 1024 px),
 * the bottom nav on a phone, and the page in between. The tab to highlight comes from the URL (lib/nav.ts).
 */
export function AppShell({
  children,
  alignContainer,
  cta,
  bottomBar,
}: {
  children: React.ReactNode;
  /** A sticky primary action (the add button on a food). On a phone it sits just above the bottom nav. */
  cta?: React.ReactNode;
  /** Value for data-align-container, when the alignment check scopes its groups to this page. */
  alignContainer?: string;
  /** Takes the bottom nav's place (a select-mode action bar, up to 112 px high): fixed at the bottom on every width. */
  bottomBar?: React.ReactNode;
}) {
  return (
    <div
      data-align-container={alignContainer}
      className="flex min-h-dvh w-full flex-col bg-page text-text font-sans lg:flex-row"
    >
      <DesktopSidebar />
      {/* cc-55: no fade on a screen change; pushes and Back slide as view transitions (components/route-transition) */}
      <div
        className={`flex min-w-0 flex-1 flex-col ${
          bottomBar
            ? "pb-[calc(112px+env(safe-area-inset-bottom))]"
            : cta
              ? "pb-[calc(168px+env(safe-area-inset-bottom))] lg:pb-24"
              : "pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0"
        }`}
      >
        {children}
      </div>
      {cta && (
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 border-t border-card-border bg-page/95 p-3 backdrop-blur-sm lg:bottom-0 lg:left-60">
          <div className="mx-auto w-full max-w-[560px]">{cta}</div>
        </div>
      )}
      {bottomBar ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-card-border bg-card pb-[env(safe-area-inset-bottom)] lg:left-60">{bottomBar}</div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink lg:hidden">
          <BottomNav />
        </div>
      )}
    </div>
  );
}

// ---- cc-57: the frame the four tabs share ----
// app/(tabs)/layout.tsx renders TabsShell once, so a tap on a bottom tab keeps the sidebar, the nav and its active
// state mounted and only swaps the page. A page that needs the bar slot (Hôm nay's select mode) asks for it with
// useShellBottomBar and portals into the host div it gets back.
interface ShellSlot {
  setBarActive: (active: boolean) => void;
  barHost: HTMLElement | null;
}
const ShellSlotContext = createContext<ShellSlot | null>(null);

/** The data-align-container of each tab page (the alignment check scopes its groups to it). */
const TAB_ALIGN_CONTAINER: [prefix: string, name: string][] = [
  ["/app", "home-page"],
  ["/trends", "overview-page"],
  ["/explore", "add-list"],
  ["/settings", "settings-page"],
];

export function TabsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [barActive, setBarActive] = useState(false);
  const [barHost, setBarHost] = useState<HTMLElement | null>(null);
  const alignContainer = TAB_ALIGN_CONTAINER.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"))?.[1];
  return (
    <ShellSlotContext.Provider value={{ setBarActive, barHost }}>
      <AppShell alignContainer={alignContainer} bottomBar={barActive ? <div ref={setBarHost} /> : undefined}>
        {children}
      </AppShell>
    </ShellSlotContext.Provider>
  );
}

/** Takes the bottom nav's place while `active` (Hôm nay's select mode). Returns the element to portal the bar into. */
export function useShellBottomBar(active: boolean): HTMLElement | null {
  const slot = useContext(ShellSlotContext);
  const setBarActive = slot?.setBarActive;
  useLayoutEffect(() => {
    if (!setBarActive || !active) return;
    setBarActive(true);
    return () => setBarActive(false);
  }, [setBarActive, active]);
  return active ? (slot?.barHost ?? null) : null;
}
