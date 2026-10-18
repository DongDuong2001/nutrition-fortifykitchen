"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { notFound, useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { WrongCode } from "@/components/coaching/wrong-code";
import { isLiveMode } from "@/lib/api-mode";
import { currentAccountId } from "@/lib/auth-actions";
import { coachingAvailable, safeDecode } from "@/lib/coaching-link";
import { findCoachByCode } from "@/lib/mock-coach-server";
import { writePendingCoachCode } from "@/lib/pending-coach";
import { HOME_ROUTE } from "@/lib/nav";

// Loaded only for a signed-in visitor: it holds the diary provider and the coach link
const JoinConfirm = dynamic(() => import("@/components/coaching/join-confirm").then((m) => m.JoinConfirm), { ssr: false });

/**
 * /join/<code>: the link a coach shares. Signed in: confirm, then the user is linked and lands on Hôm nay.
 * Signed out: the code waits in the session through sign-up and setup (lib/pending-coach).
 */
export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const raw = safeDecode(String(params?.code ?? ""));
  const target = findCoachByCode(raw);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  // Read after mount: the account lives in the browser's storage
  useEffect(() => {
    setSignedIn(currentAccountId() !== null);
  }, []);

  // Signed out: the code waits for sign-up and setup, and the visitor goes to /signup. Nothing of the diary is needed.
  useEffect(() => {
    if (signedIn === false && target) {
      writePendingCoachCode(raw);
      router.replace("/signup");
    }
  }, [signedIn, target, raw, router]);

  // Live mode has no coaching yet: the app's 404
  if (!coachingAvailable(isLiveMode())) notFound();

  // Only a signed-in visitor needs the diary (the coach link lives in the profile): this page is outside the diary
  // provider (cc-58), so the part that reads it brings its own
  if (signedIn === true) return <JoinConfirm raw={raw} />;
  return (
    <AppShell>
      <AppHeader variant="sub" title="Tham gia HLV" backHref={HOME_ROUTE} layout="wide" />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:px-8">
        {signedIn === null || target ? (
          <div aria-busy="true" className="h-[120px] rounded-[18px] bg-divider motion-safe:animate-pulse" />
        ) : (
          <WrongCode />
        )}
      </main>
    </AppShell>
  );
}
