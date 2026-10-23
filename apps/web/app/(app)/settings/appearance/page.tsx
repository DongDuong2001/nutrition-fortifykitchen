import { notFound } from "next/navigation";
import { AppearanceScreen } from "@/components/settings/appearance-screen";

/** Giao diện, behind the dark mode flag (lib/theme.ts): a build that can never turn it on (no DARK_MODE=1, not a demo build) shows
    the 404 page here (SetupGate draws first, so the status stays 200). */
export default function AppearanceSettingsPage() {
  if (process.env.NEXT_PUBLIC_DARK_MODE !== "1" && process.env.NEXT_PUBLIC_DEMO_BUILD !== "1") notFound();
  return <AppearanceScreen />;
}
