"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeIfSignedIn } from "@/lib/first-run";

/** On the sign-in page: someone with a live session (for example back from Google) goes straight to Hôm nay. Renders nothing. */
export function SessionRedirect() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    homeIfSignedIn().then(
      (to) => {
        if (to && !cancelled) router.replace(to);
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}
