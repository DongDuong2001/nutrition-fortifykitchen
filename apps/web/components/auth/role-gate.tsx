"use client";

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { useCoaching } from "@/hooks/use-coaching";
import type { Role } from "@/lib/coaching-link";

/**
 * A page only some roles may open. Everyone else gets the app's standard 404, with none of the page in the DOM.
 * Until the profile is read the gate renders an empty page (the role is not known yet), never the page itself.
 * This hides the screen; the API enforces the role on the server (RequireRole / RequireAdmin).
 */
export function RoleGate({ allow, coachingOnly = false, children }: { allow: readonly Role[]; coachingOnly?: boolean; children: ReactNode }) {
  const { hydrated, role, available } = useCoaching();
  if (!hydrated) return <div aria-hidden="true" className="min-h-dvh w-full bg-page" />;
  // coachingOnly: the page belongs to the coaching feature, which does not exist in live mode yet
  if (coachingOnly && !available) notFound();
  if (!allow.includes(role)) notFound();
  return <>{children}</>;
}
