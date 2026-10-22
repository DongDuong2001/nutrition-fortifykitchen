import { notFound } from "next/navigation";
import { AppearanceScreen } from "@/components/settings/appearance-screen";

/** Giao diện, behind the dark mode flag (lib/theme.ts): a build that can never turn it on (no NEXT_PUBLIC_DARK_MODE, not a demo
    build) answers a real 404 here, before any of the page is drawn. */
export default function AppearanceSettingsPage() {
  if (process.env.NEXT_PUBLIC_DARK_MODE !== "1" && process.env.NEXT_PUBLIC_DEMO_BUILD !== "1") notFound();
  return <AppearanceScreen />;
}
