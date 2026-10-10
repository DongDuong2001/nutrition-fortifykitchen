import type { Metadata } from "next";
import { Manrope, Saira_Condensed } from "next/font/google";
import "./globals.css";
import { DiaryProviderWrapper } from "@/components/diary-provider-wrapper";

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
  title: "H1T MICRO | Dinh dưỡng & Vi chất Chuyên sâu",
  description: "Theo dõi 26 vi chất và macro dinh dưỡng chuyên sâu cho vận động và tập luyện.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${manrope.variable} ${sairaCondensed.variable}`}>
      <body className="bg-page text-text antialiased min-h-screen flex flex-col font-sans">
        <DiaryProviderWrapper>{children}</DiaryProviderWrapper>
      </body>
    </html>
  );
}
