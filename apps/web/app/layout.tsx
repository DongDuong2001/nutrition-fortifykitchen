import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
    <html lang="vi">
      <body className="bg-[#F3F4F6] text-[#111827] antialiased min-h-screen flex flex-col">
        {/* Desktop Header */}
        <header className="hidden md:block bg-[#0A0A0A] text-white border-b border-neutral-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/diary" className="flex items-center gap-2">
                <span className="text-xl font-black italic tracking-tighter uppercase font-mono">
                  H1T <span className="text-[#2563EB]">MICRO</span>
                </span>
              </Link>
              <nav className="flex items-center gap-1">
                <Link
                  href="/diary"
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                >
                  Hôm nay
                </Link>
                <Link
                  href="/micros"
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                >
                  Vi chất
                </Link>
                <Link
                  href="/foods"
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                >
                  Món ăn
                </Link>
                <Link
                  href="/training"
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                >
                  Ngày tập
                </Link>
                <Link
                  href="/profile"
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                >
                  Hồ sơ
                </Link>
                <Link
                  href="/admin/review"
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-amber-400 hover:text-amber-300 hover:bg-neutral-900 transition-colors"
                >
                  Coach Vault
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-sm"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-0 md:px-6 py-0 md:py-8 min-w-0">
          {children}
        </main>
      </body>
    </html>
  );
}
