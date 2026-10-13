"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { AppHeader } from "@/components/ui/app-header";
import { currentAccountId } from "@/lib/auth-actions";
import { isDemo } from "@/lib/demo";
import { isTabRoute, readFirstRunFacts, setupRedirectFor } from "@/lib/first-run";

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
 * The check runs after mount, so it needs the browser's storage; until it has run, a tab route shows the
 * skeleton, so no sample targets flash before the redirect. Auth routes, /setup/**, /offline and /install pass
 * straight through.
 */
export function SetupGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  // True once a check has let the user through
  const [cleared, setCleared] = useState(false);
  const guarded = isTabRoute(pathname);

  useEffect(() => {
    if (!guarded) return;
    const demo = isDemo();
    const to =
      setupRedirectFor(pathname, readFirstRunFacts(demo), demo) ?? (!demo && currentAccountId() === null ? "/signin" : null);
    if (to) router.replace(to);
    else setCleared(true);
  }, [guarded, pathname, router]);

  if (guarded && !cleared) return <GateSkeleton />;
  return <>{children}</>;
}
