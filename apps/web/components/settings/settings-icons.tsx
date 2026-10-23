import React from "react";

/**
 * The glyphs of the Cài đặt rows (V3-SPEC §3.4): the SVG content of a 24 grid, drawn by SettingsTile in white inside
 * its coloured tile (18 px, stroke 1,8). Decorative: the row label names the action.
 */
export const SETTINGS_ICONS = {
  chat: (
    <>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
      <path d="M8.5 11h7M8.5 14h4.5" />
    </>
  ),
  bug: (
    <>
      <path d="M8 7V5a4 4 0 0 1 8 0v2M6 9h12v5a6 6 0 0 1-12 0zM12 13v4M3 12h3M18 12h3M4 19l3-2M20 19l-3-2" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  plus: <path d="M12 5v14M5 12h14" />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  copy: <path d="M9 9h10v12H9zM5 15V3h10" />,
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.6-5.9" />
      <path d="M4 4v4.5h4.5" />
      <path d="M10.5 9.5v5l4-2.5z" />
    </>
  ),
  news: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  ),
  vibrate: (
    <>
      <rect x="8" y="3" width="8" height="18" rx="2" />
      <path d="M4 9v6M20 9v6" />
    </>
  ),
  tips: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c.8-3.6 3.7-5.5 7.5-5.5s6.7 1.9 7.5 5.5" />
    </>
  ),
  language: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9s1.3-6.3 3.9-9z" />
    </>
  ),
  // Giao diện (dark mode, behind its flag): a circle, its right half filled
  theme: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 21h4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </>
  ),
  install: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M12 8v6m-2.5-2.5L12 14l2.5-2.5M11 18h2" />
    </>
  ),
  trash: <path d="M4 7h16M10 3h4M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  document: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  signOut: <path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M14 8l4 4-4 4M18 12H9" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  scale: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8.5 10a4 3 0 0 1 7 0M12 10l1.5-2" />
    </>
  ),
} as const;
