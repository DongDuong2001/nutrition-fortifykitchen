import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FONT_VARIABLES } from "./fonts/fonts";
import { NavHistoryTracker } from "@/components/nav-history-tracker";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { ChunkStale } from "@/components/pwa/chunk-stale";
import { UnsavedWorkWatch } from "@/components/unsaved-work-watch";
import { RouteTransition } from "@/components/route-transition";
import { TouchActive } from "@/components/touch-active";
import { KeyboardGuard } from "@/components/keyboard-guard";
import { Vitals } from "@/components/vitals";
import { CHUNK_RELOAD_SCRIPT } from "@/lib/chunk-reload-script";
import { INK_COLOR, STANDALONE_HOME_SCRIPT } from "@/lib/pwa";
import { THEME_SCRIPT } from "@/lib/theme";
import { SoundArm } from "@/components/sound-arm";
import { ThemeSync } from "@/components/theme-sync";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://h1tmicro.vn"),
  title: "H1T MICRO | Theo dõi vi chất & dinh dưỡng mỗi ngày",
  description: "Theo dõi 22 vi chất, năng lượng và đa lượng chuyên sâu cho vận động và tập luyện.",
  icons: {
    icon: [
      { url: "/icons/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "H1T MICRO", statusBarStyle: "black-translucent" },
  // Next emits only the unprefixed mobile-web-app-capable; older iOS reads the prefixed name.
  other: { "apple-mobile-web-app-capable": "yes" },
};

// viewportFit "cover" lets the app draw under the notch; AppHeader and BottomNav pad with env(safe-area-inset-*).
export const viewport: Viewport = {
  themeColor: INK_COLOR,
  viewportFit: "cover",
  // cc-64 (N3): the on-screen keyboard shrinks the layout viewport, so a sheet's button is not left under it
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={FONT_VARIABLES}>
      <head>
        {/* Before the app: a page left over from an older deploy asks for chunks that are gone; it reloads once (lib/chunk-reload-script) */}
        <script dangerouslySetInnerHTML={{ __html: CHUNK_RELOAD_SCRIPT }} />
        {/* Before the first paint: an app installed with the old start_url "/" opens Hôm nay, not the link page */}
        <script dangerouslySetInnerHTML={{ __html: STANDALONE_HOME_SCRIPT }} />
        {/* Dark mode (behind its flag, lib/theme.ts): data-theme before the first paint, so a dark choice never flashes light */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-page text-text antialiased min-h-dvh flex flex-col font-sans">
        <NavHistoryTracker />
        <PwaRegister />
        <ChunkStale />
        <UnsavedWorkWatch />
        <TouchActive />
        <KeyboardGuard />
        <Vitals />
        <ThemeSync />
        <SoundArm />
        <RouteTransition>{children}</RouteTransition>
      </body>
    </html>
  );
}
