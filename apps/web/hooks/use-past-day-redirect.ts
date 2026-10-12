"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { viewedIsoDate } from "@/lib/day-history";
import { useDiary } from "@/lib/diary-store";

/**
 * Past days are read-only. When the URL names a past day (?date=), this sends the user to that day's
 * Today view and returns true, so the page can draw nothing while it leaves. Today and bad dates return false.
 */
export function usePastDayRedirect(): boolean {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrated, todayIso } = useDiary();
  // Read after mount: todayIso is null on the server and on the first render
  const day = hydrated && todayIso ? viewedIsoDate(searchParams?.get("date"), todayIso) : null;
  const isPast = day !== null && day !== todayIso;

  useEffect(() => {
    if (isPast && day) router.replace(`/diary?date=${day}`);
  }, [isPast, day, router]);

  return isPast;
}
