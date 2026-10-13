"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isDemo } from "@/lib/demo";
import { isTabRoute, readFirstRunFacts, setupRedirectFor } from "@/lib/first-run";

/**
 * A user with no profile (outside demo mode) goes to /setup/profile from every tab route. The check runs after
 * mount, so it needs the browser's storage; until it has run, a tab route renders nothing, so no sample targets
 * flash before the redirect. Auth routes, /setup/**, /offline and /install pass straight through.
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
    const to = setupRedirectFor(pathname, readFirstRunFacts(demo), demo);
    if (to) router.replace(to);
    else setCleared(true);
  }, [guarded, pathname, router]);

  if (guarded && !cleared) return null;
  return <>{children}</>;
}
