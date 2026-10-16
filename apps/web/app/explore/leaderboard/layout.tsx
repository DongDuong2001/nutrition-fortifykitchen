import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { coachingAvailable } from "@/lib/coaching-link";
import { isLiveMode } from "@/lib/api-mode";

// Sample data only: live mode has no coaches or ranking yet, so the page is a 404 there (no mock data in live mode)
export default function Layout({ children }: { children: ReactNode }) {
  if (!coachingAvailable(isLiveMode())) notFound();
  return <>{children}</>;
}
