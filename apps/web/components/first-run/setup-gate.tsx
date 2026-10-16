"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { AppHeader } from "@/components/ui/app-header";
import { gateRedirect, isTabRoute } from "@/lib/first-run";

/**
 * While the check runs, a tab route shows the page frame as a skeleton: the paper page, the phone header shape
 * (ink, 20 px bottom corners, no title text) or the desktop title row, and two card-shaped blocks. It has no
 * sample numbers or targets. The shimmer stops under prefers-reduced-motion.
 */
function GateSkeleton() {
  return (
    <AppShell>
      <AppHeader
        variant="tab"
        layout="wide"
        subtitle={<span aria-hidden="true" className="hidden h-8 w-48 rounded bg-surface-dark motion-safe:animate-pulse lg:block" />}
      />
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
    </AppShell>
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
  const guarded = isTabRoute(pathname);
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
