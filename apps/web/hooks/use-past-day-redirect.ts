"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { viewedIsoDate } from "@/lib/day-history";
import { useDiary } from "@/lib/diary-store";

/**
 * Days older than yesterday are read-only (cc-68: today and yesterday can be edited). When the URL names such a day
 * (?date=), this sends the user to that day's Today view and returns true, so the page can draw nothing while it
 * leaves. Today, yesterday and bad dates return false.
 */
export function usePastDayRedirect(): boolean {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrated, todayIso, isEditable } = useDiary();
  // Read after mount: todayIso is null on the server and on the first render
  const day = hydrated && todayIso ? viewedIsoDate(searchParams?.get("date"), todayIso) : null;
  const isPast = day !== null && day !== todayIso && !isEditable(day);

  useEffect(() => {
    if (isPast && day) router.replace(`/?date=${day}`);
  }, [isPast, day, router]);

  return isPast;
}
