import React from "react";
import type { NavTab } from "@/lib/nav";

/**
 * One icon per tab, shared by the phone tab bar and the desktop sidebar. 24 viewBox, 1.8 stroke (design/v3,
 * V3HomNayB tab bar). The selected tab's icon is filled (V3-SPEC §4): the shapes take the fill and the marks drawn
 * on top of a filled shape (the compass needle, the slider knobs' cut) use the page colour.
 */
const ICONS: Record<NavTab, { outline: React.ReactNode; filled: React.ReactNode }> = {
  today: {
    outline: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
    filled: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" fill="currentColor" />,
  },
  overview: {
    outline: <path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z" />,
    filled: <path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z" fill="currentColor" />,
  },
  explore: {
    outline: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m15.5 8.5-2 5-5 2 2-5z" />
      </>
    ),
    filled: (
      <>
        <circle cx="12" cy="12" r="8.5" fill="currentColor" />
        <path d="m15.5 8.5-2 5-5 2 2-5z" fill="var(--color-card)" stroke="var(--color-card)" />
      </>
    ),
  },
  settings: {
    outline: (
      <>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </>
    ),
    filled: (
      <>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" strokeWidth="2.2" />
        <circle cx="16" cy="7" r="2.6" fill="currentColor" />
        <circle cx="10" cy="17" r="2.6" fill="currentColor" />
      </>
    ),
  },
};

export function NavIcon({ tab, size = 24, filled = false }: { tab: NavTab; size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {filled ? ICONS[tab].filled : ICONS[tab].outline}
    </svg>
  );
}

export function PlusIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
