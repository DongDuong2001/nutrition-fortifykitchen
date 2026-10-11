"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface BottomNavProps {
  currentTab?: "today" | "micros" | "add" | "training" | "profile";
  onAddClick?: () => void;
  className?: string;
}

/**
 * H1T MICRO Bottom Navigation (Cobalt Sign).
 * Full-bleed on <1024px with inner content centered at max-w-[560px] with 16px side padding.
 * Active state includes a slanted motif indicator (skewX(-14deg)), text remains unslanted.
 */
/** Remembers which control opened /add, so focus can return to it. Storage may be blocked. */
function rememberAddOpener(id: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("last_add_opener_id", id);
  } catch {
    // Storage unavailable: focus falls back to the default opener.
  }
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
      className={`h-[72px] flex-none bg-ink w-full select-none ${className}`}
    >
      <div
        className="w-full max-w-[560px] mx-auto px-4 h-full items-center"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
        }}
      >
        <Link
          href="/today"
          aria-current={isToday ? "page" : undefined}
          className={`relative flex flex-col items-center justify-center gap-[2px] min-h-[56px] text-xs font-semibold no-underline transition-colors ${
            isToday ? "text-white" : "text-muted-on-dark hover:text-white"
          }`}
        >
          <svg
            width="22"
            height="22"
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
          <span className="text-[11px] leading-tight">Hôm nay</span>
          {isToday && (
            <span
              className="absolute bottom-1 w-5 h-[3px] rounded-[1px] bg-blue"
              style={{ transform: "skewX(-14deg)" }}
              aria-hidden="true"
            />
          )}
        </Link>

        <Link
          href="/micros"
          aria-current={isMicros ? "page" : undefined}
          className={`relative flex flex-col items-center justify-center gap-[2px] min-h-[56px] text-xs font-semibold no-underline transition-colors ${
            isMicros ? "text-white" : "text-muted-on-dark hover:text-white"
          }`}
        >
          <svg
            width="22"
            height="22"
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
          <span className="text-[11px] leading-tight">Vi chất</span>
          {isMicros && (
            <span
              className="absolute bottom-1 w-5 h-[3px] rounded-[1px] bg-blue"
              style={{ transform: "skewX(-14deg)" }}
              aria-hidden="true"
            />
          )}
        </Link>

        <div className="flex justify-center items-center">
          {onAddClick ? (
            <button
              id="mobile-add-fab"
              type="button"
              onClick={() => {
                rememberAddOpener("mobile-add-fab");
                onAddClick();
              }}
              aria-label="Thêm món"
              className="w-[50px] h-[50px] rounded-[14px] bg-blue text-white flex items-center justify-center border-0 cursor-pointer shadow-md active:scale-[0.97] transition-transform"
            >
              <svg
                width="24"
                height="24"
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
              id="mobile-add-fab"
              href="/add"
              onClick={() => {
                rememberAddOpener("mobile-add-fab");
              }}
              aria-label="Thêm món"
              className="w-[50px] h-[50px] rounded-[14px] bg-blue text-white flex items-center justify-center no-underline shadow-md active:scale-[0.97] transition-transform"
            >
              <svg
                width="24"
                height="24"
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
          className={`relative flex flex-col items-center justify-center gap-[2px] min-h-[56px] text-xs font-semibold no-underline transition-colors ${
            isTraining ? "text-white" : "text-muted-on-dark hover:text-white"
          }`}
        >
          <svg
            width="22"
            height="22"
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
          <span className="text-[11px] leading-tight">Ngày tập</span>
          {isTraining && (
            <span
              className="absolute bottom-1 w-5 h-[3px] rounded-[1px] bg-blue"
              style={{ transform: "skewX(-14deg)" }}
              aria-hidden="true"
            />
          )}
        </Link>

        <Link
          href="/profile"
          aria-current={isProfile ? "page" : undefined}
          className={`relative flex flex-col items-center justify-center gap-[2px] min-h-[56px] text-xs font-semibold no-underline transition-colors ${
            isProfile ? "text-white" : "text-muted-on-dark hover:text-white"
          }`}
        >
          <svg
            width="22"
            height="22"
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
          <span className="text-[11px] leading-tight">Hồ sơ</span>
          {isProfile && (
            <span
              className="absolute bottom-1 w-5 h-[3px] rounded-[1px] bg-blue"
              style={{ transform: "skewX(-14deg)" }}
              aria-hidden="true"
            />
          )}
        </Link>
      </div>
    </nav>
  );
}
