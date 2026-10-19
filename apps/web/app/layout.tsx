import type { Metadata, Viewport } from "next";
import { Manrope, Saira_Condensed } from "next/font/google";
import "./globals.css";
import { NavHistoryTracker } from "@/components/nav-history-tracker";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { RouteTransition } from "@/components/route-transition";
import { TouchActive } from "@/components/touch-active";
import { INK_COLOR, STANDALONE_HOME_SCRIPT } from "@/lib/pwa";

const manrope = Manrope({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-manrope-face",
  display: "swap",
});

const sairaCondensed = Saira_Condensed({
  subsets: ["vietnamese", "latin"],
  weight: ["800", "900"],
  variable: "--font-saira-condensed-face",
  display: "swap",
});

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
    <html lang="vi" className={`${manrope.variable} ${sairaCondensed.variable}`}>
      <head>
        {/* Before the first paint: an app installed with the old start_url "/" opens Hôm nay, not the link page */}
        <script dangerouslySetInnerHTML={{ __html: STANDALONE_HOME_SCRIPT }} />
      </head>
      <body className="bg-page text-text antialiased min-h-dvh flex flex-col font-sans">
        <NavHistoryTracker />
        <PwaRegister />
        <TouchActive />
        <RouteTransition>{children}</RouteTransition>
      </body>
    </html>
  );
}
