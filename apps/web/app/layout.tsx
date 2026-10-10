import type { Metadata } from "next";
import { Be_Vietnam_Pro, Saira } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

const saira = Saira({
  subsets: ["vietnamese", "latin"],
  style: ["italic"],
  axes: ["wdth"],
  variable: "--font-saira",
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
    <html lang="vi" className={`${beVietnamPro.variable} ${saira.variable}`}>
      <body className="bg-page text-text antialiased min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
