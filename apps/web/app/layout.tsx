import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fortify Nutrition | Meal & Nutrient Tracking Platform",
  description: "Track 26 macro- and micronutrients with daily target monitoring and menu synchronization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F17] text-[#F8FAFC] antialiased min-h-screen flex flex-col selection:bg-[#10B981] selection:text-black">
        {/* Fortify Kitchen Neo-Brutalist Navigation Bar */}
        <header className="sticky top-0 z-50 border-b-2 sm:border-b-[3px] border-black bg-[#0B0F17]/95 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[6px] bg-[#10B981] border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center font-black text-black text-lg group-hover:-translate-x-[1px] group-hover:-translate-y-[1px] group-hover:shadow-[4px_4px_0px_0px_#000] transition-all">
                  F
                </div>
                <div className="flex flex-col">
                  <span className="font-black tracking-tight text-sm sm:text-base text-[#F8FAFC] uppercase">FORTIFY</span>
                  <span className="text-[9px] sm:text-[10px] tracking-widest text-[#10B981] uppercase font-black -mt-1 font-mono">Kitchen</span>
                </div>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-2">
                <Link
                  href="/diary"
                  className="px-3 py-1.5 rounded-[4px] border-2 border-transparent hover:border-black hover:bg-[#141C2B] hover:shadow-[2px_2px_0px_0px_#000] text-xs font-black uppercase tracking-wider text-[#94A3B8] hover:text-[#F8FAFC] transition-all"
                >
                  Diary
                </Link>
                <Link
                  href="/foods"
                  className="px-3 py-1.5 rounded-[4px] border-2 border-transparent hover:border-black hover:bg-[#141C2B] hover:shadow-[2px_2px_0px_0px_#000] text-xs font-black uppercase tracking-wider text-[#94A3B8] hover:text-[#F8FAFC] transition-all"
                >
                  Food Catalog
                </Link>
                <Link
                  href="/admin/review"
                  className="px-3 py-1.5 rounded-[4px] border-2 border-transparent hover:border-black hover:bg-[#141C2B] hover:shadow-[2px_2px_0px_0px_#000] text-xs font-black uppercase tracking-wider text-[#F59E0B] hover:text-amber-300 transition-all"
                >
                  Coach Vault
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="neo-btn neo-btn-emerald px-3.5 sm:px-4 py-1.5 text-xs text-black border-2 border-black min-h-[38px]"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Mobile Navigation Sub-Bar (Ensures fitting every mobile resolution) */}
          <div className="md:hidden border-t-2 border-black px-3 py-2 flex items-center justify-around bg-[#141C2B]">
            <Link
              href="/diary"
              className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#94A3B8] hover:text-[#10B981] transition-colors"
            >
              Diary
            </Link>
            <span className="text-black font-black">|</span>
            <Link
              href="/foods"
              className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#94A3B8] hover:text-[#10B981] transition-colors"
            >
              Foods
            </Link>
            <span className="text-black font-black">|</span>
            <Link
              href="/admin/review"
              className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#F59E0B] hover:text-amber-300 transition-colors"
            >
              Coach Vault
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 min-w-0">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t-2 sm:border-t-[3px] border-black bg-[#0B0F17] py-6 text-center text-xs text-[#94A3B8] font-mono uppercase tracking-wider">
          <p>© 2026 Fortify Nutrition System • 26 Macro- and Micronutrient Monitoring</p>
        </footer>
      </body>
    </html>
  );
}
