"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, BarChartIcon, PlusIcon, DumbbellIcon, UserIcon } from "@/lib/runeicons";

export function BottomDock({ onAddClick }: { onAddClick?: () => void }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/diary", label: "Hôm nay", icon: HomeIcon },
    { href: "/micros", label: "Vi chất", icon: BarChartIcon },
    { href: "#add", label: "Thêm", icon: PlusIcon, isSpecial: true },
    { href: "/training", label: "Ngày tập", icon: DumbbellIcon },
    { href: "/profile", label: "Hồ sơ", icon: UserIcon },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-neutral-800 md:hidden pb-safe">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isSpecial) {
            return (
              <button
                key={item.label}
                onClick={onAddClick}
                className="w-12 h-12 -mt-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                aria-label="Thêm món"
              >
                <PlusIcon className="w-6 h-6 stroke-[3]" />
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-colors ${
                isActive ? "text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
