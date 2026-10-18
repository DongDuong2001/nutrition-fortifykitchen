"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gateRedirect, isSetupRoute, isTabRoute } from "@/lib/first-run";
import { isLiveMode } from "@/lib/api-mode";
import { NAV_TABS } from "@/lib/nav";

/**
 * While the check runs, a tab route shows the page frame as a skeleton: the paper page, the phone header shape
 * (ink, 20 px bottom corners, no title text) or the desktop sidebar, two card-shaped blocks and the nav band. It has no
 * sample numbers or targets. The shimmer stops under prefers-reduced-motion. cc-57: plain markup of the same size as
 * the real frame (AppShell, AppHeader and BottomNav are not imported here: this component is in the root layout, and
 * they would ship to every route, the sign-in page included).
 */
function GateSkeleton() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-page text-text font-sans lg:flex-row">
      <div aria-hidden="true" className="hidden w-60 shrink-0 bg-ink p-6 text-on-dark lg:block">
        <div className="px-2 font-display text-2xl font-black italic">
          H1T <span className="text-sky">MICRO</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0">
        {/* The header's shape: the ink band on a phone, the title row's placeholder from 1024 px */}
        <header aria-hidden="true" className="h-[92px] rounded-b-[20px] bg-ink lg:h-auto lg:rounded-none lg:bg-transparent lg:px-8 lg:pt-8">
          <span className="hidden h-8 w-48 rounded bg-surface-dark motion-safe:animate-pulse lg:block" />
        </header>
        <main
          role="status"
          aria-busy="true"
          className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pt-4 pb-6 lg:mx-0 lg:max-w-[1240px] lg:px-8"
        >
          <span className="sr-only">Đang tải…</span>
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-3 rounded-[18px] border border-card-border bg-card p-4 motion-safe:animate-pulse">
              <div className="h-3 w-2/5 rounded bg-level-empty" />
              <div className="h-3 w-[70%] rounded bg-level-empty" />
              <div className="h-3 w-[55%] rounded bg-level-empty" />
            </div>
          ))}
        </main>
      </div>
      {/* The nav band with its four names as text: the first thing painted on a cold start (FCP) */}
      <div aria-hidden="true" className="fixed bottom-0 left-0 right-0 z-40 h-[calc(72px+env(safe-area-inset-bottom))] bg-ink lg:hidden">
        <div className="mx-auto grid h-[72px] w-full max-w-[560px] grid-cols-4 items-center px-4 text-center text-[11px] font-semibold text-muted-on-dark">
          {NAV_TABS.map((t) => (
            <span key={t.tab}>{t.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Outside demo mode, a user with no profile goes to /setup/profile from every tab route, and a user with a
 * profile but nobody signed in goes to /signin (the diary belongs to an account, so there is nothing to show).
 * The check (lib/first-run gateRedirect) runs after mount, so it needs the browser's storage, and in live mode it may
 * ask Supabase for a session the OAuth callback just set; until it has run, a tab route shows the skeleton, so no
 * sample targets flash before the redirect. The diary provider (the `wrap` prop, from components/diary-provider-
 * wrapper) is not mounted while the gate waits on a first load of a tab route, so it mounts only once the account is
 * known and reads that account's storage; once mounted it stays. Auth routes, /setup/**, /offline and /install pass
 * straight through.
 */
export function SetupGate({ children, wrap }: { children: React.ReactNode; wrap?: (content: React.ReactNode) => React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  // True once a check has let the user through
  const [cleared, setCleared] = useState(false);
  // /setup/** is checked only in live mode, where it must not open without a session
  const guarded = isTabRoute(pathname) || (isSetupRoute(pathname) && isLiveMode());
  const providerMounted = useRef(false);
  const waiting = guarded && !cleared;
  const withProvider = !waiting || providerMounted.current;
  useEffect(() => {
    if (withProvider) providerMounted.current = true;
  }, [withProvider]);

  useEffect(() => {
    if (!guarded) return;
    // The check can wait for Supabase: an effect that was cleaned up (another route, or a Strict Mode re-run) must
    // neither redirect nor clear, or two runs would redirect twice
    let cancelled = false;
    gateRedirect(pathname).then(
      (to) => {
        if (cancelled) return;
        if (to) router.replace(to);
        else setCleared(true);
      },
      () => {
        if (!cancelled) router.replace("/signin");
      }
    );
    return () => {
      cancelled = true;
    };
  }, [guarded, pathname, router]);

  // The provider (wrap) is mounted once the gate has let the user through, or already was on an earlier route: it is never
  // unmounted by a later route change, or a toast and its undo (a delete on /entry, then back to Hôm nay) would be lost
  if (!withProvider) return <GateSkeleton />;
  const content = waiting ? <GateSkeleton /> : children;
  return <>{wrap ? wrap(content) : content}</>;
}
