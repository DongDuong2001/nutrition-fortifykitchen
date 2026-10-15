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
export function RoleGate({ allow, children }: { allow: readonly Role[]; children: ReactNode }) {
  const { hydrated, role } = useCoaching();
  if (!hydrated) return <div aria-hidden="true" className="min-h-dvh w-full bg-page" />;
  if (!allow.includes(role)) notFound();
  return <>{children}</>;
}
