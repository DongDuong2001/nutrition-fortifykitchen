"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface BottomNavProps {
  currentTab?: "today" | "micros" | "add" | "training" | "profile";
  onAddClick?: () => void;
  className?: string;
}

export function BottomNav({ currentTab, onAddClick, className = "" }: BottomNavProps) {
  const pathname = usePathname();

  const isToday = currentTab ? currentTab === "today" : pathname === "/today" || pathname === "/diary" || pathname === "/";
  const isMicros = currentTab ? currentTab === "micros" : pathname?.startsWith("/micros");
  const isTraining = currentTab ? currentTab === "training" : pathname?.startsWith("/training");
  const isProfile = currentTab ? currentTab === "profile" : pathname?.startsWith("/profile");

  return (
    <nav
      aria-label="Điều hướng chính"
      className={`h-[72px] flex-none bg-ink items-center w-full max-w-[390px] mx-auto ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
      }}
    >
      <Link
        href="/today"
        aria-current={isToday ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-[3px] min-h-[56px] text-xs font-semibold no-underline transition-colors ${
          isToday ? "text-white" : "text-muted-on-dark hover:text-white"
        }`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
        <span>Hôm nay</span>
      </Link>

      <Link
        href="/micros"
        aria-current={isMicros ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-[3px] min-h-[56px] text-xs font-semibold no-underline transition-colors ${
          isMicros ? "text-white" : "text-muted-on-dark hover:text-white"
        }`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 20V11M12 20V4M19 20v-6" />
        </svg>
        <span>Vi chất</span>
      </Link>

      <div className="flex justify-center">
        {onAddClick ? (
          <button
            type="button"
            onClick={onAddClick}
            aria-label="Thêm món"
            className="w-[52px] h-[52px] rounded-[14px] bg-blue text-white flex items-center justify-center border-0 cursor-pointer shadow-md active:scale-[0.97] transition-transform"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        ) : (
          <Link
            href="/add"
            aria-label="Thêm món"
            className="w-[52px] h-[52px] rounded-[14px] bg-blue text-white flex items-center justify-center no-underline shadow-md active:scale-[0.97] transition-transform"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        )}
      </div>

      <Link
        href="/training"
        aria-current={isTraining ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-[3px] min-h-[56px] text-xs font-semibold no-underline transition-colors ${
          isTraining ? "text-white" : "text-muted-on-dark hover:text-white"
        }`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" />
        </svg>
        <span>Ngày tập</span>
      </Link>

      <Link
        href="/profile"
        aria-current={isProfile ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-[3px] min-h-[56px] text-xs font-semibold no-underline transition-colors ${
          isProfile ? "text-white" : "text-muted-on-dark hover:text-white"
        }`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
        <span>Hồ sơ</span>
      </Link>
    </nav>
  );
}
